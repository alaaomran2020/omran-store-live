import { useEffect } from "react";
import type { Product } from "@shared/products";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, formatPrice } from "@/lib/productFormat";
import { trackEvent } from "@/lib/analytics";
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

  const trackWhatsAppInquiry = () => {
    trackEvent("whatsapp_product_inquiry", {
      product_id: product.id,
      sku: product.id,
      product_name: product.name,
      category: product.category || "",
      price_mode: product.price === null ? "inquiry" : "priced",
      page_location: typeof window === "undefined" ? "" : window.location.href,
      cta_location: "product_details",
    });
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      data-testid="product-details"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <p className="text-sm font-bold text-orange-700">تفاصيل المنتج</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-emerald-700 hover:text-emerald-800"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-2">
          <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-100">
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
              <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-900">{product.category}</span>
            )}
            <h2 className="text-2xl font-black leading-9 text-emerald-950 sm:text-3xl">{product.name}</h2>
            <p className="text-2xl font-black text-orange-700">{formatPrice(product.price)}</p>
            {product.description && (
              <p className="text-sm leading-8 text-stone-600">{product.description}</p>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-2">
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={trackWhatsAppInquiry}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1eb857]"
                >
                  <MessageCircle size={18} aria-hidden="true" /> اطلب عبر واتساب
                </a>
              ) : (
                <p className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-600">للاستفسار عن هذا المنتج تواصل معنا عبر صفحاتنا الرسمية.</p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-stone-300 px-5 py-2.5 text-sm font-bold text-emerald-900 transition hover:border-emerald-700"
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
