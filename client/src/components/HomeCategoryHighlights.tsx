import { ArrowLeft } from "lucide-react";

type HomeCategory = {
  name: string;
  query: string;
  image: string;
  comingSoon?: boolean;
  href?: string;
};

const categories: readonly HomeCategory[] = [
  {
    name: "عربيات",
    query: "عربيات",
    image: "/categories/category-cars-approved.webp",
  },
  {
    name: "عرايس",
    query: "عرايس",
    image: "/categories/category-dolls-approved.webp",
  },
  {
    name: "أطقم المهن والتركيب",
    query: "مطبخ دكتور نجار تنظيف",
    href: "/products?category=role-play#feed",
    image: "/categories/category-role-play-approved.webp",
  },
  {
    name: "رفايع لعب أطفال",
    query: "رفايع",
    image: "/categories/category-misc-toys-approved.webp",
  },
  {
    name: "الكور",
    query: "كور",
    image: "/categories/category-balls-approved.webp",
  },
  {
    name: "رمضان",
    query: "رمضان",
    href: "/products?category=ramadan-lanterns#feed",
    image: "/categories/category-ramadan-approved.webp",
  },
];

function categorySrcSet(image: string): string {
  const base = image.replace(/\.webp$/i, "");
  return `${base}-192.webp 192w, ${base}-320.webp 320w, ${base}-640.webp 640w, ${image} 1254w`;
}

export default function HomeCategoryHighlights({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section
      id="categories"
      className="scroll-mt-28 border-b border-brand-border bg-white py-8 sm:py-11"
      aria-labelledby="home-categories-title"
    >
      <div className="container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black text-brand-blue sm:text-sm">
              وصل لاختيارك أسرع
            </p>
            <h2
              id="home-categories-title"
              className="font-hand-ar mt-1 text-3xl font-bold text-brand-navy sm:text-4xl"
            >
              تسوق حسب القسم
            </h2>
          </div>
          <a
            href="/products#feed"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-brand-blue transition hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15"
          >
            كل الأقسام <ArrowLeft size={16} aria-hidden="true" />
          </a>
        </div>

        <div
          className={
            compact
              ? "mt-4 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-6 sm:gap-3"
              : "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
          }
        >
          {categories.map(({ name, query, image, comingSoon, href }, index) => (
            <a
              key={name}
              href={
                href ?? `/products?search=${encodeURIComponent(query)}#feed`
              }
              aria-label={comingSoon ? `${name} — قريبًا` : `تصفح ${name}`}
              className={
                compact
                  ? "omran-pressable group flex min-w-0 flex-col items-center gap-2 rounded-xl border border-brand-border bg-white p-2 text-center hover:bg-brand-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
                  : "omran-pressable group relative aspect-square overflow-hidden rounded-[1.6rem] border border-brand-border bg-white shadow-[0_10px_28px_rgba(18,59,109,.07)] transition duration-300 hover:-translate-y-1 hover:border-brand-blue/25 hover:shadow-[0_18px_38px_rgba(18,59,109,.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              }
            >
              <img
                src={image}
                srcSet={categorySrcSet(image)}
                sizes={
                  compact
                    ? "(max-width: 639px) 80px, 64px"
                    : "(max-width: 639px) calc((100vw - 2.5rem) / 2), (max-width: 1023px) calc((100vw - 3rem) / 3), 16vw"
                }
                alt=""
                width="1254"
                height="1254"
                loading={compact && index < 3 ? "eager" : "lazy"}
                fetchPriority={compact && index === 0 ? "high" : "auto"}
                decoding="async"
                className={
                  compact
                    ? "h-20 w-20 max-w-full rounded-lg object-cover sm:h-16 sm:w-16"
                    : "absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                }
              />
              <span
                className={
                  compact
                    ? "text-xs font-extrabold leading-5 text-brand-navy"
                    : "sr-only"
                }
              >
                {name}
                {comingSoon ? " — قريبًا" : ""}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
