/**
 * OMRAN TOYS — سياسة OTP الموحّدة لعملاء وموظفي المتجر.
 *
 * ⚠️ أمان: التوليد/التحقق/التخزين يجب أن يعمل خادميًا فقط (Apps Script /
 * Cloudflare Pages Function / بوابة موثوقة). الواجهة لا تولّد رمزًا أبدًا ولا
 * تخزّنه ولا ترى عمر التحدي. الواجهة تستورد ثوابت العرض (العدّاد/الطول) ومنطق
 * إدخال الرمز فقط.
 *
 * القواعد المطبّقة هنا (مصمّمة لتُنقل حرفيًا لأي مزوّد):
 *   - رمز رقمي 6 خانات بتوزيع منتظم عبر crypto آمن (رفض تحيّز الباقي).
 *   - صلاحية 5 دقائق، استخدام مرة واحدة، ثم إبطال التحدي فورًا.
 *   - حد أقصى 5 محاولات خاطئة ثم إبطال التحدي (يلزم طلب رمز جديد).
 *   - مهلة إعادة إرسال 45 ثانية.
 *   - حد معدل الطلبات: حد أقصى لعدد التحديات لكل رقم/IP في نافذة زمنية.
 *   - عدم تخزين الرمز صريحًا: يُخزَّن تجزئة SHA-256 مرتبطة بمعرّف التحدي فقط.
 *   - لا شيء يُسجَّل: الرمز لا يظهر في logs/metadata/أخطاء.
 */

export const OTP_CODE_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 دقائق
export const OTP_MAX_WRONG_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
export const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة
export const OTP_RATE_LIMIT_MAX_REQUESTS = 5; // طلبات لكل رقم في النافذة
export const OTP_RATE_LIMIT_MAX_PER_IP = 20; // طلبات لكل IP في النافذة

export type OtpVerificationOutcome =
  | "OK"
  | "INVALID"
  | "EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "ALREADY_USED"
  | "CHALLENGE_NOT_FOUND";

export type OtpStoredChallenge = {
  challengeId: string;
  /** SHA-256(code + ":" + challengeId) بتمثيل hex — الرمز الصريح لا يُخزَّن. */
  codeHash: string;
  mobile: string;
  domain: "CUSTOMER" | "EMPLOYEE";
  createdAt: number;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
  consumed: boolean;
  version: 1;
};

/** يتحقق أن المدخل رمز رقمي بالطول المتوقع (للاستخدام في الواجهة والخادم). */
export function isOtpCodeShape(value: string): boolean {
  return new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(String(value ?? ""));
}

/**
 * يولّد رمزًا رقميًا عشوائيًا آمنًا.
 * @param randomBytes يجب أن يوفّر بايتات من CSPRNG (crypto.getRandomValues).
 */
export function generateOtpCode(
  randomBytes: (length: number) => Uint8Array
): string {
  // رفض التحيز الناتج عن باقي قسمة 256 على 10: نقبل حتى أقل مضاعف لـ10 ≤ 256.
  const ceiling = 256 - (256 % 10); // 250
  const digits: number[] = [];
  while (digits.length < OTP_CODE_LENGTH) {
    const [byte] = randomBytes(1);
    if (byte >= ceiling) continue;
    digits.push(byte % 10);
  }
  return digits.join("");
}

