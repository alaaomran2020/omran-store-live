/** أدوات عرض مشتركة في لوحة الإدارة (عربية، صادقة، بلا افتراضات). */
import type { QaStatus, WorkflowStatus } from "@shared/products";
import type { AdminAvailability } from "@/lib/admin/adminCatalog";
import type { EmployeeStatus } from "@shared/rbac";
import { formatMobile, maskMobile } from "@shared/mobile";

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  PUBLISHED: "منشور",
  REVIEW: "تحت المراجعة",
  REJECTED: "مرفوض",
  DRAFT: "مسودة",
  ERROR: "خطأ",
};

export const QA_LABELS: Record<QaStatus, string> = {
  PASS: "اجتاز الجودة",
  NEEDS_REVIEW: "يحتاج مراجعة",
  FAIL: "راسب",
};

export const AVAILABILITY_LABELS: Record<AdminAvailability, string> = {
  available: "متوفر",
  unavailable: "نفد من المخزون",
  preorder: "طلب مسبق",
  unknown: "بلا بيانات مخزون",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  INVITED: "مدعوّ (بانتظار التفعيل)",
  ACTIVE: "نشط",
  SUSPENDED: "موقوف مؤقتًا",
  DISABLED: "معطّل",
};

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return "للاستفسار";
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(price)} ج.م`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `قبل ${diffHours} ساعة`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `قبل ${diffDays} يوم`;
  return formatDateTime(iso);
}

export { formatMobile, maskMobile };
