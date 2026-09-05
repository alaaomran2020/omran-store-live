import { useEffect } from "react";
import type { Product } from "@/lib/productsClient";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, formatPrice } from "@/lib/productFormat";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { MessageCircle, X } from "lucide-react";

export function ProductDetailsDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
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
    pageUrl: typeof window === "undefined" ? undefined : window.location.href,
  });

  const handleWhatsAppClick = () => {
    try {
      trackWhatsAppInquiry(product, "product_details");
    } catch {
      // Analytics failure must never block WhatsApp conversion.
    }
  };

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
            <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-cream">
              <div className="aspect-[4/3] sm:aspect-square">
                <ProductImage
                  product={product}
                  priority
                  className="h-full w-full object-contain p-3 sm:p-4"
                  sizesHint="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3.5 sm:gap-4">
              {product.category && (
                <span className="inline-flex w-fit rounded-full bg-brand-sky px-3 py-1.5 text-xs font-extrabold text-brand-navy">
                  {product.category}
                </span>
              )}
              <h2 className="hidden text-2xl font-extrabold leading-9 text-brand-ink sm:block sm:text-3xl">
                {product.name}
              </h2>
              <p className="text-base font-extrabold text-brand-red sm:text-lg">
                {formatPrice(product.price)}
              </p>

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

              <div className="rounded-2xl bg-brand-sky p-3.5 text-sm leading-7 text-brand-navy sm:p-4">
                محتاج مساعدة في الاختيار؟ ابعتلنا على واتساب وهنساعدك في معرفة السعر والتوفر وأي تفاصيل مؤكدة عن المنتج.
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
                    <MessageCircle size={18} aria-hidden="true" /> اسأل عن السعر والتوفر
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
              <MessageCircle size={18} aria-hidden="true" /> استفسر عن السعر والتوفر على واتساب
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
