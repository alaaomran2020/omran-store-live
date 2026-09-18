import {
  ArrowLeft,
  Blocks,
  BrainCircuit,
  CarFront,
  Gamepad2,
  Palette,
  Shapes,
} from "lucide-react";
import { VISIBLE_CATEGORIES } from "@shared/taxonomy";

const CATEGORY_IMAGES = [
  "/categories/category-cars.webp",
  "/categories/category-dolls.webp",
  "/categories/category-educational.webp",
  "/categories/category-building.webp",
  "/categories/category-family-games.webp",
  "/categories/category-arts.webp",
] as const;

const CATEGORY_PRESENTATION = {
  educational: { icon: BrainCircuit, images: [CATEGORY_IMAGES[2], CATEGORY_IMAGES[3], CATEGORY_IMAGES[5]] },
  building: { icon: Blocks, images: [CATEGORY_IMAGES[3], CATEGORY_IMAGES[2], CATEGORY_IMAGES[0]] },
  "rc-electronic": { icon: CarFront, images: [CATEGORY_IMAGES[0], CATEGORY_IMAGES[3], CATEGORY_IMAGES[2]] },
  "dolls-figures": { icon: Shapes, images: [CATEGORY_IMAGES[1], CATEGORY_IMAGES[5], CATEGORY_IMAGES[2]] },
  "board-games": { icon: Gamepad2, images: [CATEGORY_IMAGES[4], CATEGORY_IMAGES[2], CATEGORY_IMAGES[3]] },
  "arts-crafts": { icon: Palette, images: [CATEGORY_IMAGES[5], CATEGORY_IMAGES[1], CATEGORY_IMAGES[2]] },
} as const;

const highlightedCategories = VISIBLE_CATEGORIES
  .filter(category => category.id in CATEGORY_PRESENTATION)
  .slice(0, 6);

export default function HomeCategoryHighlights() {
  return (
    <section
      className="border-b border-brand-border bg-white py-8 sm:py-11"
      aria-labelledby="home-categories-title"
    >
      <div className="container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold text-brand-red sm:text-sm">
              تشكيلات واضحة من أول نظرة
            </p>
            <h2
              id="home-categories-title"
              className="mt-1 text-2xl font-black text-brand-navy sm:text-3xl"
            >
              اكتشف الأقسام بصريًا
            </h2>
          </div>
          <a
            href="/products#feed"
            className="inline-flex min-h-11 w-fit items-center rounded-xl px-2 text-sm font-extrabold text-brand-blue transition hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15"
          >
            كل لعب الأطفال
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {highlightedCategories.map(category => {
            const presentation =
              CATEGORY_PRESENTATION[
                category.id as keyof typeof CATEGORY_PRESENTATION
              ];
            const Icon = presentation.icon;

            return (
              <a
                key={category.id}
                href={`/products?category=${encodeURIComponent(category.name)}#feed`}
                aria-label={`تصفح قسم ${category.name}`}
                className="group relative flex min-h-52 flex-col overflow-hidden rounded-3xl border border-brand-border bg-white shadow-[0_10px_30px_rgba(15,48,87,0.07)] transition duration-300 hover:-translate-y-1 hover:border-brand-blue/30 hover:shadow-[0_18px_42px_rgba(15,48,87,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              >
                <span className="relative grid h-32 grid-cols-[1.35fr_.65fr] grid-rows-2 gap-1 overflow-hidden bg-brand-cream p-1 sm:h-36 lg:h-32 xl:h-36" aria-hidden="true">
                  <img src={presentation.images[0]} alt="" width="360" height="240" loading="lazy" decoding="async" className="row-span-2 h-full w-full rounded-2xl object-cover transition duration-500 ease-out group-hover:scale-[1.03]" />
                  <img src={presentation.images[1]} alt="" width="180" height="120" loading="lazy" decoding="async" className="h-full w-full rounded-xl object-cover" />
                  <img src={presentation.images[2]} alt="" width="180" height="120" loading="lazy" decoding="async" className="h-full w-full rounded-xl object-cover" />
                  <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-navy/40 to-transparent" />
                  <span className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/95 text-brand-blue shadow-md backdrop-blur-sm transition group-hover:bg-brand-blue group-hover:text-white">
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                </span>

                <span className="flex min-h-20 flex-1 items-center justify-between gap-2 px-3.5 py-3">
                  <span className="text-sm font-black leading-6 text-brand-navy">
                    {category.name}
                  </span>
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-sky text-brand-blue transition group-hover:-translate-x-0.5 group-hover:bg-brand-blue group-hover:text-white"
                    aria-hidden="true"
                  >
                    <ArrowLeft size={16} strokeWidth={2.4} />
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
