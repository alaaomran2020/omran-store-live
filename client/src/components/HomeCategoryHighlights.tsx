import { ArrowLeft, Blocks, CarFront, Gamepad2, Heart, MoonStar, Palette, Sparkles } from "lucide-react";

const categories = [
  { name: "عربيات", query: "عربيات", icon: CarFront, image: "/categories/category-cars.webp", tone: "from-sky-100 to-blue-50" },
  { name: "عرايس", query: "عرايس", icon: Heart, image: "/categories/category-dolls.webp", tone: "from-pink-100 to-rose-50" },
  { name: "مطابخ", query: "مطابخ", icon: Blocks, image: "/categories/category-building.webp", tone: "from-amber-100 to-orange-50" },
  { name: "أدوات دكتور", query: "دكتور", icon: Heart, image: null, tone: "from-cyan-100 to-sky-50" },
  { name: "أدوات نجار", query: "نجار", icon: Blocks, image: null, tone: "from-orange-100 to-amber-50" },
  { name: "أدوات تنظيف", query: "تنظيف", icon: Sparkles, image: null, tone: "from-violet-100 to-fuchsia-50" },
  { name: "رفايع لعب أطفال", query: "رفايع", icon: Gamepad2, image: "/categories/category-family-games.webp", tone: "from-emerald-100 to-teal-50" },
  { name: "كور", query: "كور", icon: Palette, image: null, tone: "from-lime-100 to-green-50" },
] as const;

export default function HomeCategoryHighlights() {
  return (
    <section id="categories" className="scroll-mt-28 border-b border-brand-border bg-white py-8 sm:py-11" aria-labelledby="home-categories-title">
      <div className="container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black text-brand-blue sm:text-sm">وصل لاختيارك أسرع</p>
            <h2 id="home-categories-title" className="mt-1 text-2xl font-black text-brand-navy sm:text-3xl">تسوق حسب القسم</h2>
          </div>
          <a href="/products#feed" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-brand-blue transition hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15">
            كل الأقسام <ArrowLeft size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {categories.map(({ name, query, icon: Icon, image, tone }) => (
            <a
              key={name}
              href={`/products?search=${encodeURIComponent(query)}#feed`}
              aria-label={`تصفح ${name}`}
              className="omran-pressable group relative min-h-44 overflow-hidden rounded-[1.6rem] border border-brand-border bg-white shadow-[0_10px_28px_rgba(18,59,109,.07)] transition duration-300 hover:-translate-y-1 hover:border-brand-blue/25 hover:shadow-[0_18px_38px_rgba(18,59,109,.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
            >
              <span className={`absolute inset-0 bg-gradient-to-b ${tone}`} aria-hidden="true" />
              {image ? (
                <img src={image} alt="" width="360" height="300" loading="lazy" decoding="async" className="absolute inset-x-0 top-0 h-28 w-full object-cover opacity-95 transition duration-500 group-hover:scale-105" />
              ) : (
                <span className="absolute inset-x-0 top-0 flex h-28 items-center justify-center" aria-hidden="true">
                  <span className="absolute h-16 w-16 rounded-full bg-white/60" />
                  <span className="absolute -translate-x-7 translate-y-3 h-9 w-9 rotate-12 rounded-2xl bg-white/45" />
                  <span className="absolute translate-x-8 -translate-y-2 h-8 w-8 rounded-full border-4 border-white/60" />
                  <Icon size={42} strokeWidth={1.8} className="relative text-brand-blue" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex min-h-20 items-center justify-between gap-2 bg-white/92 px-3 py-3 backdrop-blur-sm">
                <span className="text-[15px] font-black leading-6 text-brand-navy">{name}</span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-sky text-brand-blue transition group-hover:-translate-x-0.5 group-hover:bg-brand-blue group-hover:text-white" aria-hidden="true">
                  <ArrowLeft size={15} />
                </span>
              </span>
            </a>
          ))}

          <a href="/products?search=%D9%81%D9%88%D8%A7%D9%86%D9%8A%D8%B3#feed" className="omran-pressable group relative col-span-2 min-h-32 overflow-hidden rounded-[1.6rem] border border-brand-navy/10 bg-[linear-gradient(135deg,#0f2f58,#123b6d_55%,#1769e0)] p-4 text-white shadow-[0_14px_34px_rgba(18,59,109,.18)] sm:col-span-4 xl:col-span-8">
            <div className="relative flex h-full items-center justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-brand-yellow px-2.5 py-1 text-[11px] font-black text-brand-navy">قريبًا</span>
                <p className="mt-2 text-xl font-black sm:text-2xl">فوانيس رمضان</p>
                <p className="mt-1 text-xs font-bold text-white/75 sm:text-sm">قسم موسمي مستقل يظهر وقت تفعيل المنتجات الفعلية.</p>
              </div>
              <MoonStar size={48} className="shrink-0 text-brand-yellow sm:size-16" aria-hidden="true" />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
