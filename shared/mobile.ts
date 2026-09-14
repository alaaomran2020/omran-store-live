/**
 * OMRAN TOYS — توحيد أرقام المحمول المصرية (E.164).
 *
 * المصدر الوحيد لتطبيع أرقام العملاء والموظفين عبر المشروع كله، حتى لا تتكوّن
 * حسابات مكررة بسبب اختلاف الصياغة:
 *   - 010XXXXXXXX  (صيغة محلية، 11 رقمًا)
 *   - 01XXXXXXXXX
 *   - 201XXXXXXXXX (صيغة دولية بلا +)
 *   - +201XXXXXXXXX
 *
 * الناتج الموحّد دائمًا: +20 1X XXXXXXXX  مثال: +201012345678
 *
 * الشبكات المصرية المعتمدة: 010 / 011 / 012 / 015 فقط.
 * هذه وحدة نقية (بلا شبكة/تخزين) وتُستخدم في العميل وأي خادم/سكربت مستقبلي.
 */

export const EGYPT_COUNTRY_CODE = "20";
/** بادئات شبكات المحمول المصرية بعد الرقم 01. */
export const EGYPT_MOBILE_NETWORK_PREFIXES = ["0", "1", "2", "5"] as const;
/** الطول الوطني بدون صفر بادئة: 1X + 8 أرقام = 10 أرقام. */
const NATIONAL_LENGTH = 10;

export type MobileValidationError =
  | "EMPTY_MOBILE"
  | "INVALID_MOBILE"
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_COUNTRY";

export type MobileNormalizationResult =
  | { ok: true; e164: string }
  | { ok: false; reason: MobileValidationError };

/** يحوّل الأرقام العربية/الفارسية إلى أرقام لاتينية ويزيل كل ما هو غير رقمي. */
export function mobileDigits(input: string): string {
  let out = "";
  for (const ch of String(input ?? "")) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    // أرقام عربية هندية ٠-٩
    if (code >= 0x0660 && code <= 0x0669) {
      out += String(code - 0x0660);
      continue;
    }
    // أرقام فارسية/عربية ممتدة ۰-۹
    if (code >= 0x06f0 && code <= 0x06f9) {
      out += String(code - 0x06f0);
      continue;
    }
  }
  return out;
}

/**
 * يطبّع رقم محمول مصري إلى E.164 أو يُرجع سبب الرفض.
 * لا يطبّع أي رقم دولة أخرى (المتجر يعمل في مصر فقط حاليًا).
 */
export function normalizeEgyptianMobileResult(
  input: string
): MobileNormalizationResult {
  const digits = mobileDigits(input);
  if (!digits) return { ok: false, reason: "EMPTY_MOBILE" };

  let national = digits;

  // 0020... مفتاح دولي كامل
  if (national.startsWith(`00${EGYPT_COUNTRY_CODE}`)) {
    national = national.slice(4);
  } else if (national.startsWith(EGYPT_COUNTRY_CODE)) {
    // +20... أو 20... → أزل مفتاح الدولة
    national = national.slice(2);
  } else if (national.length === 11 && national.startsWith("0")) {
    // صيغة محلية 01XXXXXXXXX
    national = national.slice(1);
  }

  if (national.length !== NATIONAL_LENGTH || !national.startsWith("1")) {
    if (digits.startsWith(EGYPT_COUNTRY_CODE) || digits.startsWith("00")) {
      return { ok: false, reason: "UNSUPPORTED_COUNTRY" };
    }
    return { ok: false, reason: "INVALID_MOBILE" };
  }

  const networkDigit = national[1];
  if (!(EGYPT_MOBILE_NETWORK_PREFIXES as readonly string[]).includes(networkDigit)) {
    return { ok: false, reason: "UNSUPPORTED_NETWORK" };
  }

  if (!/^\d{10}$/.test(national)) {
    return { ok: false, reason: "INVALID_MOBILE" };
  }

  return { ok: true, e164: `+${EGYPT_COUNTRY_CODE}${national}` };
}

/** اختصار شائع: يُرجع الرقم الموحّد E.164 أو null إن كان غير صالح. */
export function normalizeEgyptianMobile(input: string): string | null {
  const result = normalizeEgyptianMobileResult(input);
  return result.ok ? result.e164 : null;
}

/** هل الرقم صيغة E.164 مصرية صالحة بالفعل؟ */
export function isEgyptianE164(value: string): boolean {
  return /^\+201[0125]\d{8}$/.test(String(value ?? ""));
}

/**
 * يُخفي منتصف رقم الموبايل للعرض في لوحات الإدارة/السجلات (حماية PII):
 * +201555570269 → +20 155 •••• 0269  (يُبقي أول 5 وأخر 3).
 */
export function maskMobile(value: string): string {
  const normalized = isEgyptianE164(value)
    ? value
    : normalizeEgyptianMobile(value);
  if (!normalized) return "••• •••• •••";
  const head = normalized.slice(0, 5); // +2015
  const tail = normalized.slice(-3);
  return `${head} ${"\u2022".repeat(2)} ${"\u2022".repeat(4)} ${tail}`;
}

/** صيغة عرض آمنة: +20 1X XXXX XXXX */
export function formatMobile(value: string): string {
  const normalized = isEgyptianE164(value)
    ? value
    : normalizeEgyptianMobile(value);
  if (!normalized) return String(value ?? "");
  const digits = normalized.slice(1); // بلا +
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}
