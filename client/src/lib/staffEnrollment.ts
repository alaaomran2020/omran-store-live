export type StaffRequestedRole = "CARD_ISSUER" | "BRANCH_STAFF" | "PARTNER_MANAGER" | "SUPPORT" | "REVIEWER";

const roleLabels: Record<StaffRequestedRole, string> = {
  CARD_ISSUER: "إصدار وتفعيل الكروت",
  BRANCH_STAFF: "موظف فرع وتسجيل الخصومات",
  PARTNER_MANAGER: "مسؤول الشركاء",
  SUPPORT: "دعم العملاء والشكاوى",
  REVIEWER: "مراجع",
};

export function normalizeEgyptianMobile(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^1(?:0|1|2|5)\d{8}$/.test(digits) ? `+20${digits}` : null;
}

export function createStaffRequestCode(bytes?: Uint8Array): string {
  const random = bytes ?? crypto.getRandomValues(new Uint8Array(4));
  return `OVS-${Array.from(random, byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function buildStaffEnrollmentWhatsAppUrl(input: {
  destination: string;
  displayName: string;
  identityEmail: string;
  mobile: string;
  whatsapp?: string;
  requestedRole: StaffRequestedRole;
  requestCode?: string;
}): { url: string; requestCode: string } | null {
  const destination = input.destination.replace(/\D/g, "");
  const mobile = normalizeEgyptianMobile(input.mobile);
  const whatsapp = normalizeEgyptianMobile(input.whatsapp || input.mobile);
  const displayName = input.displayName.trim();
  const identityEmail = input.identityEmail.trim().toLowerCase();
  if (!destination || !mobile || !whatsapp || displayName.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identityEmail)) return null;
  const requestCode = input.requestCode ?? createStaffRequestCode();
  const message = [
    "طلب تفعيل موظف — Omran VIP",
    `كود الطلب: ${requestCode}`,
    `الاسم: ${displayName}`,
    `هوية الدخول: ${identityEmail}`,
    `الموبايل: ${mobile}`,
    `واتساب الموظف: ${whatsapp}`,
    `الدور المطلوب: ${roleLabels[input.requestedRole]} (${input.requestedRole})`,
    "أنا أرسل الرسالة من رقم واتسابي وأطلب تسجيل الطلب للمراجعة.",
    "الحالة: PENDING — لا توجد صلاحية قبل اعتماد المدير وإضافة الهوية إلى Cloudflare Access.",
  ].join("\n");
  return { url: `https://wa.me/${destination}?text=${encodeURIComponent(message)}`, requestCode };
}
