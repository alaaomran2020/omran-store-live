/**
 * عميل مصادقة OTP للنطاقين (عملاء / موظفون).
 *
 * ⚠️ حدود معمارية حقيقية:
 *   - توليد الرمز، التحقق، التخزين، معدّل الطلبات وحد المحاولات كلها مسؤولية
 *     خادم/بوابة موثوقة (راجع shared/otp.ts للسياسة الكاملة).
 *   - هذا العميل لا يولّد أي رمز ولا يخزّن شيئًا في localStorage/sessionStorage.
 *   - الجلسة شطيرة HttpOnly + Secure + SameSite يضبطها الخادم؛ جافاسكربت لا
 *     يرى توكنًا إطلاقًا.
 *
 * نقاط النهاية Same-origin تحت VITE_AUTH_API_BASE (افتراضيًا /api/auth):
 *   POST /otp/request   { domain, mobile }
 *        → { challenge_id, expires_in, resend_in }
 *   POST /otp/verify    { challenge_id, code, domain }
 *        → 200 { authenticated:true }  | 401/429/410 أخطاء سياسة
 *   GET  /session       → هوية الجلسة الحالية
 *   POST /logout
 *   POST /account/action  إجراءات الحساب (تحديث بيانات/عنوان) — شطيرة العميل فقط
 *
 * حتى تُنشر البوابة (Cloudflare Pages Function / Apps Script / Make مع مزوّد
 * إرسال)، أي طلب يُقابل بـ404/فشل اتصال يُترجم إلى PROVIDER_NOT_CONFIGURED
 * والواجهة تفشل بأمان (Fail-Closed) بلا أي رمز وهمي.
 */
import type { SessionIdentity } from "@shared/identity";
import type { CustomerSessionResult } from "@shared/identity";

const AUTH_ENABLED = String(import.meta.env.VITE_AUTH_ENABLED ?? "true").trim().toLowerCase() !== "false";
const AUTH_BASE = (import.meta.env.VITE_AUTH_API_BASE ?? "/api/auth").replace(/\/$/, "");

export type AuthDomain = "CUSTOMER" | "EMPLOYEE";

export type OtpChallengeView = {
  challengeId: string;
  expiresInSeconds: number;
  resendInSeconds: number;
};

export type AuthErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "INVALID_MOBILE"
  | "RATE_LIMITED"
  | "INVALID_CODE"
  | "EXPIRED_CODE"
  | "TOO_MANY_ATTEMPTS"
  | "EMPLOYEE_NOT_INVITED"
  | "EMPLOYEE_DISABLED"
  | "NETWORK_ERROR";

