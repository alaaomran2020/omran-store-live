import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LogOut, MessageCircle, ShieldCheck } from "lucide-react";
import { SeoMetadata } from "@/components/SeoMetadata";
import { BrutalCard, Notice, PageTitle } from "@/admin/ui";
import AdminApp from "@/admin/AdminApp";
import type { CloudflareIdentity } from "@/admin/AdminIdentity";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

type AccessState = "checking" | "allowed" | "denied";

const IDENTITY_URL = "/cdn-cgi/access/get-identity";
const LOGOUT_URL = "/cdn-cgi/access/logout";

export async function readAccessIdentity(): Promise<CloudflareIdentity | null> {
  try {
    const response = await fetch(IDENTITY_URL, {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) return null;

    const data = (await response
      .json()
      .catch(() => null)) as CloudflareIdentity | null;
    if (!data || (!data.email && !data.name && !data.id)) return null;
    return data;
  } catch {
    return null;
  }
}

export default function AdminAccess() {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [identity, setIdentity] = useState<CloudflareIdentity | null>(null);
  const [, navigate] = useLocation();

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
    return (
      <>
        {/* لوحة الإدارة خلف Cloudflare Access — noindex إضافية (defense in depth). */}
        <SeoMetadata
          path="/admin"
          title="لوحة الإدارة | شركة عمران التجارية"
          description="لوحة عمليات شركة عمران التجارية — وصول الموظفين المعتمدين فقط."
          robots="noindex,nofollow"
        />
        <AdminApp identity={identity} />
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
            <div role="status" aria-live="polite" aria-label="جاري التحقق من جلسة الإدارة" className="space-y-3">
              <div className="h-5 w-44 animate-pulse rounded-full bg-slate-700 motion-reduce:animate-none" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-900 motion-reduce:animate-none" />
              <span className="sr-only">جاري التحقق من جلسة الإدارة...</span>
            </div>
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

              <div className="flex flex-wrap gap-3">
                <a
                  href={LOGOUT_URL}
                  className="inline-flex items-center gap-2 border-2 border-slate-700 bg-slate-950 px-4 py-2 text-xs font-black text-slate-100"
                >
                  <LogOut size={15} /> إعادة فحص الجلسة
                </a>
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
