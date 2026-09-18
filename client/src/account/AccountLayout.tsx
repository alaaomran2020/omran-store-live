/** هيكل منطقة حساب العميل — هيدر بسيط + تنقّل جانبي/علوي + حارس جلسة. */
import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Heart, LogOut, MapPin, Settings, Store, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeoMetadata } from "@/components/SeoMetadata";
import { useAccountSession } from "./AccountSession";
import { formatMobile } from "@shared/mobile";
import { LoadingState } from "@/admin/components/primitives";
import AccountLoginPage from "./AccountLoginPage";

const NAV = [
  { to: "/account/profile", label: "بياناتي", icon: User },
  { to: "/account/addresses", label: "العناوين", icon: MapPin },
  { to: "/account/wishlist", label: "المفضلة", icon: Heart },
  { to: "/account/vip", label: "برنامج VIP", icon: Crown },
  { to: "/account/settings", label: "الإعدادات", icon: Settings },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, session, logout } = useAccountSession();
  const [location, navigate] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  if (isLoading) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-brand-cream">
        <LoadingState label="جاري التحقق من الجلسة…" />
      </div>
    );
  }

  if (!isAuthenticated || !session?.authenticated) {
    // جلسة العميل لا تُجيز أي صفحة حساب — إعادة توجيه لتسجيل الدخول بالـOTP.
    return <AccountLoginPage />;
  }

  const customer = session.customer;

  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream">
      <SeoMetadata
        path={location}
        title="حسابي | عمران تويز"
        description="منطقة حساب العميل في عمران تويز."
        robots="noindex,nofollow"
      />
      <header className="border-b border-brand-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl font-black text-brand-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-blue text-white"><Store size={18} /></span>
            عمران تويز
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-bold text-brand-muted sm:block">
              {customer.fullName ?? "حسابي"} · {customer.mobile ? formatMobile(customer.mobile) : ""}
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand-border px-3 text-xs font-extrabold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              <LogOut size={15} /> خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="أقسام الحساب" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map(item => {
            const active = location === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-4 text-sm font-extrabold transition",
                  active ? "bg-brand-blue text-white shadow-sm" : "bg-white text-brand-navy hover:bg-brand-sky"
                )}
              >
                <Icon size={17} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <section>{children}</section>
      </div>
    </div>
  );
}
