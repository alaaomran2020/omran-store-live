/**
 * OMRAN TOYS — نموذج سجل التدقيق (Audit Log).
 *
 * السجل يكتبه خادم/بوابة موثوقة عند كل إجراء إداري. هذه الوحدة تعرّف:
 *   1. أنواع الأحداث المعتمدة فقط (لا نص حر في اسم الحدث).
 *   2. تطهيرًا صارمًا للحقول يمنع تسريب OTP/tokens/كلمات السر/الأسرار.
 *   3. تصدير CSV آمن من حقن الصيغ (Excel/Google Sheets).
 *
 * لا يُسجَّل أبدًا: رموز OTP، التوكنات، كلمات السر، نصوص رسائل واتساب،
 * أو أي قيمة حساسة للعملاء.
 */

export const AUDIT_ACTIONS = [
  "USER_CREATED",
  "USER_ROLE_CHANGED",
  "USER_DISABLED",
  "USER_REACTIVATED",
  "USER_SUSPENDED",
  "OTP_REQUESTED",
  "OTP_VERIFIED",
  "OTP_FAILED",
  "PRODUCT_CREATED",
  "PRODUCT_UPDATED",
  "PRODUCT_PUBLISHED",
  "PRODUCT_UNPUBLISHED",
  "PRODUCT_ARCHIVED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_REORDERED",
  "INVENTORY_UPDATED",
  "CONTENT_UPDATED",
  "SETTING_UPDATED",
  "CUSTOMER_VIEWED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditTargetType =
  | "PRODUCT"
  | "CATEGORY"
  | "INVENTORY"
  | "CONTENT"
  | "SETTING"
  | "EMPLOYEE"
  | "CUSTOMER";

export type AuditEvent = {
  id: string;
  occurredAt: string; // ISO-8601
  actorId: string;
  actorName: string;
  actorDomain: "EMPLOYEE";
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetName?: string | null;
  /** حقائق غير حساسة فقط (مثل: oldStatus/newStatus). تُطهَّر عبر sanitizeAuditMetadata. */
  metadata?: Record<string, string | number | boolean | null>;
};

/** مفاتيح تُعامل كأسرار مهما كانت القيمة. */
const FORBIDDEN_METADATA_KEYS =
  /(^|[_-])(otp|otp_?code|code|token|password|passwd|pwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|session|cookie|authorization)([_-]|$)/i;

/** قيم تطابق صيغة رمز OTP/توكن طويلة وتُستبدل حتى لو جاءت تحت مفتاح محايد. */
const SECRET_VALUE_PATTERNS: RegExp[] = [
  /^\d{6}$/, // رمز تحقق 6 أرقام
  /^Bearer\s+/i,
  /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/, // JWT
];

export const REDACTED = "[REDACTED]";

/**
 * يطهّر حقول بيانات الحدث:
 * - يحذف المفاتيح الحساسة (يستبدلها بعلامة حجب بدل تسريبها).
 * - يحجب القيم التي تشبه رموزًا/توكنات.
 * - يحدّ من عدد المفاتيح وطول النص.
 */
export function sanitizeAuditMetadata(
  input: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean | null> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string | number | boolean | null> = {};
  let kept = 0;
  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (kept >= 40) break;
    const key = rawKey.slice(0, 60);
    if (FORBIDDEN_METADATA_KEYS.test(key)) {
      out[key] = REDACTED;
      kept += 1;
      continue;
    }
    if (rawValue === null || rawValue === undefined) {
      out[key] = null;
    } else if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      out[key] = rawValue;
    } else {
      const value = String(rawValue).slice(0, 300);
      out[key] = SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value.trim()))
        ? REDACTED
        : value;
    }
    kept += 1;
  }
  return out;
}

/** يبني حدث تدقيق آمنًا جاهزًا للإرسال للبوابة. */
export function buildAuditEvent(input: {
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetName?: string | null;
  metadata?: Record<string, unknown>;
  now?: Date;
  id?: string;
}): AuditEvent {
  const now = input.now ?? new Date();
  return {
    id: input.id ?? `AUD-${now.getTime()}-${Math.random().toString(16).slice(2, 10)}`,
    occurredAt: now.toISOString(),
    actorId: input.actorId,
    actorName: input.actorName,
    actorDomain: "EMPLOYEE",
    action: input.action,
    targetType: input.targetType,
    targetId: String(input.targetId ?? "").slice(0, 120),
    targetName: input.targetName ? String(input.targetName).slice(0, 160) : null,
    metadata: sanitizeAuditMetadata(input.metadata),
  };
}

/**
 * يهرب خلية CSV ويمنع حقن الصيغ: أي خلية تبدأ بـ = + - @ أو حروف تحكم
 * تُسبق بعلامة اقتباس مفردة (حماية Excel / Google Sheets / LibreOffice).
 */
export function safeCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text.trimStart())) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** يحوّل أحداث التدقيق إلى نص CSV (صف عناوين + صفوف) آمن للحفظ/المشاركة. */
export function auditEventsToCsv(events: readonly AuditEvent[]): string {
  const headers = [
    "id",
    "occurred_at",
    "actor_id",
    "actor_name",
    "action",
    "target_type",
    "target_id",
    "target_name",
    "metadata_json",
  ];
  const lines = [headers.map(safeCsvCell).join(",")];
  for (const event of events) {
    lines.push(
      [
        event.id,
        event.occurredAt,
        event.actorId,
        event.actorName,
        event.action,
        event.targetType,
        event.targetId,
        event.targetName ?? "",
        JSON.stringify(sanitizeAuditMetadata(event.metadata)),
      ]
        .map(safeCsvCell)
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export const AUDIT_ACTION_LABELS_AR: Record<AuditAction, string> = {
  USER_CREATED: "إنشاء موظف",
  USER_ROLE_CHANGED: "تغيير دور موظف",
  USER_DISABLED: "تعطيل موظف",
  USER_REACTIVATED: "إعادة تفعيل موظف",
  USER_SUSPENDED: "إيقاف موظف مؤقتًا",
  OTP_REQUESTED: "طلب رمز تحقق",
  OTP_VERIFIED: "نجاح تحقق OTP",
  OTP_FAILED: "فشل تحقق OTP",
  PRODUCT_CREATED: "إنشاء منتج",
  PRODUCT_UPDATED: "تعديل منتج",
  PRODUCT_PUBLISHED: "نشر منتج",
  PRODUCT_UNPUBLISHED: "سحب منتج من النشر",
  PRODUCT_ARCHIVED: "أرشفة منتج",
  CATEGORY_CREATED: "إنشاء قسم",
  CATEGORY_UPDATED: "تعديل قسم",
  CATEGORY_REORDERED: "إعادة ترتيب الأقسام",
  INVENTORY_UPDATED: "تحديث مخزون",
  CONTENT_UPDATED: "تعديل محتوى",
  SETTING_UPDATED: "تعديل إعداد",
  CUSTOMER_VIEWED: "عرض عميل",
};
