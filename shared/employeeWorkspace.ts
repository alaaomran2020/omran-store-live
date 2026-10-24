/**
 * عناصر مساحة العمل حسب صلاحيات المستخدم الفعلية.
 * الهوية والدور من Cloudflare Access + دليل الموظفين المعتمد.
 * لا تُعتبر هذه الفلاتر بديلًا للتحقق الخادمي لكل API.
 */
import { can, type EmployeeRole, type Permission, type Principal } from "./rbac";

export type WorkspaceShortcut = {
  label: string;
  description: string;
  href: string;
  permission: Permission;
};

const SHORTCUTS: readonly WorkspaceShortcut[] = [
  { label: "لوحة التشغيل", description: "نظرة على حالة المتجر ومصادر البيانات.", href: "/admin/dashboard", permission: "dashboard:view" },
  { label: "المنتجات", description: "استعراض وبحث في أصناف المتجر.", href: "/admin/products", permission: "product:view" },
  { label: "المخزن", description: "حالة الأصناف والمخزون بحسب صلاحياتك.", href: "/admin/inventory", permission: "inventory:view" },
  { label: "التقارير", description: "تقارير المتجر المتاحة لدورك، وليست أرقامًا شخصية.", href: "/admin/reports", permission: "analytics:view" },
  { label: "العملاء", description: "قائمة العملاء إذا كانت بوابة البيانات متصلة.", href: "/admin/customers", permission: "customer:view" },
  { label: "واتساب", description: "متابعة أداء قناة واتساب عندما تكون البيانات متاحة.", href: "/admin/whatsapp", permission: "whatsapp:view" },
  { label: "الأقسام", description: "مراجعة تصنيفات المنتجات.", href: "/admin/categories", permission: "category:view" },
  { label: "المحتوى", description: "الصفحات والمحتوى التسويقي.", href: "/admin/content", permission: "content:view" },
  { label: "جودة الكتالوج", description: "مراجعة بيانات وصور المنتجات.", href: "/admin/quality", permission: "quality:view" },
  { label: "إدارة الموظفين", description: "إضافة الموظفين والتحكم في الوصول — للمالك فقط.", href: "/admin/users", permission: "user:create" },
  { label: "الإعدادات", description: "حالة اتصال مصادر المتجر والإدارة.", href: "/admin/settings", permission: "settings:view" },
  { label: "سجل التدقيق", description: "الأحداث المتاحة للمراجعة.", href: "/admin/audit-log", permission: "audit:view" },
];

export const WORKSPACE_INTRO: Record<EmployeeRole, string> = {
  OWNER: "مساحة إدارة المتجر ومتابعة الأقسام وإدارة حسابات الموظفين.",
  ADMIN: "مساحة التشغيل حسب الصلاحيات؛ إضافة الموظفين متاحة للملاك فقط.",
  SALES_WAREHOUSE_MANAGER: "مساحة المبيعات والمخزن: متابعة العملاء والتقارير وحالة المخزون وتحديثه عبر البوابة عند تفعيلها.",
  SALES_MANAGER: "مساحة متابعة المبيعات والعملاء والتقارير، دون تعديل المخزون أو صلاحيات الحسابات.",
  CASHIER: "مساحة عرض المنتجات والمخزون للكاشير. البيع والتحصيل الفعلي يحتاجان ربط نظام كاشير آمن.",
  CATALOG_MANAGER: "مساحة إدارة الأصناف والتصنيفات والجودة.",
  INVENTORY_STAFF: "مساحة المخزن وتحديثاته المعتمدة.",
  CONTENT_EDITOR: "مساحة المحتوى والتصميمات التسويقية.",
  VIEWER: "مساحة العرض فقط، دون تعديلات.",
};

export function workspaceShortcuts(principal: Principal | null | undefined): WorkspaceShortcut[] {
  return SHORTCUTS.filter(shortcut => can(principal, shortcut.permission));
}
