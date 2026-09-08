import { MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { whatsappNumber } from "@/lib/productFormat";

const whatsappUrl = (() => {
  const number = whatsappNumber();
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات شركة عمران التجارية.")}`;
})();

export default function BrandHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-border/80 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="container flex min-h-[76px] items-center justify-between gap-3 py-2 sm:min-h-[88px] sm:gap-5">
        <a href="/" className="group flex min-w-0 items-center gap-3 sm:gap-4" aria-label="شركة عمران التجارية - الصفحة الرئيسية">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm ring-1 ring-black/[0.02] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md sm:h-16 sm:w-16">
            <img
              src="/brand/logo.png"
              alt="لوجو عمران"
              className="h-full w-full object-contain p-1.5"
              loading="eager"
              decoding="async"
            />
          </span>

          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[13px] font-black leading-tight tracking-[-0.02em] text-brand-navy min-[390px]:text-sm sm:text-2xl sm:tracking-tight">
              شركة عمران التجارية
            </span>
            <span className="mt-1 block text-[11px] font-bold tracking-wide text-brand-muted sm:text-sm">
              لعب أطفال - هدايا
            </span>
          </span>
        </a>

        <nav className="flex shrink-0 items-center gap-1 text-xs font-bold sm:gap-2 sm:text-sm" aria-label="أقسام المتجر">
          <a
            href="/products"
            className="hidden min-h-11 items-center rounded-xl px-3 text-brand-navy transition hover:bg-brand-sky hover:text-brand-blue sm:inline-flex"
          >
            لعب الأطفال
          </a>
          <a
            href="/popup"
            className="inline-flex min-h-11 items-center rounded-xl px-3 font-black text-[#6b278f] transition hover:bg-[#f7effb] hover:text-[#542170]"
          >
            POP UP
          </a>
          <a href="/videos" className="hidden min-h-11 items-center rounded-xl px-3 text-brand-navy transition hover:bg-brand-sky hover:text-brand-blue lg:inline-flex">الفيديوهات</a>
          <a href="/rewards" className="hidden min-h-11 items-center rounded-xl px-3 text-brand-navy transition hover:bg-brand-sky hover:text-brand-blue lg:inline-flex">نقاط عمران</a>
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
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-whatsapp px-3.5 py-2.5 text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-whatsapp-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/20 sm:px-4"
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
