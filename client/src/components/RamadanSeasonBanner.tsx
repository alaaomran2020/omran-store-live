import { ArrowLeft, MoonStar, Sparkles, Star } from "lucide-react";

const RAMADAN_URL = "/products?category=ramadan-lanterns#feed";

/** A small seasonal accent, never a modal, pop-up or cover over the navigation. */
export function RamadanSeasonRibbon() {
  return (
    <div dir="rtl" className="ramadan-ribbon border-b border-[#d8b76f]/30 bg-[#122945] text-[#fff1cd]">
      <div className="container flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[11px] font-bold sm:text-sm">
        <MoonStar size={17} className="shrink-0 text-[#f3d68b]" aria-hidden="true" />
        <span>أجواء رمضان أحلى مع عمران — مفارش، خداديات وزينة للبيت</span>
        <a
          href={RAMADAN_URL}
          className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-[#ffdd83] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          شوف مجموعة رمضان <ArrowLeft size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

/** The visuals use actual approved owner-supplied catalog photographs. */
export function RamadanSeasonBanner({ compact = false }: { compact?: boolean }) {
  return (
    <section
      dir="rtl"
      aria-labelledby={compact ? "ramadan-category-title" : "ramadan-home-title"}
      data-ramadan-season
      className={`overflow-hidden bg-[#faf5e9] ${compact ? "pb-7 sm:pb-11" : "border-b border-[#e5d9be] py-7 sm:py-11"}`}
    >
      <div className="container">
        <div className={`ramadan-season-panel relative isolate overflow-hidden rounded-[1.75rem] bg-[linear-gradient(120deg,#102c47_0%,#173d53_58%,#2d504c_100%)] text-white shadow-[0_16px_46px_rgba(16,44,71,.18)] ${compact ? "px-5 py-6 sm:px-9 sm:py-8" : "px-5 py-7 sm:px-9 sm:py-9 lg:px-12 lg:py-11"}`}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_16%_25%,rgba(246,215,147,.22)_0_2px,transparent_3px),radial-gradient(circle_at_81%_77%,rgba(246,215,147,.24)_0_2px,transparent_3px)] [background-size:105px_90px]" />
          <MoonStar aria-hidden="true" className="pointer-events-none absolute -start-6 -top-9 h-36 w-36 rotate-[-14deg] text-[#ddbf76]/[.11] sm:h-52 sm:w-52" strokeWidth={1.15} />
          <Star aria-hidden="true" className="pointer-events-none absolute bottom-4 start-[48%] h-7 w-7 text-[#f1cd7e]/35" strokeWidth={1.3} />
          <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[1fr_.84fr] lg:gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#efcf83]/35 bg-white/10 px-3 py-2 text-xs font-bold text-[#f5dca5] sm:text-sm">
                <Sparkles size={15} aria-hidden="true" /> مجموعة رمضان من شركة عمران التجارية
              </span>
              <h2
                id={compact ? "ramadan-category-title" : "ramadan-home-title"}
                className={`mt-4 font-black leading-[1.32] text-white ${compact ? "text-[1.7rem] sm:text-4xl" : "text-[2rem] sm:text-[2.75rem]"}`}
              >
                زينة رمضان وتفاصيل تفرّح البيت
              </h2>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-8 text-[#e8ede9] sm:text-base">
                اختار من المفارش والرانرات والخداديات والمعلقات الرمضانية. شوف صور المنتج واستفسر عن السعر والمقاسات والتوفر على واتساب.
              </p>
              <a
                href={RAMADAN_URL}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f5d48c] px-5 py-3 text-sm font-black text-[#163049] shadow-lg transition hover:bg-[#ffe5aa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                {compact ? "عرض منتجات رمضان" : "تصفح مجموعة رمضان"}
                <ArrowLeft size={17} aria-hidden="true" />
              </a>
              <p className="mt-3 text-xs font-semibold text-[#e7ddc8]">الأسعار بالاستفسار فقط · بدون شراء مباشر</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4" aria-label="نماذج من مجموعة رمضان">
              {[
                { src: "/products/processed/ramadan/ramadan-0059-main.webp", alt: "خداديات رمضان باللونين الأزرق والذهبي" },
                { src: "/products/processed/ramadan/ramadan-0039-main.webp", alt: "رانر سفرة رمضاني أسود وزخارف ذهبية" },
                { src: "/products/processed/ramadan/ramadan-0045-main.webp", alt: "معلقات رمضانية من المكرمية" },
              ].map(({ src, alt }) => (
                <div key={src} className="min-w-0 overflow-hidden rounded-2xl border border-[#f5d48c]/30 bg-[#eae1d0]/15 p-1 shadow-xl">
                  <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    width={360}
                    height={460}
                    className="aspect-[3/4] w-full rounded-xl object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
