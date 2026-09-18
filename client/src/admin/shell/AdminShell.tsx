/**
 * هيكل لوحة الإدارة: شريط جانبي قابل للطي (درج على الموبايل) + رأس ثابت +
 * منطقة محتوى. كل العناصر حسّاسة للصلاحيات عبر PermissionGate المركزي.
 */
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS_AR, type Permission } from "@shared/rbac";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { NAV_SECTIONS, type NavItem } from "./nav";

const LOGOUT_URL = "/cdn-cgi/access/logout";

function relPath(to: string): string {
  return to.replace(/^\/admin/, "") || "/";
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const [location] = useLocation();
  const href = relPath(item.to);
  const active =
    href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25",
        active
          ? "bg-brand-blue text-white shadow-sm"
          : "text-brand-navy hover:bg-brand-sky hover:text-brand-blue"
      )}
    >
      <Icon size={18} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAdminIdentity();
  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5" aria-label="أقسام لوحة الإدارة">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-xl px-2 pb-2 pt-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white">
          <Store size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-brand-ink">عمران تويز</span>
          <span className="block truncate text-[11px] font-bold text-brand-muted">لوحة الإدارة</span>
        </span>
      </Link>

      {NAV_SECTIONS.map(section => {
        const items = section.items.filter(item => can(item.permission as Permission));
        if (items.length === 0) return null;
        return (
          <div key={section.title} className="space-y-1">
            <p className="px-3.5 pb-1 text-[10px] font-black uppercase tracking-wider text-brand-disabled">
              {section.title}
            </p>
            {items.map(item => (
              <NavLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function IdentityChip() {
  const { resolved } = useAdminIdentity();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-sky text-sm font-black text-brand-blue">
        {(resolved.fullName || "م").trim().charAt(0)}
      </span>
      <span className="hidden min-w-0 flex-col md:flex">
        <span className="max-w-[180px] truncate text-xs font-extrabold text-brand-ink">
          {resolved.fullName}
        </span>
        <span className="text-[10px] font-bold text-brand-muted">
          {ROLE_LABELS_AR[resolved.role]}
        </span>
      </span>
    </div>
  );
}

export function AdminShell({
  children,
  headerActions,
  lastUpdated,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  lastUpdated?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      {/* شريط جانبي - ديسكتوب */}
      <aside className="fixed inset-y-0 end-0 z-30 hidden w-72 border-s border-brand-border bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* درج الموبايل */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="قائمة لوحة الإدارة">
          <button
            type="button"
            className="absolute inset-0 bg-brand-ink/40 backdrop-blur-[1px]"
            aria-label="إغلاق القائمة"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 end-0 w-80 max-w-[85vw] border-s border-brand-border bg-white shadow-xl">
            <button
              type="button"
              className="absolute start-3 top-4 grid min-h-11 min-w-11 place-items-center rounded-lg text-brand-muted hover:bg-brand-cream"
              aria-label="إغلاق"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pe-72">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-brand-border bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-brand-navy hover:bg-brand-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 lg:hidden"
            aria-label="فتح القائمة"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="min-w-0">{headerActions}</div>
            <div className="flex items-center gap-2 sm:gap-3">
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3 text-xs font-extrabold text-brand-navy transition hover:bg-brand-sky disabled:opacity-50"
                  title="تحديث البيانات"
                >
                  <RefreshIcon spinning={Boolean(refreshing)} />
                  <span className="hidden sm:inline">تحديث</span>
                </button>
              ) : null}
              <IdentityChip />
              <a
                href={LOGOUT_URL}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand-border px-3 text-xs font-extrabold text-red-700 transition hover:border-red-200 hover:bg-red-50"
              >
                <LogOut size={15} aria-hidden="true" />
                <span className="hidden sm:inline">خروج</span>
              </a>
            </div>
          </div>
        </header>

        {lastUpdated ? (
          <div className="border-b border-brand-border bg-brand-sky/60 px-4 py-1.5 text-[11px] font-bold text-brand-navy sm:px-6">
            آخر تحديث للبيانات: {lastUpdated}
          </div>
        ) : null}

        <main id="main-admin" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(spinning && "animate-spin")}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
