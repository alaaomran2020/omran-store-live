import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  ChevronLeft,
  CircleGauge,
  FolderTree,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

export type AdminIdentity = { email?: string; name?: string; id?: string };

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const nav: NavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "الكتالوج",
    items: [
      { label: "المنتجات", href: "/admin/products", icon: Boxes },
      { label: "إضافة منتج", href: "/admin/product-intake", icon: PackagePlus },
      { label: "مراجعة المنتجات", href: "/admin/reviews", icon: Search },
      { label: "الأقسام", href: "/admin/categories", icon: FolderTree },
      { label: "البحث والفلاتر", href: "/admin/search", icon: Search },
    ],
  },
  {
    label: "المخزون",
    items: [
      { label: "حالة المخزون", href: "/admin/inventory", icon: Warehouse },
    ],
  },
  {
    label: "المبيعات والتواصل",
    items: [
      {
        label: "واتساب وLeads",
        href: "/admin/leads",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    label: "VIP",
    items: [
      { label: "VIP Dashboard", href: "/admin/vip", icon: HeartHandshake },
      { label: "عمليات VIP", href: "/admin/vip-operations", icon: Activity },
    ],
  },
  {
    label: "الموظفون",
    items: [
      { label: "الموظفون والصلاحيات", href: "/admin/staff", icon: Users },
    ],
  },
  {
    label: "التقارير",
    items: [
      {
        label: "Dashboard Analytics",
        href: "/admin/reports",
        icon: CircleGauge,
      },
    ],
  },
  {
    label: "النظام",
    items: [
      { label: "Activity Log", href: "/admin/activity", icon: Activity },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Diagnostics", href: "/admin/diagnostics", icon: ShieldCheck },
    ],
  },
];

const titles: Record<string, string> = {
  "/admin/dashboard": "لوحة المتابعة",
  "/admin/products": "المنتجات",
  "/admin/product-intake": "إضافة منتج",
  "/admin/reviews": "مراجعة المنتجات",
  "/admin/categories": "الأقسام",
  "/admin/search": "البحث والفلاتر",
  "/admin/inventory": "المخزون",
  "/admin/leads": "واتساب وLeads",
  "/admin/vip": "VIP Dashboard",
  "/admin/vip-operations": "عمليات VIP",
  "/admin/staff": "الموظفون والصلاحيات",
  "/admin/reports": "التقارير",
  "/admin/activity": "سجل النشاط",
  "/admin/settings": "الإعدادات",
  "/admin/diagnostics": "تشخيص النظام",
};

export function AdminLayout({
  identity,
  children,
}: {
  identity: AdminIdentity;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location]);
  const title = titles[location] || "لوحة الإدارة";
  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-l border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
        <img
          src="/brand/logo-256.png"
          alt="عمران تويز"
          className="h-11 w-11 rounded-xl bg-white object-contain p-1"
        />
        <div>
          <div className="font-black">شركة عمران التجارية</div>
          <div className="text-xs text-slate-500">Admin Operations</div>
        </div>
      </div>
      <nav
        aria-label="تنقل لوحة الإدارة"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {nav.map(group => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[11px] font-bold text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition",
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronLeft size={15} aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-950">
      <div className="fixed inset-y-0 right-0 z-30 hidden lg:block">
        {sidebar}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/70"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0">
            <button
              onClick={() => setOpen(false)}
              aria-label="إغلاق القائمة"
              className="absolute left-3 top-3 z-10 rounded-lg p-2 text-white"
            >
              <X />
            </button>
            {sidebar}
          </div>
        </div>
      )}
      <div className="lg:mr-72">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl border border-slate-200 p-2.5 lg:hidden"
              aria-label="فتح قائمة الإدارة"
            >
              <Menu />
            </button>
            <div>
              <p className="text-xs text-slate-500">لوحة الإدارة / {title}</p>
              <h1 className="text-lg font-black sm:text-xl">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-left sm:block">
              <p className="max-w-56 truncate text-sm font-bold" dir="ltr">
                {identity.email || identity.name || "موظف معتمد"}
              </p>
              <p className="text-xs text-emerald-700">جلسة Access نشطة</p>
            </div>
            <a
              href="/cdn-cgi/access/logout"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold hover:bg-slate-50"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={17} />
              <span className="hidden sm:inline">خروج</span>
            </a>
          </div>
        </header>
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="mx-auto max-w-[1500px] p-4 outline-none sm:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
