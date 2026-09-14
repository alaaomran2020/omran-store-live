import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FolderTree,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Settings,
  ShieldCheck,
  ScrollText,
  Users,
  Warehouse,
  FileBarChart,
  Camera,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@shared/rbac";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
};

/** التنقّل الأساسي للوحة الإدارة — يُفلتر مركزيًا حسب صلاحيات الموظف. */
export const ADMIN_NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, permission: "dashboard:view" },
  { to: "/admin/products", label: "المنتجات", icon: Package, permission: "product:view" },
  { to: "/admin/categories", label: "الأقسام", icon: FolderTree, permission: "category:view" },
  { to: "/admin/inventory", label: "المخزون", icon: Warehouse, permission: "inventory:view" },
  { to: "/admin/content", label: "المحتوى", icon: MessagesSquare, permission: "content:view" },
  { to: "/admin/whatsapp", label: "واتساب", icon: MessagesSquare, permission: "whatsapp:view" },
  { to: "/admin/quality", label: "مركز الجودة", icon: ClipboardCheck, permission: "quality:view" },
  { to: "/admin/reports", label: "التقارير", icon: FileBarChart, permission: "analytics:view" },
  { to: "/admin/customers", label: "العملاء", icon: Users, permission: "customer:view" },
  { to: "/admin/users", label: "الموظفون", icon: ShieldCheck, permission: "user:view" },
  { to: "/admin/audit-log", label: "سجل التدقيق", icon: ScrollText, permission: "audit:view" },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings, permission: "settings:view" },
];

/** أدوات تشغيلية قائمة بالفعل قبل إعادة الهيكلة — تبقى كما هي داخل الهيكل. */
export const LEGACY_NAV: NavItem[] = [
  { to: "/admin/product-intake", label: "إدخال منتج بالصورة", icon: Camera, permission: "product:view" },
  { to: "/admin/vip-operations", label: "عمليات VIP اليدوية", icon: CreditCard, permission: "dashboard:view" },
];

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: "العمليات", items: ADMIN_NAV.slice(0, 8) },
  { title: "الحسابات والأمان", items: ADMIN_NAV.slice(8) },
  { title: "أدوات تشغيلية", items: LEGACY_NAV },
];

// أيقائنات مُعاد تصديرها لاستخدام الصفحات دون استيراد مباشر.
export const NAV_ICONS = {
  BarChart3,
  Boxes,
};
