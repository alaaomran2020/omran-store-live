/**
 * OMRAN TOYS — نماذج الهوية للنطاقين المنفصلين:
 *   CUSTOMER  → هوية استهلاكية (عميل) — مسارات /account/*
 *   EMPLOYEE  → هوية عاملة بامتيازات (موظف) — مسارات /admin/*
 *
 * النطاقان يتشاركان البنية التحتية لـOTP لكنهما لا يتشاركان التفويض أبدًا:
 * جلسة العميل لا تُجيز أي مسار إداري، والعكس.
 *
 * مهم معماري: المتجر الحالي ثابت بالكامل (Cloudflare Pages بلا زمن تشغيل
 * خادمي). هذه الأنواع تعرّف عقد البيانات الذي يجب أن يطبّقه مزوّد الهوية
 * المستقبلي (Apps Script / Pages Function) — راجع docs/ADMIN-ACCOUNTS-ARCHITECTURE.md.
 */

import type { EmployeeRole, EmployeeStatus } from "./rbac";

export type IdentityDomain = "EMPLOYEE" | "CUSTOMER";

export type CustomerStatus =
  | "PENDING_PROFILE" // تحقق من الموبايل تم، بانتظار استكمال الاسم
  | "ACTIVE"
  | "SUSPENDED";

/** هوية موظف — لا يُنشأ ذاتيًا أبدًا؛ دعوة من OWNER/ADMIN ثم تحقق OTP. */
export type Employee = {
  employeeId: string;
  fullName: string;
  /** رقم الموبايل بصيغة E.164 الموحّدة (+201XXXXXXXXX). */
  mobile: string;
  /** بريد هوية Cloudflare Access إن وُجد (المصدر الحالي للمصادقة على الحافة). */
  accessEmail?: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  mobileVerifiedAt: string | null;
  invitedBy: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** الحد الأدنى لهوية العميل كما يوثّقها مزوّد الخدمة. */
export type Customer = {
  customerId: string;
  mobile: string;
  status: CustomerStatus;
  mobileVerifiedAt: string | null;
  fullName: string | null;
  email: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAddress = {
  addressId: string;
  label: string | null; // مثلاً: البيت / الشغل
  line1: string;
  line2?: string | null;
  city: string;
  district: string | null;
  notes: string | null;
  isDefault: boolean;
};

export type CustomerPreferences = {
  marketingWhatsapp: boolean;
  language: "ar";
};

/**
 * هوية الجلسة كما تُرجعها نقطة النهاية الآمنة (نظير get-identity).
 * الجلسة الفعلية شطيرة HttpOnly يصدرها الخادم؛ هذا الكائن للعرض فقط ولا
 * يُخزَّن في localStorage/sessionStorage ولا يُوثَّق من قيم يرسلها العميل.
 */
export type SessionIdentity =
  | {
      domain: "EMPLOYEE";
      subject: string;
      role: EmployeeRole;
      status: EmployeeStatus;
      fullName: string | null;
      email?: string | null;
      mobile?: string | null;
      issuedAt: string;
      expiresAt: string;
    }
  | {
      domain: "CUSTOMER";
      subject: string;
      status: CustomerStatus;
      fullName: string | null;
      maskedMobile: string;
      issuedAt: string;
      expiresAt: string;
    };

/** نتيجة فحص جلسة العميل من نقطة النهاية. */
export type CustomerSessionResult =
  | { authenticated: true; customer: Customer; addresses: CustomerAddress[] }
  | { authenticated: false; customer: null };
