import { MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { whatsappNumber } from "@/lib/productFormat";

export default function BrandHeader() {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const isPopup = pathname.startsWith("/popup");
  const number = whatsappNumber();
  const whatsappMessage = isPopup
    ? "مرحبًا، أريد الاستفسار عن منتجات POP UP للهدايا والبالونات."
    : "مرحبًا، أريد الاستفسار عن منتجات عمران تويز.";
  const whatsappUrl = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage)}`
    : null;
  const navClass = (active: boolean, popup = false) => `min-h-11 items-center rounded-xl px-3 transition ${
    active
      ? popup ? "bg-[#f7effb] text-[#542170]" : "bg-brand-sky text-brand-blue"
      : popup ? "text-[#6b278f] hover:bg-[#f7effb] hover:text-[#542170]" : "text-brand-navy hover:bg-brand-sky hover:text-brand-blue"
  }`;

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border/80 bg-white/95 pt-[env(safe-area-inset-top)] shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="container flex flex-col items-stretch gap-2 py-2.5 sm:min-h-[92px] sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <a href="/" className="group flex min-w-0 items-center gap-3 sm:gap-4" aria-label="عمران تويز - الصفحة الرئيسية">
          <span className="relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-white shadow-md ring-1 ring-black/[0.02] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg sm:h-[68px] sm:w-[68px]">
            <img
              src="/brand/logo.png"
              alt="لوجو عمران تويز"
              width="512"
              height="512"
              className="h-full w-full object-contain p-1.5"
              loading="eager"
              decoding="async"
            />
          </span>

          <span className="min-w-0">
            <span className="block whitespace-nowrap text-xl font-black leading-tight tracking-[-0.03em] text-brand-navy sm:text-3xl">
              عمران تويز
            </span>
            <span className="mt-1 block text-[11px] font-bold tracking-wide text-brand-muted sm:text-sm">
              شركة عمران التجارية
            </span>
          </span>
        </a>

        <nav className="flex w-full shrink-0 items-center justify-between gap-1 border-t border-brand-border/70 pt-2 text-xs font-bold sm:w-auto sm:justify-start sm:border-0 sm:pt-0 sm:text-sm" aria-label="أقسام المتجر">
          <a
            href="/products"
            className={`inline-flex ${navClass(pathname === "/products")}`}
            aria-current={pathname === "/products" ? "page" : undefined}
          >
            لعب الأطفال
          </a>
          <a
            href="/popup"
            className={`inline-flex ${navClass(isPopup, true)} font-black`}
            aria-current={isPopup ? "page" : undefined}
          >
            POP UP
          </a>
          <a href="/rewards" aria-current={pathname === "/rewards" ? "page" : undefined} className={`hidden lg:inline-flex ${navClass(pathname === "/rewards")}`}>مميزات عمران</a>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackEvent("whatsapp_click", {
                  cta_location: "brand_header",
                  page_location: window.location.href,
                })
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-whatsapp px-3.5 py-2.5 text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-whatsapp-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp-hover sm:px-4"
            >
              <MessageCircle size={18} aria-hidden="true" />
              <span className="hidden sm:inline">واتساب</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