export class AuthClientError extends Error {
  code: AuthErrorCode;
  retryAfterSeconds?: number;
  constructor(code: AuthErrorCode, retryAfterSeconds?: number) {
    super(code);
    this.name = "AuthClientError";
    this.code = code;
    if (retryAfterSeconds !== undefined) this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function postJson(path: string, body: Record<string, unknown>): Promise<Response> {
  if (!AUTH_ENABLED) throw new AuthClientError("PROVIDER_NOT_CONFIGURED");
  return fetch(`${AUTH_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

function mapFailure(response: Response): never {
  if (response.status === 404 || response.status === 501) {
    throw new AuthClientError("PROVIDER_NOT_CONFIGURED");
  }
  if (response.status === 429) {
    const retry = Number(response.headers.get("Retry-After") ?? 0);
    throw new AuthClientError("RATE_LIMITED", Number.isFinite(retry) ? retry : undefined);
  }
  switch (response.status) {
    case 410:
      throw new AuthClientError("EXPIRED_CODE");
    case 423:
      throw new AuthClientError("EMPLOYEE_DISABLED");
    case 403:
      throw new AuthClientError("EMPLOYEE_NOT_INVITED");
    case 401:
      throw new AuthClientError("INVALID_CODE");
    default:
      throw new AuthClientError("NETWORK_ERROR");
  }
}

/** يطلب إرسال رمز OTP. لا يُرجع أي رمز أبدًا — فقط بيانات العدّاد. */
export async function requestOtp(
  domain: AuthDomain,
  mobile: string,
  signal?: AbortSignal
): Promise<OtpChallengeView> {
  let response: Response;
  try {
    response = await postJson("/otp/request", { domain, mobile });
  } catch {
    throw new AuthClientError("PROVIDER_NOT_CONFIGURED");
  }
  if (signal?.aborted) throw new AuthClientError("NETWORK_ERROR");
  if (!response.ok) mapFailure(response);
  const body = await response.json().catch(() => null);
  if (!body || typeof body.challenge_id !== "string") {
    throw new AuthClientError("PROVIDER_NOT_CONFIGURED");
  }
  return {
    challengeId: body.challenge_id,
    expiresInSeconds: Number(body.expires_in ?? 300),
    resendInSeconds: Number(body.resend_in ?? 45),
  };
}

export type VerifyResult = {
  authenticated: boolean;
  identity?: SessionIdentity;
  customer?: CustomerSessionResult;
};

/** يتحقق من الرمز. نجاح = الخادم ضبط شطيرة الجلسة الآمنة. */
export async function verifyOtp(
  domain: AuthDomain,
  challengeId: string,
  code: string
): Promise<VerifyResult> {
  let response: Response;
  try {
    response = await postJson("/otp/verify", { domain, challenge_id: challengeId, code });
  } catch {
    throw new AuthClientError("PROVIDER_NOT_CONFIGURED");
  }
  if (!response.ok) mapFailure(response);
  const body = await response.json().catch(() => null);
  if (!body || body.authenticated !== true) {
    throw new AuthClientError("NETWORK_ERROR");
  }
  return body as VerifyResult;
}

/** جلسة العميل الحالية (للنطاق customer) — قراءة آمنة بلا توكن في JS. */
export async function fetchCustomerSession(signal?: AbortSignal): Promise<CustomerSessionResult | null> {
  if (!AUTH_ENABLED) return null;
  try {
    const response = await fetch(`${AUTH_BASE}/session?domain=CUSTOMER`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as CustomerSessionResult;
  } catch {
    return null;
  }
}

export async function logout(domain: AuthDomain): Promise<void> {
  if (!AUTH_ENABLED) return;
  try {
    await postJson("/logout", { domain });
  } catch {
    // إخفاق الخروج لا يكسر الصفحة؛ الشطيرة تنتهي على الحافة أيضًا.
  }
}

export type CustomerWriteResult =
  | { ok: true; acceptedAt: string }
  | { ok: false; code: "NOT_CONFIGURED" | "UNAUTHENTICATED" | "REJECTED" | "ERROR"; message: string };

/**
 * إجراء كتابة لحساب العميل (تحديث بيانات/عنوان) عبر نفس بوابة المصادقة
 * Same-origin — شطيرة جلسة العميل HttpOnly هي التي تُرسَل، وليست كوكيز
 * Cloudflare Access الخاصة بالإدارة. تفشل بأمان إن لم تُنشر البوابة.
 */
export async function postCustomerAction(
  action: string,
  payload: Record<string, string | number | boolean | null>
): Promise<CustomerWriteResult> {
  if (!AUTH_ENABLED) {
    return { ok: false, code: "NOT_CONFIGURED", message: "????? ???????? ????????? ??? ????? ??????" };
  }
  let response: Response;
  try {
    response = await postJson("/account/action", { action, payload });
  } catch {
    return { ok: false, code: "NOT_CONFIGURED", message: "بوابة الحسابات غير منشورة" };
  }
  if (response.status === 404 || response.status === 501) {
    return { ok: false, code: "NOT_CONFIGURED", message: "بوابة الحسابات غير منشورة" };
  }
  if (response.status === 401) {
    return { ok: false, code: "UNAUTHENTICATED", message: "انتهت الجلسة — سجّل الدخول مجددًا" };
  }
  if (!response.ok) {
    return { ok: false, code: "REJECTED", message: `HTTP ${response.status}` };
  }
  const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: unknown } | null;
  if (result && result.ok === false) {
    return { ok: false, code: "REJECTED", message: typeof result.error === "string" ? result.error : "رفضت البوابة الإجراء" };
  }
  return { ok: true, acceptedAt: new Date().toISOString() };
}

/** فحص أمين لتفعيل المزوّد (لا يكشف أي سر). */
export async function isAuthProviderConfigured(): Promise<boolean> {
  if (!AUTH_ENABLED) return false;
  try {
    const response = await fetch(`${AUTH_BASE}/health`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null);
    return Boolean(body && (body as { configured?: boolean }).configured === true);
  } catch {
    return false;
  }
}
