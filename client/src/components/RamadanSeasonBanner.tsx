import { ArrowLeft, MoonStar, Sparkles, Star } from "lucide-react";

const RAMADAN_URL = "/products?category=ramadan-lanterns#feed";

/** A small seasonal accent, never a modal, pop-up or cover over the navigation. */
export function RamadanSeasonRibbon() {
  return (
    <div dir="rtl" className="ramadan-ribbon border-b border-[#dfc68c]/30 bg-[#122945] text-[#fff1cd]">
      <div className="container flex min-h-11 items-center justify-center gap-x-3 py-1 text-center text-xs font-bold sm:text-sm">
        <MoonStar size={17} className="shrink-0 text-[#f3d68b]" aria-hidden="true" />
        <span>مختارات رمضان</span>
        <span className="hidden h-4 w-px bg-[#dfc68c]/50 sm:block" aria-hidden="true" />
        <span className="hidden text-[#e8dfd0] sm:inline">مفارش · خداديات · زينة</span>
        <a
          href={RAMADAN_URL}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#dfc68c]/30 bg-[#e7c47d]/10 px-3 text-[#ffe4a7] underline-offset-4 transition hover:bg-[#e7c47d]/20 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          عرض المجموعة <ArrowLeft size={14} aria-hidden="true" />
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
      className={`ramadan-season-section overflow-hidden ${compact ? "pb-7 sm:pb-11" : "border-b border-[#e5d9be] py-7 sm:py-11"}`}
    >
      <div className="container">
        <div className={`ramadan-season-panel relative isolate overflow-hidden rounded-[1.75rem] border border-[#ba9253]/40 bg-[linear-gradient(122deg,#0c283f_0%,#174055_60%,#25493e_100%)] text-white shadow-[0_16px_46px_rgba(16,44,71,.16)] ${compact ? "px-5 py-6 sm:px-9 sm:py-8" : "px-5 py-7 sm:px-9 sm:py-9 lg:px-12 lg:py-11"}`}>
          <div aria-hidden="true" className="ramadan-season-panel-pattern pointer-events-none absolute inset-0" />
          <MoonStar aria-hidden="true" className="pointer-events-none absolute -start-6 -top-9 h-36 w-36 rotate-[-14deg] text-[#ddbf76]/[.15] sm:h-52 sm:w-52" strokeWidth={1.15} />
          <Star aria-hidden="true" className="pointer-events-none absolute bottom-4 start-[48%] h-7 w-7 text-[#f1cd7e]/35" strokeWidth={1.3} />
          <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[1fr_.9fr] lg:gap-9">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#efcf83]/35 bg-white/10 px-3 py-2 text-xs font-bold text-[#f5dca5] sm:text-sm">
                <Sparkles size={15} aria-hidden="true" /> مختارات الموسم · شركة عمران التجارية
              </span>
              <h2
                id={compact ? "ramadan-category-title" : "ramadan-home-title"}
                className={`mt-4 font-black leading-[1.32] text-white ${compact ? "text-[1.7rem] sm:text-4xl" : "text-[2rem] sm:text-[2.75rem]"}`}
              >
                {compact ? "مجموعة رمضان" : "تفاصيل تزيّن البيت"}
              </h2>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-8 text-[#e8ede9] sm:text-base">
                مفارش السفرة، خداديات المنزل ومعلقات الزينة بتصميمات مختارة للموسم. شاهد الصور واستفسر عن السعر والمقاس والتوفر عبر واتساب.
              </p>
              <a
                href={RAMADAN_URL}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f5d48c] px-5 py-3 text-sm font-black text-[#163049] shadow-lg transition hover:bg-[#ffe5aa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                {compact ? "تصفح المنتجات" : "اكتشف مجموعة رمضان"}
                <ArrowLeft size={17} aria-hidden="true" />
              </a>
              <p className="mt-3 text-xs font-semibold text-[#f0e3c8]">السعر والمقاسات عبر واتساب · بدون شراء مباشر</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4" aria-label="نماذج من مجموعة رمضان">
              {[
                { src: "/products/processed/ramadan/ramadan-0059-main.webp", alt: "خداديات رمضان باللونين الأزرق والذهبي" },
                { src: "/products/processed/ramadan/ramadan-0039-main.webp", alt: "رانر سفرة رمضاني أسود وزخارف ذهبية" },
                { src: "/products/processed/ramadan/ramadan-0045-main.webp", alt: "معلقات رمضانية من المكرمية" },
              ].map(({ src, alt }) => (
                <div key={src} className="ramadan-season-photo min-w-0 overflow-hidden rounded-2xl border border-[#f5d48c]/40 bg-[#eae1d0]/15 p-1 shadow-xl">
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
