import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/productsClient";
import { ProductMediaGallery } from "@/components/ProductMediaGallery";
import { ProductSpecifications } from "@/components/ProductSpecifications";
import { buildWhatsAppUrl } from "@/lib/productFormat";
import { productColorHex } from "@/lib/productColors";
import { nonColorProductOptions, productColors } from "@/lib/productOptions";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { Check, MessageCircle, X } from "lucide-react";

export function ProductDetailsDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const colors = useMemo(() => (product ? productColors(product) : []), [product]);
  const extraOptions = useMemo(() => (product ? nonColorProductOptions(product) : []), [product]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedColor(colors[0] ?? null);
    setSelectedOptions(
      Object.fromEntries(extraOptions.map(group => [group.name, group.values[0] ?? ""]).filter(([, value]) => Boolean(value)))
    );
  }, [product?.id, colors, extraOptions]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;
  const waUrl = buildWhatsAppUrl(product, {
    selectedColor,
    selectedOptions,
    pageUrl: typeof window === "undefined" ? undefined : window.location.href,
  });

  const handleWhatsAppClick = () => {
    try {
      trackWhatsAppInquiry(product, "product_details");
    } catch {
      // Analytics failure must never block WhatsApp conversion.
    }
  };

  const selectionSummary = [
    selectedColor ? `اللون: ${selectedColor}` : null,
    ...Object.entries(selectedOptions).map(([name, value]) => (value ? `${name}: ${value}` : null)),
  ].filter(Boolean);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      data-testid="product-details"
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.5rem] bg-brand-surface shadow-2xl sm:max-h-[92vh] sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-brand-border sm:hidden" aria-hidden="true" />

        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-brand-border bg-brand-surface/95 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-brand-blue sm:text-sm">تفاصيل المنتج</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-brand-navy sm:hidden">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-border bg-white text-brand-muted transition active:scale-95 hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/15"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-4 p-4 pb-28 sm:gap-6 sm:p-7 sm:pb-7 md:grid-cols-2">
            <ProductMediaGallery product={product} />

            <div className="flex flex-col gap-3.5 sm:gap-4">
              {product.category && (
                <span className="inline-flex w-fit rounded-full bg-brand-sky px-3 py-1.5 text-xs font-extrabold text-brand-navy">
                  {product.category}
                </span>
              )}
              <h2 className="hidden text-2xl font-extrabold leading-9 text-brand-ink sm:block sm:text-3xl">
                {product.name}
              </h2>
              <p className="text-xs font-bold text-brand-muted" dir="ltr">SKU: {product.sku || product.id}</p>

              {colors.length > 0 && (
                <div className="rounded-2xl border border-brand-border bg-white p-3.5 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-brand-navy">اختار اللون</p>
                      <p className="mt-0.5 text-xs font-bold text-brand-muted">اللون الموثق هيظهر تلقائيًا في رسالة واتساب</p>
                    </div>
                    {selectedColor && (
                      <span className="rounded-full bg-brand-sky px-2.5 py-1 text-xs font-extrabold text-brand-navy">
                        {selectedColor}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="list" aria-label={`ألوان ${product.name}`}>
                    {colors.map(color => {
                      const active = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          aria-pressed={active}
                          className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-right text-xs font-extrabold transition active:scale-[0.98] ${
                            active
                              ? "border-brand-blue bg-brand-sky text-brand-navy ring-2 ring-brand-blue/10"
                              : "border-brand-border bg-white text-brand-muted hover:border-brand-blue/50"
                          }`}
                        >
                          <span
                            className="h-6 w-6 shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10"
                            style={{ backgroundColor: productColorHex(color) }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">{color}</span>
                          {active && <Check size={15} className="shrink-0 text-brand-blue" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {extraOptions.map(group => (
                <div key={group.name} className="rounded-2xl border border-brand-border bg-white p-3.5 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-brand-navy">اختار {group.name}</p>
                    {selectedOptions[group.name] && (
                      <span className="rounded-full bg-brand-sky px-2.5 py-1 text-xs font-extrabold text-brand-navy">
                        {selectedOptions[group.name]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2" role="list" aria-label={`${group.name} ${product.name}`}>
                    {group.values.map(value => {
                      const active = selectedOptions[group.name] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedOptions(current => ({ ...current, [group.name]: value }))}
                          aria-pressed={active}
                          className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-extrabold transition active:scale-[0.98] ${
                            active
                              ? "border-brand-blue bg-brand-sky text-brand-navy ring-2 ring-brand-blue/10"
                              : "border-brand-border bg-white text-brand-muted hover:border-brand-blue/50"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {(product.ageMin !== null && product.ageMax !== null) && (
                <div className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-xs font-bold text-brand-navy sm:text-sm">
                  العمر الموثق: {product.ageMin}–{product.ageMax} سنة
                </div>
              )}

              {product.description && (
                <div>
                  <p className="mb-1 text-sm font-extrabold text-brand-navy">عن المنتج</p>
                  <p className="text-sm leading-7 text-brand-muted sm:leading-8">{product.description}</p>
                </div>
              )}

              <ProductSpecifications product={product} />

              <div className="rounded-2xl bg-brand-sky p-3.5 text-sm leading-7 text-brand-navy sm:p-4">
                {selectionSummary.length > 0
                  ? <>اختياراتك الموثقة: <strong>{selectionSummary.join(" · ")}</strong>. هتتبعت تلقائيًا مع اسم المنتج والكود على واتساب.</>
                  : "اضغط واتساب وهيوصلنا اسم المنتج والكود تلقائيًا لتأكيد السعر والتوفر."}
              </div>

              <div className="mt-auto hidden flex-col gap-2 pt-2 sm:flex">
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleWhatsAppClick}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 py-3 text-sm font-bold text-white transition hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    {selectionSummary.length > 0 ? "استفسر عن الاختيارات المحددة" : "استفسر عن السعر والتوفر"}
                  </a>
                ) : (
                  <p className="rounded-xl border border-brand-border bg-brand-cream px-4 py-3 text-sm font-bold text-brand-muted">
                    للاستفسار عن هذا المنتج تواصل معنا عبر صفحاتنا الرسمية.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-border px-5 py-2.5 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                >
                  متابعة التصفح
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-brand-border bg-white/96 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleWhatsAppClick}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-whatsapp/25"
            >
              <MessageCircle size={18} aria-hidden="true" />
              {selectionSummary.length > 0 ? "استفسر عن الاختيارات المحددة" : "استفسر عن السعر والتوفر على واتساب"}
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-bold text-brand-blue"
            >
              متابعة التصفح
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
