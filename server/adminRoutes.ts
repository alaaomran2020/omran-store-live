/**
 * server/adminRoutes.ts — مسارات لوحة إدارة المدراء:
 *
 *   POST   /api/admin/auth/request-code   طلب كود OTP عبر واتساب
 *   POST   /api/admin/auth/verify         التحقق من الكود/الرابط السحري
 *   POST   /api/admin/auth/logout         تسجيل الخروج
 *   GET    /api/admin/auth/me             جلسة المدير الحالية
 *   GET    /api/admin/products            كتالوج مدموج (شيت + تجاوزات، يشمل المخفي)
 *   GET    /api/admin/products/:id        منتج واحد
 *   PATCH  /api/admin/products/:id        تعديل حقول حسب RBAC
 *   GET    /api/admin/activity            سجل نشاطي الأخير
 *   GET    /api/admin/products/overrides-manifest   manifest عام لحافة Cloudflare
 *
 * الـ Webhook الخاص بـ Meta يُسجَّل عبر registerWhatsappWebhook() قبل
 * مُحلِّل JSON العام حتى يبقى الجسم الخام متاحًا للتحقق من التوقيع.
 */

import express, { Router, type Express, type NextFunction, type Request, type Response } from "express";
import { searchProducts } from "@shared/products";
import type { AdminRecord } from "./adminStore";
import { StoreUnavailableError, getStore } from "./adminStore";
import { fetchMergedCatalog, fetchMergedProduct } from "./adminCatalog";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  audit,
  clientIpHash,
  createSession,
  normalizePhone,
  randomOtp,
  randomToken,
  randomUuid,
  rateLimit,
  resolveSession,
  revokeSession,
  sameOriginOrXhr,
  secretHash,
  splitPatchFields,
  timingSafeEqual,
} from "./adminAuth";
import {
  isDevMode,
  sendOtpMessage,
  verifyWebhookSignature,
  verifyWebhookSubscription,
} from "./adminWhatsapp";
import { getSessionCookieOptions } from "./_core/cookies";

type AdminRequest = Request & {
  adminSession?: { session: { id: string; expiresAt: Date }; admin: AdminRecord };
};

const publicAdmin = (admin: AdminRecord) => ({
  id: admin.id,
  phone: admin.phone,
  fullName: admin.fullName,
  role: admin.role,
  permissions: admin.permissions,
});

/** غلاف أخطاء موحّد: قاعدة البيانات غير متاحة → 503، أي خطأ آخر → 500. */
const handle =
  (fn: (req: AdminRequest, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try {
      await fn(req as AdminRequest, res);
    } catch (err) {
      if (err instanceof StoreUnavailableError) {
        res.status(503).json({
          error: "database_unavailable",
          hint: "DATABASE_URL غير مضبوط أو قاعدة البيانات غير متاحة",
        });
        return;
      }
      console.error("[admin] route error:", err);
      res.status(500).json({ error: "internal_error" });
    }
  };

/** حارس المصادقة: جلسة صالحة + مدير نشط (الصفحات تُقرأ من DB مع كل طلب). */
const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const resolved = await resolveSession(getStore(), req);
    if (!resolved) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    (req as AdminRequest).adminSession = resolved;
    next();
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      res.status(503).json({ error: "database_unavailable" });
      return;
    }
    console.error("[admin] auth error:", err);
    res.status(500).json({ error: "internal_error" });
  }
};

/** حارس CSRF للطلبات المُغيِّرة (انظر sameOriginOrXhr في adminAuth). */
const csrfGuard = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET" || req.method === "HEAD") {
    next();
    return;
  }
  if (sameOriginOrXhr(req)) {
    next();
    return;
  }
  res.status(403).json({ error: "cross_origin_forbidden" });
};

// ============================ الـ Webhook (Meta) ============================

/**
 * يُسجَّل قبل express.json العام: نستقبل الجسم الخام (Buffer) للتحقق من
 * توقيع X-Hub-Signature-256 ثم نُحلِّله JSON يدويًا.
 */
