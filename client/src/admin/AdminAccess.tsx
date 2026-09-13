import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { SeoMetadata } from "@/components/SeoMetadata";
import { BrutalCard, Notice, PageTitle } from "@/admin/ui";
import { AdminLayout } from "@/admin/AdminLayout";
import AdminDashboard from "@/admin/AdminDashboard";
import AdminProducts from "@/admin/AdminProducts";
import AdminCategories from "@/admin/AdminCategories";
import AdminInventory from "@/admin/AdminInventory";
import AdminEmptyPage from "@/admin/AdminEmptyPage";
import AdminVipDashboard from "@/admin/AdminVipDashboard";
import AdminDiagnostics from "@/admin/AdminDiagnostics";
import ProductIntake from "@/pages/ProductIntake";
import VipOperations from "@/pages/VipOperations";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

type AccessIdentity = {
  email?: string;
  name?: string;
  id?: string;
};

type AccessState = "checking" | "allowed" | "denied";

const IDENTITY_URL = "/cdn-cgi/access/get-identity";
export async function readAccessIdentity(): Promise<AccessIdentity | null> {
  try {
    const response = await fetch(IDENTITY_URL, {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) return null;

    const data = (await response
      .json()
      .catch(() => null)) as AccessIdentity | null;
    if (!data || (!data.email && !data.name && !data.id)) return null;
    return data;
  } catch {
    return null;
  }
}

export default function AdminAccess() {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [identity, setIdentity] = useState<AccessIdentity | null>(null);
  const [location, navigate] = useLocation();
  const currentPath = location.replace(/\/$/, "") || "/admin";

  useEffect(() => {
    let cancelled = false;

    readAccessIdentity().then(result => {
      if (cancelled) return;
      setIdentity(result);
      setAccessState(result ? "allowed" : "denied");
      if (
        result &&
        (window.location.pathname === "/admin" ||
          window.location.pathname === "/admin/")
      ) {
        navigate("/admin/dashboard", { replace: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (accessState === "allowed" && identity) {
    const content = (() => {
      switch (currentPath) {
        case "/admin/dashboard":
          return <AdminDashboard />;
        case "/admin/products":
          return <AdminProducts />;
        case "/admin/product-intake":
          return <ProductIntake />;
        case "/admin/categories":
          return <AdminCategories />;
        case "/admin/inventory":
          return <AdminInventory />;
        case "/admin/vip":
          return <AdminVipDashboard />;
        case "/admin/vip-operations":
          return <VipOperations />;
        case "/admin/diagnostics":
          return <AdminDiagnostics />;
        default:
          return <AdminEmptyPage path={currentPath} />;
      }
    })();
    return (
      <>
        <SeoMetadata
          path={currentPath}
          title="لوحة الإدارة | شركة عمران التجارية"
          description="لوحة عمليات شركة عمران التجارية — وصول الموظفين المعتمدين فقط."
          robots="noindex,nofollow"
        />
        <AdminLayout identity={identity}>{content}</AdminLayout>
      </>
    );
  }

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100"
    >
      {/* لوحة الإدارة خلف Cloudflare Access — noindex إضافية (defense in depth). */}
      <SeoMetadata
        path="/admin"
        title="لوحة الإدارة | شركة عمران التجارية"
        description="لوحة عمليات شركة عمران التجارية — وصول الموظفين المعتمدين فقط."
        robots="noindex,nofollow"
      />
      <div className="mx-auto max-w-xl">
        <PageTitle
          title="لوحة الإدارة محمية"
          subtitle="شركة عمران التجارية — وصول الموظفين المعتمدين فقط"
        />

        {accessState === "checking" ? (
          <BrutalCard className="p-5">
            <Notice kind="info">
              جاري التحقق من جلسة Cloudflare Access...
            </Notice>
          </BrutalCard>
        ) : (
          <>
            <Notice kind="warn" className="mb-5">
              تم رفض الوصول افتراضيًا. لوحة الإدارة لا تقبل كلمات مرور مخزنة
              داخل الواجهة ولا أي جلسة محلية قابلة للتزوير.
            </Notice>

            <BrutalCard className="p-5">
              <div className="mb-5 flex items-start gap-3 border-2 border-emerald-800 bg-emerald-950/40 p-4">
                <ShieldCheck
                  className="mt-0.5 shrink-0 text-emerald-300"
                  size={22}
                />
                <div>
                  <h2 className="font-black">المصادقة عبر Cloudflare Access</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    إذا كنت موظفًا معتمدًا، افتح رابط الإدارة من جديد وسجّل
                    الدخول من صفحة Cloudflare Access. الموافقة على الموظفين تتم
                    خارج المتصفح وعلى مستوى الدومين.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <a
                  href="/vip/staff-register"
                  className="inline-flex items-center gap-2 border-2 border-sunbeam-hover bg-sunbeam px-4 py-2 text-sm font-black text-sunbeam-ink shadow-[3px_3px_0_0_#050A18] transition-colors hover:bg-sunbeam-hover"
                >
                  <MessageCircle size={17} /> تسجيل موظف جديد عبر واتساب
                </a>
              </div>
            </BrutalCard>
          </>
        )}
      </div>
    </main>
  );
}
