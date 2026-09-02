/**
 * server/adminAuth.ts — نواة أمان لوحة إدارة المدراء: تشفير، جلسات، RBAC
 * على مستوى الحقل، وحدود المعدل. كل الإنفاذ يتم هنا على الخادم
 * (الواجهة مجرد UX).
 *
 * مبادئ التصميم (منقولة من بنية مستودع التطوير omrantoys-store):
 *  1) لا كلمات مرور — الهوية رقم واتساب + كود لمرة واحدة.
 *  2) لا يُخزَّن أي سر نصًا: OTP/توكن الجلسة/الرابط السحري تُخزَّن
 *     كـ SHA-256 مع AUTH_PEPPER (سر بيئة على الخادم).
 *  3) الجلسة توكن عشوائي 32 بايت داخل Cookie HttpOnly+Secure.
 *  4) الصلاحيات تُقرأ من قاعدة البيانات مع كل طلب (لا تُحفظ في التوكن)
 *     حتى يمكن سحب صلاحية موظف فورًا دون انتظار انتهاء جلسته.
 */

import type { Request } from "express";
import type { AdminRecord, AdminStore } from "./adminStore";
import { ENV } from "./_core/env";

// ============================ Crypto ============================

const encoder = new TextEncoder();

/** SHA-256 → hex */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash "مُتبَّل" لقيمة سرية مؤقتة (OTP / توكن) */
export const secretHash = (value: string): Promise<string> =>
  sha256Hex(`${ENV.adminPepper || "dev-pepper"}::${value}`);

/** مقارنة زمنية ثابتة (تمنع Timing Attacks) */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** توليد توكن عشوائي (hex) بطول بايتات محدد */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** UUID v4 عشوائي (معرّفات الصفوف) */
export function randomUuid(): string {
  return crypto.randomUUID();
}

/** توليد كود OTP من 6 أرقام بمصدر عشوائي تشفيري (بدون Module Bias) */
export function randomOtp(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const n = buf[0] * 2 ** 24 + buf[1] * 2 ** 16 + buf[2] * 2 ** 8 + buf[3]; // 0..2^32-1
  return String(n % 1_000_000).padStart(6, "0");
}

// ============================ هواتف ============================

/** تطبيع رقم الهاتف إلى E.164 (+ بادئة دولة 1-3 أرقام و9-12 رقماً) */
export function normalizePhone(raw: string | undefined | null): string | null {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  let phone = digits.startsWith("+") ? digits : `+${digits}`;
  phone = `+${phone.slice(1).replace(/\D/g, "")}`;
  return /^\+\d{10,15}$/.test(phone) ? phone : null;
}

// ============================ الجلسات ============================

export const SESSION_COOKIE = "omran_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 ساعات
const SESSION_REFRESH_THRESHOLD_MS = 4 * 60 * 60 * 1000; // تجديد إذا بقي أقل من 4 ساعات

