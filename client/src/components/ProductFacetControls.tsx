import { useEffect, useState } from "react";
import type { ProductAvailability } from "@/lib/productsClient";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

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

function isDesktopViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(min-width: 640px)").matches;
}

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
  const [expanded, setExpanded] = useState(isDesktopViewport);
  const accent = isPopup ? "text-[#6b278f] focus:border-[#8a3aaa] focus:ring-[#8a3aaa]/15" : "text-brand-navy focus:border-brand-blue focus:ring-brand-blue/15";

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 640px)");
    const sync = () => {
      if (media.matches) setExpanded(true);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
            aria-controls="advanced-filter-fields"
            className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-brand-border bg-brand-surface transition sm:hidden ${isPopup ? "text-[#6b278f]" : "text-brand-blue"}`}
            aria-label={expanded ? "إخفاء الفلاتر الإضافية" : "إظهار الفلاتر الإضافية"}
          >
            <ChevronDown size={18} className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div id="advanced-filter-fields" hidden={!expanded} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
