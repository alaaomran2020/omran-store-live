import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import type { CatalogSearchResult } from "@/lib/catalogSearch";

type Props = {
  value: string;
  onChange: (value: string) => void;
  result: CatalogSearchResult;
  isPopup: boolean;
};

export function SmartProductSearch({ value, onChange, result, isPopup }: Props) {
  const inputId = useId();
  const listboxId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = value.trim() ? result.suggestions : [];
  const open = focused && suggestions.length > 0;
  const choose = (next: string) => {
    onChange(next);
    setFocused(false);
    setActive(-1);
  };
  return (
    <div className="relative w-full sm:max-w-md">
      {/* A real label (not just a placeholder) is the accessible name — WCAG 2.2 AA 3.3.2 / 4.1.2. */}
      <label htmlFor={inputId} className="sr-only">
        ابحث في المنتجات
      </label>
      <Search
        size={18}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted"
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={event => { onChange(event.target.value); setActive(-1); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={event => {
          if (event.key === "Escape") { setFocused(false); setActive(-1); }
          if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setFocused(true); setActive(current => Math.min(current + 1, suggestions.length - 1)); }
          if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setActive(current => Math.max(current - 1, 0)); }
          if (event.key === "Home" && suggestions.length) { event.preventDefault(); setActive(0); }
          if (event.key === "End" && suggestions.length) { event.preventDefault(); setActive(suggestions.length - 1); }
          if (event.key === "Enter" && open && active >= 0) { event.preventDefault(); choose(suggestions[active].value); }
        }}
        placeholder={isPopup ? "ابحث في بالونات أو هدايا أو مستلزمات حفلات…" : "ابحث عن لعبة…"}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listboxId}-${active}` : undefined}
        role="combobox"
        data-testid="product-search"
        className={`min-h-12 w-full rounded-xl border bg-white py-3 pl-11 pr-11 text-base font-semibold text-brand-ink outline-none transition placeholder:text-brand-muted focus:ring-4 sm:rounded-full sm:text-sm ${isPopup ? "border-[#e4d3ee] focus:border-[#8a3aaa] focus:ring-[#8a3aaa]" : "border-brand-border focus:border-brand-blue focus:ring-brand-blue"}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => choose("")}
          aria-label="مسح البحث"
          className="absolute left-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-brand-muted transition hover:bg-brand-cream hover:text-brand-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
      {open && (
        <div id={listboxId} role="listbox" aria-label="اقتراحات البحث" className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-brand-border bg-white p-1 shadow-lg">
          {suggestions.map((item, index) => (
            /* Options are reached with the arrow keys from the input (aria-activedescendant),
               so they must not add Tab stops — otherwise Tab unmounts the list under the cursor. */
            <button key={`${item.kind}-${item.value}`} id={`${listboxId}-${index}`} role="option" aria-selected={active === index}
              type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => choose(item.value)}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-right text-sm font-semibold hover:bg-brand-sky focus:bg-brand-sky ${active === index ? "bg-brand-sky" : ""}`}>
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 text-xs text-brand-muted">{item.kind === "category" ? "تصنيف" : "منتج"}</span>
            </button>
          ))}
        </div>
      )}
      {value.trim() && result.suggestion && (
        <p className="mt-2 text-xs text-brand-muted" aria-live="polite">هل تقصد؟{" "}
          <button type="button" onClick={() => choose(result.suggestion!)} className="rounded font-bold text-brand-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue">{result.suggestion}</button>
        </p>
      )}
    </div>
  );
}