export function registerWhatsappWebhook(app: Express) {
  const webhook = Router();
  webhook.use(express.raw({ type: "*/*", limit: "256kb" }));

  webhook.get("/", (req: Request, res: Response) => {
    const challenge = verifyWebhookSubscription(
      new URL(req.originalUrl, "http://local").searchParams
    );
    if (challenge) {
      res.status(200).type("text/plain").send(challenge);
      return;
    }
    res.status(403).send("Forbidden");
  });

  webhook.post(
    "/",
    handle(async (req, res) => {
      const rawBody = (req.body as Buffer | undefined)?.toString("utf8") ?? "";
      const rawSignature = req.headers["x-hub-signature-256"];
      const signature =
        typeof rawSignature === "string"
          ? rawSignature
          : Array.isArray(rawSignature)
            ? rawSignature[0]
            : undefined;
      const valid = await verifyWebhookSignature(rawBody, signature);
      if (!valid) {
        res.status(403).json({ success: false, error: "توقيع Webhook غير صالح" });
        return;
      }

      let payload: {
        entry?: {
          changes?: {
            value?: {
              statuses?: { id?: string; status?: string }[];
              messages?: { from?: string; text?: { body?: string } }[];
            };
          }[];
        }[];
      } = {};
      try {
        payload = JSON.parse(rawBody);
      } catch {
        res.status(400).json({ success: false, error: "invalid_json" });
        return;
      }

      const store = getStore();
      // يجب الرد 200 بسرعة دائمًا وإلا يعيد Meta الإرسال — المعالجة best-effort
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value ?? {};
          // 1) حالات التسليم — نحدّث delivery_status عبر message_id
          for (const status of value.statuses ?? []) {
            if (!status.id) continue;
            await store
              .updateChallengeDeliveryByMessageId(
                status.id,
                status.status === "failed" ? "failed" : status.status || "unknown"
              )
              .catch(() => {});
          }
          // 2) رسالة "توقف" واردة من المدير — إبطال كل التحديات النشطة للرقم
          for (const msg of value.messages ?? []) {
            if ((msg.text?.body ?? "").trim() === "توقف" && msg.from) {
              await store.revokeChallengesForPhone(msg.from).catch(() => {});
            }
          }
        }
      }

      res.json({ success: true });
    })
  );

  app.use("/api/webhooks/whatsapp", webhook);
}

// ============================ مسارات اللوحة ============================

