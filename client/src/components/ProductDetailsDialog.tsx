import { useEffect } from "react";
import type { Product } from "@shared/products";
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
      // analytics failure لا يمنع فتح WhatsApp
    }
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      data-testid="product-details"
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-brand-surface shadow-2xl sm:rounded-[2rem]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-brand-border px-5 py-4">
          <p className="text-sm font-bold text-brand-red">تفاصيل المنتج</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-border text-brand-muted transition hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-2">
          <div className="overflow-hidden rounded-[1.5rem] border border-brand-border bg-brand-cream">
            <div className="aspect-square">
              <ProductImage
                product={product}
                priority
                className="h-full w-full object-cover"
                sizesHint="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {product.category && (
              <span className="inline-flex w-fit rounded-full bg-brand-yellow/25 px-3 py-1.5 text-xs font-extrabold text-brand-navy">
                {product.category}
              </span>
            )}
            <h2 className="text-2xl font-extrabold leading-9 text-brand-navy sm:text-3xl">
              {product.name}
            </h2>
            <p className="text-2xl font-extrabold text-brand-red">
              {formatPrice(product.price)}
            </p>
            {product.description && (
              <p className="text-sm leading-8 text-brand-muted">{product.description}</p>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-2">
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsAppClick}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-5 py-3 text-sm font-bold text-white transition hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25"
                >
                  <MessageCircle size={18} aria-hidden="true" /> للاستفسار عبر واتساب
                </a>
              ) : (
                <p className="rounded-2xl border border-brand-border bg-brand-cream px-4 py-3 text-sm font-bold text-brand-muted">
                  للاستفسار عن هذا المنتج تواصل معنا عبر صفحاتنا الرسمية.
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-brand-border px-5 py-2.5 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
              >
                متابعة التصفح
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
