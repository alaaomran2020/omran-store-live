/**
 * client/src/admin/AdminApp.tsx — التطبيق الإداري المستقل (يُركَّب على /admin).
 *
 * "Route Protection" في الواجهة: يفحص الجلسة عبر GET /api/admin/auth/me قبل
 * رسم أي شاشة، ويحوّل غير المصادَقين لشاشة الدخول. هذا حارس UX — الحماية
 * الحقيقية محصورة في الخادم (server/adminRoutes.ts) لأن أي طلب بلا جلسة
 * صالحة يُرفض بـ 401 قبل لمس قاعدة البيانات.
 *
 * التوجيه عبر wouter (مسارات حقيقية):
 *   /admin/login            شاشة الدخول عبر واتساب
 *   /admin/products         قائمة المنتجات
 *   /admin/products/:id     تعديل منتج (الصلاحيات المحدودة)
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { AdminInfo } from "@/lib/adminApi";
import { fetchMe, logout as apiLogout } from "@/lib/adminApi";
import AdminLoginPage from "./AdminLoginPage";
import AdminProductsPage from "./AdminProductsPage";
import EditProductPage from "./EditProductPage";
import { RoleBadge, Spinner } from "./ui";

type Session = { admin: AdminInfo | null; booted: boolean };

const AdminSessionContext = createContext<{
  session: Session;
  refreshSession: () => Promise<AdminInfo | null>;
  doLogout: () => Promise<void>;
  navigate: (to: string) => void;
} | null>(null);

export const useAdminSession = () => {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error("useAdminSession must be used inside AdminApp");
  return ctx;
};

export default function AdminApp() {
  const [location, setLocation] = useLocation();
  const [session, setSession] = useState<Session>({ admin: null, booted: false });

  // فحص الجلسة عند الإقلاع (الكوكي HttpOnly يُفحص خادميًا)
  useEffect(() => {
    let alive = true;
    fetchMe()
      .then(data => alive && setSession({ admin: data.admin, booted: true }))
      .catch(() => alive && setSession({ admin: null, booted: true }));
    return () => {
      alive = false;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const data = await fetchMe();
      setSession({ admin: data.admin, booted: true });
      return data.admin;
    } catch {
      setSession({ admin: null, booted: true });
      return null;
    }
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // الجلسة منتهية أصلًا
    }
    setSession({ admin: null, booted: true });
    setLocation("/admin/login");
  }, [setLocation]);

  const navigate = useCallback(
    (to: string) => setLocation(to),
    [setLocation]
  );

  const isLoginPage = location === "/admin/login" || location === "/admin/login/";
  const authenticated = !!session.admin;

  let screen: React.ReactNode;
  if (!session.booted) {
    screen = <BootScreen />;
  } else if (isLoginPage) {
    screen = <AdminLoginPage session={session} onLoggedIn={refreshSession} navigate={navigate} />;
  } else if (!authenticated) {
    screen = <DeniedScreen navigate={navigate} />;
  } else if (location === "/admin/products" || location === "/admin/products/") {
    screen = <AdminProductsPage navigate={navigate} />;
  } else if (/^\/admin\/products\/[^/]+\/?$/.test(location)) {
    const id = decodeURIComponent(location.replace(/\/$/, "").split("/").pop() ?? "");
    screen = <EditProductPage id={id} navigate={navigate} />;
  } else {
    screen = <NotFoundScreen navigate={navigate} />;
  }

  return (
    <AdminSessionContext.Provider value={{ session, refreshSession, doLogout, navigate }}>
      <div dir="rtl" className="min-h-screen bg-slate-950 font-sans text-slate-200">
        {/* شبكة Brutalist خلفية */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="relative">
          {!isLoginPage && authenticated ? (
            <AdminShell>{screen}</AdminShell>
          ) : (
            screen
          )}
        </div>
      </div>
    </AdminSessionContext.Provider>
  );
}

// --------------------------- الهيكل (Shell) ---------------------------

function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, doLogout, navigate } = useAdminSession();
  const admin = session.admin;
  const isLimited = admin?.role === "limited_admin";
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* الشريط العلوي */}
      <header className="border-b-2 border-ink-deep bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="border-2 border-ink-deep bg-electric px-2.5 py-1.5 font-mono text-xs font-black tracking-widest text-white">
              OM/ADMIN
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-black text-slate-100">مركز تحكم متجر عمران</div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase">
                WhatsApp Auth · MySQL · Edge
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="text-xs font-bold text-slate-200">{admin?.fullName}</div>
              <div className="font-mono text-[10px] tracking-widest text-slate-500" dir="ltr">
                {admin?.phone}
              </div>
            </div>
            {admin ? <RoleBadge role={admin.role} /> : null}
            <button
              onClick={doLogout}
              className="rounded-none border-2 border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-red-500 hover:text-red-400"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* شريط تنقل مقصود بقوة: المنتجات فقط للدور المحدود */}
      <nav className="border-b-2 border-ink-deep bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
          <NavLink active={location === "/admin/products"} onClick={() => navigate("/admin/products")}>
            المنتجات
          </NavLink>
          <span className="mx-1 font-mono text-slate-700">|</span>
          <span className="inline-flex cursor-not-allowed items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 line-through">
            الطلبات
          </span>
          <span className="inline-flex cursor-not-allowed items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 line-through">
            الإعدادات
          </span>
          <span className="mr-auto font-mono text-[10px] tracking-widest text-slate-600 uppercase">
            {isLimited ? "الأقسام الأخرى مقفلة لدورك — الإنفاذ على الخادم" : "مدير عام — كل الصلاحيات"}
          </span>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t-2 border-ink-deep bg-slate-900 py-4 text-center font-mono text-[10px] tracking-[0.3em] text-slate-600 uppercase">
        Zero-Password Auth · WhatsApp OTP
      </footer>
    </div>
  );
}

function NavLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-2 px-3 py-1.5 text-xs font-black transition-colors ${
        active
          ? "border-electric bg-electric text-white"
          : "border-transparent text-slate-400 hover:text-electric-soft"
      }`}
    >
      {children}
    </button>
  );
}

// --------------------------- شاشات النظام ---------------------------

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="OM/ADMIN — جارٍ التحقق…" />
    </div>
  );
}

function DeniedScreen({ navigate }: { navigate: (to: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => navigate("/admin/login"), 1200);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md border-2 border-red-600 bg-slate-900 p-8 text-center shadow-[4px_4px_0_0_#050A18]">
        <div className="font-mono text-[10px] tracking-[0.3em] text-red-400 uppercase">
          401 — Unauthorized
        </div>
        <div className="mt-3 text-lg font-black text-slate-100">الجلسة غير صالحة</div>
        <p className="mt-2 text-sm text-slate-400">
          يُجري النظام تحويلك إلى تسجيل الدخول عبر واتساب…
        </p>
      </div>
    </div>
  );
}

function NotFoundScreen({ navigate }: { navigate: (to: string) => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md border-2 border-ink-deep bg-slate-900 p-8 text-center shadow-[4px_4px_0_0_#050A18]">
        <div className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase">404</div>
        <div className="mt-3 text-lg font-black text-slate-100">هذه الشاشة غير موجودة</div>
        <button
          onClick={() => navigate("/admin/products")}
          className="mt-4 border-2 border-electric px-4 py-2 text-xs font-black text-electric transition-colors hover:bg-electric hover:text-white"
        >
          العودة للمنتجات
        </button>
      </div>
    </div>
  );
}