export function registerAdminRoutes(app: Express) {
  const router = Router();
  router.use(express.json({ limit: "256kb" }));
  router.use(csrfGuard);

  // ---------- المصادقة ----------

  router.post(
    "/auth/request-code",
    handle(async (req, res) => {
      const rawPhone = typeof req.body?.phone === "string" ? req.body.phone : "";
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        res.status(400).json({ error: "رقم الهاتف غير صالح — استخدم الصيغة الدولية مثل +201000000000" });
        return;
      }

      const ipHash = await clientIpHash(req);
      const byPhone = rateLimit(`otp:phone:${phone}`, 3, 15 * 60 * 1000);
      if (!byPhone.ok) {
        res.status(429).json({ error: "طلبات كثيرة لهذا الرقم — انتظر قليلًا", retryAfterSec: byPhone.retryAfterSec });
        return;
      }
      const byIp = rateLimit(`otp:ip:${ipHash}`, 10, 60 * 60 * 1000);
      if (!byIp.ok) {
        res.status(429).json({ error: "طلبات كثيرة من هذا الجهاز — انتظر ساعة", retryAfterSec: byIp.retryAfterSec });
        return;
      }

      const store = getStore();
      const admin = await store.findAdminByPhone(phone);
      if (!admin || !admin.isActive) {
        await audit(store, {
          admin: null,
          action: "login.request.denied",
          entityType: "phone",
          entityId: phone,
          outcome: "denied",
          detail: { reason: "unknown_admin" },
          req,
        });
        res.status(404).json({ error: "هذا الرقم غير مسجّل كمدير" });
        return;
      }

      // تحدٍّ واحد نشط لكل رقم: أي طلب جديد يُبطل القديم فورًا
      await store.revokeChallengesForPhone(phone);

      const code = randomOtp();
      const linkToken = randomToken(24);
      const codeHash = await secretHash(code);
      const linkTokenHash = await secretHash(linkToken);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const challengeId = randomUuid();

      await store.createChallenge({
        id: challengeId,
        adminId: admin.id,
        phone,
        codeHash,
        linkTokenHash,
        expiresAt,
      });

      // الرابط السحري يُمرَّر للمزوّد في وضع التطوير فقط (قوالب authentication
      // لا تدعم أزرار URL — وفي الإنتاج يُكتفى بالكود داخل القالب المعتمد).
      let devMagicUrl: string | undefined;
      if (isDevMode()) {
        const origin = `${req.protocol}://${req.headers.host}`;
        devMagicUrl = `${origin}/admin/login?t=${linkToken}&p=${encodeURIComponent(phone)}`;
      }
      const result = await sendOtpMessage(phone, code, devMagicUrl ?? null);
      if (result.messageId) {
        await store.setChallengeMessageId(challengeId, result.messageId).catch(() => {});
      }

      if (!result.delivered) {
        await audit(store, {
          admin,
          action: "login.request.error",
          entityType: "challenge",
          entityId: challengeId,
          outcome: "error",
          detail: { providerError: result.providerError },
          req,
        });
        res.status(502).json({ error: "تعذّر إرسال كود واتساب", providerError: result.providerError });
        return;
      }

      await audit(store, {
        admin,
        action: "login.request",
        entityType: "challenge",
        entityId: challengeId,
        req,
      });

      res.json({
        ok: true,
        delivered: result.delivered,
        expiresInSec: 300,
        retryAfterSec: Math.max(byPhone.retryAfterSec, 15),
        ...(result.devCode ? { devCode: result.devCode, devMagicUrl } : {}),
      });
    })
  );

  router.post(
    "/auth/verify",
    handle(async (req, res) => {
      const phone = normalizePhone(
        typeof req.body?.phone === "string" ? req.body.phone : ""
      );
      if (!phone) {
        res.status(400).json({ error: "رقم الهاتف غير صالح" });
        return;
      }
      const code = typeof req.body?.code === "string" ? req.body.code : "";
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      if (!code && !token) {
        res.status(400).json({ error: "أدخل الكود المرسل إلى واتساب" });
        return;
      }

      const store = getStore();
      const challenge = await store.findActiveChallenge(phone);
      if (!challenge) {
        res.status(401).json({ error: "الكود منتهٍ أو غير موجود — اطلب كودًا جديدًا" });
        return;
      }
      if (challenge.attempts >= challenge.maxAttempts) {
        await store.revokeChallenge(challenge.id);
        res.status(429).json({ error: "محاولات كثيرة — اطلب كودًا جديدًا" });
        return;
      }

      const valid = code
        ? timingSafeEqual(challenge.codeHash, await secretHash(code))
        : token && challenge.linkTokenHash
          ? timingSafeEqual(challenge.linkTokenHash, await secretHash(token))
          : false;

      if (!valid) {
        const attempts = challenge.attempts + 1;
        await store.bumpChallengeAttempts(challenge.id, attempts);
        const attemptsLeft = Math.max(0, challenge.maxAttempts - attempts);
        await audit(store, {
          admin: null,
          action: "login.verify.denied",
          entityType: "challenge",
          entityId: challenge.id,
          outcome: "denied",
          detail: { phone, attemptsLeft },
          req,
        });
        if (attemptsLeft === 0) await store.revokeChallenge(challenge.id);
        res.status(401).json({ error: "الكود غير صحيح", attemptsLeft });
        return;
      }

      await store.consumeChallenge(challenge.id);
      await store.markAdminLogin(challenge.adminId);

      const admin = await store.findAdminByPhone(phone);
      if (!admin || !admin.isActive) {
        res.status(401).json({ error: "الحساب غير نشط" });
        return;
      }

      const { token: sessionToken, expiresAt } = await createSession(store, admin, req);
      res.cookie(SESSION_COOKIE, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_TTL_SECONDS * 1000,
      });

      await audit(store, {
        admin,
        action: "login.ok",
        entityType: "challenge",
        entityId: challenge.id,
        req,
      });

      res.json({
        ok: true,
        admin: publicAdmin(admin),
        session: { expiresAt },
      });
    })
  );

  router.post(
    "/auth/logout",
    handle(async (req, res) => {
      try {
        await revokeSession(getStore(), req);
      } catch {
        // الجلسة منتهية أصلًا — نكمل
      }
      res.clearCookie(SESSION_COOKIE, getSessionCookieOptions(req));
      res.json({ ok: true });
    })
  );

  router.get("/auth/me", requireAdmin, (req: Request, res: Response) => {
    const { session, admin } = (req as AdminRequest).adminSession!;
    res.json({
      admin: publicAdmin(admin),
      session: { id: session.id, expiresAt: session.expiresAt },
    });
  });

  // ---------- المنتجات ----------

  // manifest عام لحافة Cloudflare: يجب أن يسبق /products/:id وإلا التقطه
  // كنمط معرّف منتج (expressive route ordering).
  router.get(
    "/products/overrides-manifest",
    handle(async (_req, res) => {
      const overrides = await getStore().getOverrides();
      res.set("Cache-Control", "no-store");
      res.json({
        overrides: overrides.map(o => ({
          productId: o.productId,
          name: o.name,
          price: o.price,
          description: o.description,
          image: o.image,
          active: o.active,
          updatedAt: o.updatedAt,
        })),
        fetchedAt: new Date().toISOString(),
      });
    })
  );

  router.get(
    "/products",
    requireAdmin,
    handle(async (req, res) => {
      const search = typeof req.query.search === "string" ? req.query.search : "";
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const { products, status, fetchedAt } = await fetchMergedCatalog();
      const filtered = searchProducts(products, search);
      res.json({
        products: filtered.slice(offset, offset + limit),
        total: filtered.length,
        status,
        fetchedAt,
      });
    })
  );

  router.get(
    "/products/:id",
    requireAdmin,
    handle(async (req, res) => {
      const product = await fetchMergedProduct(req.params.id);
      if (!product) {
        res.status(404).json({ error: "المنتج غير موجود" });
        return;
      }
      res.json({ product });
    })
  );

  router.patch(
    "/products/:id",
    requireAdmin,
    handle(async (req, res) => {
      const { admin } = (req as AdminRequest).adminSession!;
      const store = getStore();
      const body = (req.body ?? {}) as Record<string, unknown>;

      const { allowed, denied } = splitPatchFields(body, admin);
      if (denied.length > 0) {
        await audit(store, {
          admin,
          action: "product.update.denied",
          entityType: "product",
          entityId: req.params.id,
          outcome: "denied",
          detail: { denied },
          req,
        });
        res.status(403).json({ error: "لا تملك صلاحية تعديل بعض الحقول", denied });
        return;
      }
      if (Object.keys(allowed).length === 0) {
        res.status(400).json({ error: "لا حقول للتعديل" });
        return;
      }

      const existing = await fetchMergedProduct(req.params.id);
      if (!existing) {
        res.status(404).json({ error: "المنتج غير موجود" });
        return;
      }

      const prev = await store.getOverride(req.params.id);
      const emptyToNull = (v: string) => (v.trim() === "" ? null : v.trim());
      const normalizePrice = (v: unknown, fallback: number | null): number | null => {
        if (typeof v === "number") return Number.isFinite(v) ? Math.max(0, v) : fallback;
        if (typeof v === "string" && v.trim() !== "") {
          const n = Number(v);
          return Number.isFinite(n) ? Math.max(0, n) : fallback;
        }
        return fallback;
      };

      await store.upsertOverride({
        productId: req.params.id,
        name:
          typeof allowed.name === "string" && allowed.name.trim() !== ""
            ? emptyToNull(allowed.name)
            : prev?.name ?? null,
        price:
          "price" in allowed
            ? normalizePrice(allowed.price, prev?.price ?? null)
            : prev?.price ?? null,
        description:
          typeof allowed.description === "string"
            ? emptyToNull(allowed.description)
            : prev?.description ?? null,
        image:
          typeof allowed.image === "string" ? emptyToNull(allowed.image) : prev?.image ?? null,
        active:
          typeof allowed.active === "boolean" ? allowed.active : prev?.active ?? null,
        updatedBy: admin.id,
      });

      await audit(store, {
        admin,
        action: "product.update",
        entityType: "product",
        entityId: req.params.id,
        detail: { fields: Object.keys(allowed) },
        req,
      });

      const updated = await fetchMergedProduct(req.params.id);
      res.json({ ok: true, product: updated });
    })
  );

  // ---------- سجل النشاط ----------

  router.get(
    "/activity",
    requireAdmin,
    handle(async (req, res) => {
      const { admin } = (req as AdminRequest).adminSession!;
      const limit = Number(req.query.limit) || 20;
      const rows = await getStore().recentAudit(admin.id, limit);
      res.json({ rows });
    })
  );

  app.use("/api/admin", router);
}
