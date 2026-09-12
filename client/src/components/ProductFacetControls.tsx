import { useEffect, useState } from "react";
import type { ProductAvailability } from "@/lib/productsClient";
import { SlidersHorizontal, X } from "lucide-react";

export type ProductSortMode = "catalog" | "name-asc" | "name-desc";

export type ActiveProductFilter = {
  key: string;
  label: string;
  onClear: () => void;
};

const AVAILABILITY_OPTIONS: Array<{ value: ProductAvailability; label: string }> = [
  { value: "available", label: "متاح" },
  { value: "preorder", label: "طلب مسبق" },
  { value: "unavailable", label: "غير متاح" },
  { value: "unknown", label: "غير محدد" },
];

export function ProductFacetControls({
  isPopup,
  brands,
  tags,
  availabilityValues,
  brand,
  tag,
  availability,
  sort,
  activeFilters,
  resultCount,
  totalCount,
  onBrandChange,
  onTagChange,
  onAvailabilityChange,
  onSortChange,
  onClearAll,
}: {
  isPopup: boolean;
  brands: string[];
  tags: string[];
  availabilityValues: ProductAvailability[];
  brand: string;
  tag: string;
  availability: string;
  sort: ProductSortMode;
  activeFilters: ActiveProductFilter[];
  resultCount: number;
  totalCount: number;
  onBrandChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onAvailabilityChange: (value: string) => void;
  onSortChange: (value: ProductSortMode) => void;
  onClearAll: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const accent = isPopup ? "text-[#6b278f] focus:border-[#8a3aaa] focus:ring-[#8a3aaa]/15" : "text-brand-navy focus:border-brand-blue focus:ring-brand-blue/15";

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <section className="rounded-2xl border border-brand-border bg-white p-3.5 shadow-sm sm:p-4" aria-labelledby="advanced-filters-title">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p id="advanced-filters-title" className={`flex items-center gap-2 text-sm font-extrabold ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>
            <SlidersHorizontal size={16} aria-hidden="true" /> فلاتر إضافية
          </p>
          <p className="mt-1 text-xs font-bold text-brand-muted" aria-live="polite">
            {resultCount} من {totalCount} منتجًا
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {activeFilters.length > 0 && (
            <button type="button" onClick={onClearAll} className={`min-h-10 rounded-xl border border-brand-border px-3 py-2 text-xs font-extrabold transition hover:bg-brand-cream ${isPopup ? "text-[#6b278f]" : "text-brand-blue"}`}>
              مسح الكل
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="advanced-filter-fields"
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-extrabold transition sm:hidden ${isPopup ? "text-[#6b278f]" : "text-brand-blue"}`}
            aria-label="فتح الفلاتر الإضافية"
          >
            <SlidersHorizontal size={16} aria-hidden="true" /> الفلاتر
          </button>
        </div>
      </div>

      <div id="advanced-filter-fields" className={`${mobileOpen ? "fixed" : "hidden"} inset-0 z-50 sm:static sm:mt-3 sm:block`}>
        <button type="button" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-brand-navy/60 backdrop-blur-[2px] sm:hidden" aria-label="إغلاق الفلاتر" />
        <div role="dialog" aria-modal={mobileOpen ? "true" : undefined} aria-labelledby="mobile-filters-title" className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:static sm:max-h-none sm:overflow-visible sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none">
          <div className="mb-4 flex items-center justify-between gap-3 sm:hidden">
            <div>
              <p id="mobile-filters-title" className="text-base font-extrabold text-brand-navy">فلترة المنتجات</p>
              <p className="mt-1 text-xs font-bold text-brand-muted">{resultCount} نتيجة متاحة</p>
            </div>
            <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-border text-brand-muted" aria-label="إغلاق الفلاتر">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-2 lg:grid-cols-4">
            {brands.length > 0 && (
              <label className="text-xs font-extrabold text-brand-muted">
                الماركة
                <select value={brand} onChange={event => onBrandChange(event.target.value)} className={`mt-1 min-h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm font-bold outline-none ring-4 ring-transparent transition ${accent}`}>
                  <option value="__all__">كل الماركات</option>
                  {brands.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            )}

            {tags.length > 0 && (
              <label className="text-xs font-extrabold text-brand-muted">
                الوسم
                <select value={tag} onChange={event => onTagChange(event.target.value)} className={`mt-1 min-h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm font-bold outline-none ring-4 ring-transparent transition ${accent}`}>
                  <option value="__all__">كل الوسوم</option>
                  {tags.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            )}

            {availabilityValues.length > 0 && (
              <label className="text-xs font-extrabold text-brand-muted">
                التوفر
                <select value={availability} onChange={event => onAvailabilityChange(event.target.value)} className={`mt-1 min-h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm font-bold outline-none ring-4 ring-transparent transition ${accent}`}>
                  <option value="__all__">كل حالات التوفر</option>
                  {AVAILABILITY_OPTIONS.filter(option => availabilityValues.includes(option.value)).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}

            <label className="text-xs font-extrabold text-brand-muted">
              الترتيب
              <select value={sort} onChange={event => onSortChange(event.target.value as ProductSortMode)} className={`mt-1 min-h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm font-bold outline-none ring-4 ring-transparent transition ${accent}`}>
                <option value="catalog">ترتيب الكتالوج</option>
                <option value="name-asc">الاسم: أ ← ي</option>
                <option value="name-desc">الاسم: ي ← أ</option>
              </select>
            </label>
          </div>

          <button type="button" onClick={() => setMobileOpen(false)} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-extrabold text-white sm:hidden ${isPopup ? "bg-[#6b278f]" : "bg-brand-blue"}`}>
            عرض {resultCount} منتج
          </button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" aria-label="الفلاتر النشطة">
          {activeFilters.map(filter => (
            <button key={filter.key} type="button" onClick={filter.onClear} className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${isPopup ? "border-[#e4d3ee] bg-[#f9f2fc] text-[#6b278f] hover:bg-[#f3e6f8]" : "border-brand-border bg-brand-sky/50 text-brand-navy hover:bg-brand-sky"}`} aria-label={`إلغاء فلتر ${filter.label}`}>
              <X size={13} aria-hidden="true" /> {filter.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