export function parseSessionToken(req: Request): string | null {
  const header = req.headers.cookie ?? "";
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([A-Za-z0-9]{16,128})`)
  );
  return match ? match[1] : null;
}

/**
 * توليد جلسة جديدة وتخزين hash التوكن في المتجر (MySQL أو الذاكرة).
 * يعيد التوكن الخام ليوضع في Cookie HttpOnly.
 */
export async function createSession(
  store: AdminStore,
  admin: AdminRecord,
  req: Request
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_SECONDS * 1000);
  await store.createSession({
    id: randomUuid(),
    adminId: admin.id,
    tokenHash: await secretHash(token),
    expiresAt,
    createdAt: new Date(now),
    lastSeenAt: new Date(now),
    revokedAt: null,
    userAgent: (req.headers["user-agent"] || "").slice(0, 250) || null,
    ipHash: await clientIpHash(req),
  });
  return { token, expiresAt };
}

/**
 * قراءة الجلسة من الكوكي والتحقق منها مقابل المتجر.
 * يعيد { session, admin } أو null — ويحدّث last_seen والصلاحيات من DB دائمًا.
 */
export async function resolveSession(
  store: AdminStore,
  req: Request
): Promise<{ session: { id: string; expiresAt: Date }; admin: AdminRecord } | null> {
  const raw = parseSessionToken(req);
  if (!raw) return null;

  const tokenHash = await secretHash(raw);
  const found = await store.findSessionByTokenHash(tokenHash);
  if (!found) return null;

  const { session, admin } = found;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!admin.isActive) return null;

  // تجديد منزلق صامت
  if (session.expiresAt.getTime() - Date.now() < SESSION_REFRESH_THRESHOLD_MS) {
    const newExpiry = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await store.touchSession(session.id, { extendTo: newExpiry }).catch(() => {});
  } else {
    await store.touchSession(session.id, {}).catch(() => {});
  }

  return {
    session: { id: session.id, expiresAt: session.expiresAt },
    admin,
  };
}

/** إبطال الجلسة الحالية (تسجيل الخروج) */
export async function revokeSession(
  store: AdminStore,
  req: Request
): Promise<boolean> {
  const raw = parseSessionToken(req);
  if (!raw) return false;
  const tokenHash = await secretHash(raw);
  const found = await store.findSessionByTokenHash(tokenHash);
  if (!found) return false;
  await store.revokeSession(found.session.id);
  return true;
}

// ============================ RBAC ============================

/** هل يملك المدير صلاحية معينة؟ ("*" = super_admin) */
export function hasPermission(admin: AdminRecord, permission: string): boolean {
  return admin.permissions.includes("*") || admin.permissions.includes(permission);
}

/**
 * خريطة "الحقل القابل للتعديل في المنتج → الصلاحية المطلوبة".
 * هذه هي الحدود الصارمة للدور المحدود: اسم/سعر/وصف/صورة فقط.
 * أي حقل خارج الخريطة مرفوض — حتى لو أرسله العميل مباشرة إلى الـ API.
 */
export const PRODUCT_FIELD_PERMISSIONS: Record<string, string> = {
  name: "products.name",
  price: "products.price",
  description: "products.description",
  image: "products.images",
};

/** الحقول الإضافية التي يستطيع super_admin فقط لمسها */
export const SUPER_ONLY_FIELDS = new Set(["active"]);

export type PatchSplit = {
  allowed: Record<string, unknown>;
  denied: { field: string; reason: string }[];
};

/**
 * فصل حقول PATCH إلى مسموحة/مرفوضة حسب صلاحيات المدير.
 * سياسة "الكل أو لا شيء": أي حقل مرفوض يُسقط الطلب كاملاً (403)
 * مع تسجيل المحاولة في سجل التدقيق — أفضل من التنفيذ الجزئي الصامت.
 */
export function splitPatchFields(
  body: Record<string, unknown>,
  admin: AdminRecord
): PatchSplit {
  const allowed: Record<string, unknown> = {};
  const denied: { field: string; reason: string }[] = [];
  for (const [field, value] of Object.entries(body ?? {})) {
    const requiredPerm = PRODUCT_FIELD_PERMISSIONS[field];
    if (requiredPerm) {
      if (hasPermission(admin, requiredPerm)) allowed[field] = value;
      else denied.push({ field, reason: `missing_permission:${requiredPerm}` });
    } else if (SUPER_ONLY_FIELDS.has(field) && hasPermission(admin, "*")) {
      allowed[field] = value;
    } else {
      denied.push({
        field,
        reason: SUPER_ONLY_FIELDS.has(field) ? "super_admin_only" : "immutable_field",
      });
    }
  }
  return { allowed, denied };
}

// ============================ حدود المعدل ============================

type RateEntry = { windowStart: number; count: number };

/**
 * نافذة معدل ثابتة داخل العملية (في الذاكرة). مناسبة للنسخة أحادية
 * الحاوية؛ عند التشغيل بعدة نسخ يُنصح بنقل العدّاد لمخزن مشترك (MySQL).
 * تنظيف دوري يمنع تسرب الذاكرة.
 */
const rateBuckets = new Map<string, RateEntry>();
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): { ok: boolean; count: number; retryAfterSec: number } {
  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    for (const [k, entry] of rateBuckets) {
      if (now - entry.windowStart > windowMs) rateBuckets.delete(k);
    }
    lastSweep = now;
  }
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const entry = rateBuckets.get(key);
  if (!entry || entry.windowStart !== windowStart) {
    rateBuckets.set(key, { windowStart, count: 1 });
    return { ok: 1 <= limit, count: 1, retryAfterSec: Math.ceil((windowStart + windowMs - now) / 1000) };
  }
  entry.count += 1;
  return {
    ok: entry.count <= limit,
    count: entry.count,
    retryAfterSec: Math.ceil((windowStart + windowMs - now) / 1000),
  };
}

// ============================ التدقيق / IP ============================

/** عنوان العميل بعد الثقة بوسيط واحد (Cloudflare Tunnel) */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.includes(",")) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "0.0.0.0";
}

/** hash للـ IP مع الفلفل — للتدقيق دون حفظ عنوان صريح */
export async function clientIpHash(req: Request): Promise<string> {
  return sha256Hex(`${ENV.adminPepper || "dev-pepper"}::ip::${clientIp(req)}`);
}

export type AuditInput = {
  admin?: AdminRecord | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  outcome?: "ok" | "denied" | "error";
  detail?: unknown;
  req?: Request | null;
};

/** كتابة سطر تدقيق (best-effort: لا يُفشل الطلب الأصلي) */
export async function audit(
  store: AdminStore,
  input: AuditInput
): Promise<void> {
  try {
    await store.insertAudit({
      id: randomUuid(),
      adminId: input.admin?.id ?? null,
      adminPhone: input.admin?.phone ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId != null ? String(input.entityId) : null,
      outcome: input.outcome ?? "ok",
      detail: input.detail ?? null,
      ipHash: input.req ? await clientIpHash(input.req) : null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[admin] audit write failed:", err);
  }
}

// ============================ CSRF/الأصل ============================

/**
 * للطلبات المُغيِّرة (POST/PATCH/DELETE) على /api/admin/*:
 * نتحقق أن الطلب يأتي من نفس الأصل أو يحمل رأس X-Requested-With المخصص
 * (يرسله عميل اللوحة دائمًا). الكوكي SameSite=None ليتوافق مع بيئة
 * المعاينة داخل iframe — لذا هذا الفحص هو خط الدفاع الأول ضد CSRF.
 */
export function sameOriginOrXhr(req: Request): boolean {
  const sfs = req.headers["sec-fetch-site"];
  if (sfs && sfs !== "same-origin" && sfs !== "none") return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  }
  return (
    req.headers["x-requested-with"] === "XMLHttpRequest" ||
    sfs === "same-origin"
  );
}
