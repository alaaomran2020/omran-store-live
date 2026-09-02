/**
 * server/adminWhatsapp.ts — إرسال كود OTP عبر واتساب + التحقق من الـ Webhook.
 *
 * مزوّدان مدعومان:
 *   1) "meta" → WhatsApp Cloud API الرسمي (Meta Graph API).
 *   2) "dev"  → وضع التطوير: لا يُرسل شيء فعليًا، ويُعاد الكود في
 *               الاستجابة حتى تُختبر الدورة كاملة محليًا.
 *
 * متغيرات البيئة (أسرار على الخادم):
 *   WHATSAPP_PROVIDER        meta | dev            (الافتراضي: dev إن لم يوجد توكن)
 *   WHATSAPP_TOKEN           رمز وصول دائم من Meta App
 *   WHATSAPP_PHONE_NUMBER_ID معرّف رقم العمل في Cloud API
 *   WHATSAPP_OTP_TEMPLATE    اسم قالب "authentication" المعتمد (افتراضي: omran_admin_login)
 *   WHATSAPP_TEMPLATE_LANG   لغة القالب (افتراضي: ar)
 *   WHATSAPP_VERIFY_TOKEN    رمز التحقق لاشتراك الـ Webhook (Meta Dashboard)
 *   WHATSAPP_APP_SECRET      سر التطبيق للتحقق من X-Hub-Signature-256
 *   AUTH_DEV_MODE            1 = إرجاع dev_code في الاستجابة (تطوير فقط!)
 */

import { timingSafeEqual } from "./adminAuth";
import { ENV } from "./_core/env";

const GRAPH_VERSION = "v21.0";

/** هل وضع التطوير مفعّل؟ */
export function isDevMode(): boolean {
  return (
    ENV.adminDevMode ||
    ENV.whatsappProvider === "dev" ||
    !ENV.whatsappToken
  );
}

export type SendOtpResult = {
  delivered: boolean;
  devCode?: string;
  devMagicUrl?: string;
  messageId?: string;
  providerError?: string;
};

/**
 * إرسال كود OTP (ورابط سحري إن وُجد) إلى رقم المدير.
 * في وضع التطوير يُسجَّل الكود في السجل ويُعاد في النتيجة.
 */
export async function sendOtpMessage(
  phone: string,
  code: string,
  magicUrl: string | null = null
): Promise<SendOtpResult> {
  if (isDevMode()) {
    console.warn(
      `[AUTH:DEV] كود دخول ${phone} → ${code}${magicUrl ? ` | رابط: ${magicUrl}` : ""}`
    );
    return {
      delivered: true,
      devCode: code,
      devMagicUrl: magicUrl ?? undefined,
    };
  }

  // ---- WhatsApp Cloud API: قالب authentication مع زر نسخ الكود ----
  const templateName = ENV.whatsappOtpTemplate;
  const lang = ENV.whatsappTemplateLang;
  const components: Record<string, unknown>[] = [
    // باراميتر نص الكود يظهر في جسم القالب إن كان يحوي {{1}}
    { type: "body", parameters: [{ type: "text", text: code }] },
  ];
  // زر رابط تسجيل الدخول إن كان بالقالب زر URL {{2}}
  if (magicUrl) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: magicUrl }],
    });
  }

  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components,
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${ENV.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      messages?: { id?: string }[];
    };
    if (!res.ok) {
      console.error("[admin] WhatsApp send failed:", JSON.stringify(data));
      return {
        delivered: false,
        providerError: data?.error?.message || `HTTP ${res.status}`,
      };
    }
    return { delivered: true, messageId: data?.messages?.[0]?.id };
  } catch (err) {
    console.error("[admin] WhatsApp send error:", err);
    return { delivered: false, providerError: String(err) };
  }
}

// ======================= الـ Webhook (Meta → الخادم) =======================

/**
 * GET /api/webhooks/whatsapp — خطوة "التحقق" عند اشتراك الـ Webhook
 * في Meta Dashboard: نعيد hub.challenge فقط إذا طابق الرمز ما لدينا.
 * يعيد نص التحدي أو null للرفض.
 */
export function verifyWebhookSubscription(
  searchParams: URLSearchParams
): string | null {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    token &&
    ENV.whatsappVerifyToken &&
    timingSafeEqual(token, ENV.whatsappVerifyToken) &&
    challenge
  ) {
    return challenge;
  }
  return null;
}

/**
 * التحقق من توقيع X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(rawBody, APP_SECRET).
 * مقارنة زمنية ثابتة لمنع تزوير الإشعارات. بلا سر مضبوط → نرفض (fail closed).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined
): Promise<boolean> {
  if (!ENV.whatsappAppSecret) return false;
  if (!signatureHeader) return false;
  const expected = "sha256=" + (await hmacSha256Hex(ENV.whatsappAppSecret, rawBody));
  return timingSafeEqual(signatureHeader, expected);
}

/** HMAC-SHA256 → hex (للتحقق من توقيع Meta) */
export async function hmacSha256Hex(
  secret: string,
  message: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
