import type { Product } from "@/lib/productsClient";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl } from "@/lib/productFormat";
import { isPopUpProduct } from "@/lib/productCatalog";
import { displayCategoryName } from "@shared/taxonomy";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { Info, Images, MessageCircle, Play } from "lucide-react";

const AVAILABILITY_LABELS: Record<Product["availability"], string> = {
  available: "متاح للاستفسار",
  unavailable: "غير متاح حاليًا",
  preorder: "متاح بالطلب",
  unknown: "اسأل عن التوفر",
};

/** Omran product card — separate POP UP media and WhatsApp-first conversion. */
export function ProductCard({
  product,
  onOpenDetails,
}: {
  product: Product;
  onOpenDetails: (product: Product) => void;
}) {
  const isPopup = isPopUpProduct(product);
  const productHref = `${isPopup ? "/popup" : "/products"}?product=${encodeURIComponent(product.id)}`;

  const waUrl = buildWhatsAppUrl(product, {
    pageUrl:
      typeof window !== "undefined"
        ? window.location.origin + productHref
        : undefined,
  });

  const handleWhatsAppClick = () => {
    try {
      trackWhatsAppInquiry(product, "product_card");
    } catch {
      // Analytics failure must never block WhatsApp conversion.
    }
  };

  return (
    <article
      data-testid="product-card"
      data-product-id={product.id}
      data-catalog={isPopup ? "popup" : "toys"}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg-system)] border border-brand-border bg-brand-surface shadow-[var(--elevation-2)] transition duration-200 sm:hover:-translate-y-0.5 sm:hover:shadow-[var(--elevation-3)] motion-reduce:transition-none motion-reduce:sm:hover:translate-y-0"
    >
      <div className="relative">
        <a
          href={productHref}
          onClick={event => {
            event.preventDefault();
            onOpenDetails(product);
          }}
          className={`relative block w-full overflow-hidden bg-brand-cream text-right focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue ${isPopup ? "aspect-[4/3]" : "aspect-[4/5]"}`}
          aria-label={`عرض تفاصيل ${product.name}`}
        >
          <ProductImage
            product={product}
            className={`h-full w-full transition duration-300 motion-reduce:transition-none sm:group-hover:scale-[1.02] motion-reduce:sm:group-hover:scale-100 ${isPopup ? "object-contain p-2 sm:p-3" : "object-cover"}`}
            sizesHint="(max-width: 639px) calc((100vw - 2.5rem) / 2), (max-width: 1023px) calc((100vw - 3rem) / 2), 25vw"
          />
          {product.category && (
            <span className="absolute end-2 top-2 inline-flex max-w-[70%] truncate rounded-full bg-brand-surface/95 px-2 py-1 text-[10px] font-bold text-brand-navy shadow-sm ring-1 ring-brand-border sm:end-3 sm:top-3 sm:px-3 sm:text-[11px]">
              {displayCategoryName(product.category)}
            </span>
          )}
          {(product.galleryImages.length > 0 || product.videoUrl) && (
            <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-brand-navy/85 px-2 py-1 text-[10px] font-bold text-white sm:bottom-3 sm:start-3">
              {product.videoUrl ? <Play size={12} aria-hidden="true" /> : <Images size={12} aria-hidden="true" />}
              {product.videoUrl ? "فيديو" : `${product.galleryImages.length + 1} صور`}
            </span>
          )}
        </a>
      </div>

      <div className={`flex flex-1 flex-col gap-2 ${isPopup ? "p-3 sm:p-4" : "p-2.5 sm:p-4"}`}>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-extrabold leading-5 text-brand-ink sm:min-h-0 sm:text-base sm:leading-6">{product.name}</h3>
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-bold leading-4 sm:text-[11px]">
          <span className="text-brand-muted">
            <span className="sr-only">كود المنتج: {product.sku || product.id}</span>
            <span dir="ltr" aria-hidden="true">SKU: {product.sku || product.id}</span>
          </span>
          <span className={`rounded-full px-2.5 py-1 ${product.availability === "unavailable" ? "bg-red-50 text-brand-red" : "bg-brand-sky text-brand-navy"}`}>
            {AVAILABILITY_LABELS[product.availability]}
          </span>
        </div>

        <div className="mt-auto grid grid-cols-1 gap-1.5 pt-1">
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" onClick={handleWhatsAppClick} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-whatsapp px-2.5 py-2.5 text-[12px] font-black leading-4 text-white transition active:scale-[0.98] hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp-hover motion-reduce:transition-none motion-reduce:active:scale-100 max-[359px]:gap-1 max-[359px]:px-1.5 max-[359px]:text-[11px] sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm">
              <MessageCircle size={16} aria-hidden="true" className="shrink-0" />
              <span>للاستفسار والكميات</span>
            </a>
          )}
          <a href={productHref} onClick={event => { event.preventDefault(); onOpenDetails(product); }} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-black text-brand-blue transition active:scale-[0.98] hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue motion-reduce:transition-none motion-reduce:active:scale-100 sm:gap-2 sm:px-4 sm:text-sm">
            التفاصيل <Info size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[var(--radius-lg-system)] border border-brand-border bg-brand-surface shadow-[var(--elevation-1)] motion-reduce:animate-none">
      <div className="aspect-square bg-brand-cream" />
      <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-5">
        <div className="h-4 w-3/4 rounded-full bg-brand-border/70 sm:h-5" />
        <div className="h-4 w-1/3 rounded-full bg-brand-border/60" />
        <div className="h-11 w-full rounded-xl bg-brand-border/50 sm:h-12" />
        <div className="h-11 w-full rounded-xl bg-brand-border/40" />
      </div>
    </div>
  );
}
