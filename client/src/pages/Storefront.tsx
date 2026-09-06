import { Gift } from "lucide-react";
import Products from "@/pages/Products";

export default function Storefront() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <section className="border-b border-brand-border bg-white py-4 sm:py-5">
        <div className="container">
          <a
            href="/popup"
            className="flex items-center justify-between gap-4 rounded-2xl bg-brand-navy px-5 py-4 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:px-6 sm:py-5"
          >
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-yellow">PoP UP</p>
              <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">بالونات وهدايا للمناسبات</h2>
              <p className="mt-1 text-xs leading-6 text-white/75 sm:text-sm">
                ادخل قسم PoP UP وشوف منتجات البالونات والهدايا المتاحة.
              </p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-yellow sm:h-14 sm:w-14">
              <Gift size={26} aria-hidden="true" />
            </span>
          </a>
        </div>
      </section>
      <Products />
    </div>
  );
}
