import { ArrowLeft } from "lucide-react";

const categories = [
  { name: "عربيات", query: "عربيات", image: "/categories/category-cars-approved.png" },
  { name: "عرايس", query: "عرايس", image: "/categories/category-dolls-approved.png" },
  { name: "أطقم المهن والتركيب", query: "مطبخ دكتور نجار تنظيف", image: "/categories/category-role-play-approved.png" },
  { name: "رفايع لعب أطفال", query: "رفايع", image: "/categories/category-misc-toys-approved.png" },
  { name: "الكور", query: "كور", image: "/categories/category-balls-approved.png" },
  { name: "فوانيس رمضان", query: "فوانيس", image: "/categories/category-ramadan-approved.png", comingSoon: true },
] as const;

export default function HomeCategoryHighlights() {
  return (
    <section id="categories" className="scroll-mt-28 border-b border-brand-border bg-white py-8 sm:py-11" aria-labelledby="home-categories-title">
      <div className="container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black text-brand-blue sm:text-sm">وصل لاختيارك أسرع</p>
            <h2 id="home-categories-title" className="font-hand-ar mt-1 text-3xl font-bold text-brand-navy sm:text-4xl">تسوق حسب القسم</h2>
          </div>
          <a href="/products#feed" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-brand-blue transition hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15">
            كل الأقسام <ArrowLeft size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {categories.map(({ name, query, image, comingSoon }) => (
            <a
              key={name}
              href={`/products?search=${encodeURIComponent(query)}#feed`}
              aria-label={comingSoon ? `${name} — قريبًا` : `تصفح ${name}`}
              className="omran-pressable group relative aspect-square overflow-hidden rounded-[1.6rem] border border-brand-border bg-white shadow-[0_10px_28px_rgba(18,59,109,.07)] transition duration-300 hover:-translate-y-1 hover:border-brand-blue/25 hover:shadow-[0_18px_38px_rgba(18,59,109,.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
            >
              <img src={image} alt="" width="1024" height="1024" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
              <span className="sr-only">{name}{comingSoon ? " — قريبًا" : ""}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
