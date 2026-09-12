import { Blocks, BrainCircuit, CarFront, Gamepad2, Palette, Shapes } from "lucide-react";
import { VISIBLE_CATEGORIES } from "@shared/taxonomy";

const CATEGORY_ICONS = {
  educational: BrainCircuit,
  building: Blocks,
  "rc-electronic": CarFront,
  "dolls-figures": Shapes,
  "board-games": Gamepad2,
  "arts-crafts": Palette,
} as const;

const highlightedCategories = VISIBLE_CATEGORIES
  .filter(category => category.id in CATEGORY_ICONS)
  .slice(0, 6);

export default function HomeCategoryHighlights() {
  return (
    <section className="border-b border-brand-border bg-white py-8 sm:py-11" aria-labelledby="home-categories-title">
      <div className="container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold text-brand-red sm:text-sm">وصل لاختيارك أسرع</p>
            <h2 id="home-categories-title" className="mt-1 text-2xl font-black text-brand-navy sm:text-3xl">ابدأ من نوع اللعبة</h2>
          </div>
          <a href="/products#feed" className="inline-flex min-h-11 w-fit items-center rounded-xl px-2 text-sm font-extrabold text-brand-blue hover:bg-brand-sky">
            كل لعب الأطفال
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {highlightedCategories.map(category => {
            const Icon = CATEGORY_ICONS[category.id as keyof typeof CATEGORY_ICONS];
            return (
              <a
                key={category.id}
                href={`/products?category=${encodeURIComponent(category.name)}#feed`}
                className="group flex min-h-32 flex-col justify-between rounded-2xl border border-brand-border bg-brand-cream p-4 transition hover:-translate-y-0.5 hover:border-brand-blue/35 hover:bg-brand-sky/55 hover:shadow-sm focus-visible:ring-4 focus-visible:ring-brand-blue/15"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm ring-1 ring-brand-border transition group-hover:bg-brand-blue group-hover:text-white">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="mt-4 text-sm font-black leading-6 text-brand-navy">{category.name}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