/** تجزئة الرمز مع ربطها بمعرّف التحدي لمنع إعادة استخدام التجزئة بين التحديات. */
export async function hashOtpCode(code: string, challengeId: string): Promise<string> {
  const payload = new TextEncoder().encode(`${code}:${challengeId}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/** مقارنة ثابتة الزمن لتجزئتين. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export type CreateChallengeInput = {
  mobile: string;
  domain: "CUSTOMER" | "EMPLOYEE";
  code: string;
  now?: number;
  challengeId?: string;
};

/** ينشئ تحدي OTP جديدًا للعَبَر (الرمز يُجزَّر فورًا ولا يعود ضمن النتيجة). */
export async function createOtpChallenge(
  input: CreateChallengeInput
): Promise<OtpStoredChallenge> {
  if (!isOtpCodeShape(input.code)) {
    throw new Error("INVALID_OTP_CODE_SHAPE");
  }
  const now = input.now ?? Date.now();
  const challengeId =
    input.challengeId ??
    (globalThis.crypto?.randomUUID?.() ??
      `otp-${now}-${Math.random().toString(16).slice(2, 12)}`);
  const codeHash = await hashOtpCode(input.code, challengeId);
  return {
    challengeId,
    codeHash,
    mobile: input.mobile,
    domain: input.domain,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
    attempts: 0,
    consumed: false,
    version: 1,
  };
}

export type OtpVerificationResult = {
  outcome: OtpVerificationOutcome;
  challenge: OtpStoredChallenge;
};

/**
 * يتحقق من رمز ضد تحدٍّ مخزّن وفق كل قواعد السياسة.
 * الحالة تُعاد للتخزين (محاولة خاطئة تزيد العدّاد؛ نجاح أو انتهاء أو استنزاف
 * المحاولات يضع consumed=true ولا يمكن إعادة استخدام التحدي بعده).
 */
export async function verifyOtpChallenge(
  challenge: OtpStoredChallenge | null | undefined,
  code: string,
  now: number = Date.now()
): Promise<OtpVerificationResult> {
  if (!challenge) {
    return {
      outcome: "CHALLENGE_NOT_FOUND",
      challenge: makeNullChallengePlaceholder(now),
    };
  }
  if (challenge.consumed) {
    return { outcome: "ALREADY_USED", challenge: { ...challenge, consumed: true } };
  }
  if (now > challenge.expiresAt) {
    return { outcome: "EXPIRED", challenge: { ...challenge, consumed: true } };
  }
  if (challenge.attempts >= OTP_MAX_WRONG_ATTEMPTS) {
    return { outcome: "TOO_MANY_ATTEMPTS", challenge: { ...challenge, consumed: true } };
  }
  if (!isOtpCodeShape(code)) {
    const next = { ...challenge, attempts: challenge.attempts + 1 };
    if (next.attempts >= OTP_MAX_WRONG_ATTEMPTS) next.consumed = true;
    return { outcome: next.consumed ? "TOO_MANY_ATTEMPTS" : "INVALID", challenge: next };
  }
  const candidateHash = await hashOtpCode(code, challenge.challengeId);
  if (!timingSafeEqualHex(candidateHash, challenge.codeHash)) {
    const next = { ...challenge, attempts: challenge.attempts + 1 };
    if (next.attempts >= OTP_MAX_WRONG_ATTEMPTS) next.consumed = true;
    return { outcome: next.consumed ? "TOO_MANY_ATTEMPTS" : "INVALID", challenge: next };
  }
  return { outcome: "OK", challenge: { ...challenge, consumed: true, attempts: challenge.attempts + 1 } };
}

function makeNullChallengePlaceholder(now: number): OtpStoredChallenge {
  // كائن وهمي لا يُخزَّن أبدًا — فقط للحفاظ على شكل النوع عند غياب التحدي.
  return {
    challengeId: "",
    codeHash: "",
    mobile: "",
    domain: "CUSTOMER",
    createdAt: now,
    expiresAt: now,
    resendAvailableAt: now,
    attempts: OTP_MAX_WRONG_ATTEMPTS,
    consumed: true,
    version: 1,
  };
}

/** هل إعادة الإرسال مسموح بها الآن؟ */
export function canResendChallenge(
  challenge: Pick<OtpStoredChallenge, "resendAvailableAt" | "consumed" | "expiresAt">,
  now: number = Date.now()
): boolean {
  if (challenge.consumed) return true; // تحدٍّ منتهٍ → طلب جديد
  return now >= challenge.resendAvailableAt;
}

/** ثوانٍ متبقية قبل السماح بإعادة الإرسال (لعدّاد الواجهة). */
export function resendCooldownSeconds(
  challenge: Pick<OtpStoredChallenge, "resendAvailableAt" | "consumed">,
  now: number = Date.now()
): number {
  if (challenge.consumed) return 0;
  return Math.max(0, Math.ceil((challenge.resendAvailableAt - now) / 1000));
}

/** ثوانٍ متبقية على انتهاء صلاحية التحدي. */
export function challengeTtlSeconds(
  challenge: Pick<OtpStoredChallenge, "expiresAt" | "consumed">,
  now: number = Date.now()
): number {
  if (challenge.consumed) return 0;
  return Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000));
}

export type RateBucket = {
  count: number;
  windowStartedAt: number;
};

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * حدّ معدل بسيط ذي نافذة ثابتة — يُطبَّق لكل موبايل ولكل IP على حدة على الخادم.
 */
export function evaluateRateLimit(
  bucket: RateBucket | null | undefined,
  now: number,
  maxRequests: number,
  windowMs: number = OTP_RATE_LIMIT_WINDOW_MS
): RateLimitDecision {
  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    return { allowed: true };
  }
  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.windowStartedAt + windowMs - now) / 1000),
    };
  }
  return { allowed: true };
}

/** سجلّ طلب جديد داخل النافذة. */
export function recordRateHit(
  bucket: RateBucket | null | undefined,
  now: number,
  windowMs: number = OTP_RATE_LIMIT_WINDOW_MS
): RateBucket {
  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    return { count: 1, windowStartedAt: now };
  }
  return { count: bucket.count + 1, windowStartedAt: bucket.windowStartedAt };
}
