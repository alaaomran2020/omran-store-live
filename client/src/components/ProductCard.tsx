import type { Product } from "@/lib/productsClient";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, productPermalink } from "@/lib/productFormat";
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

  const waUrl = buildWhatsAppUrl(product, {
    pageUrl:
      typeof window !== "undefined"
        ? productPermalink(product.id, window.location.origin + window.location.pathname)
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
      className="group flex min-w-0 flex-col overflow-hidden rounded-[1.1rem] border border-brand-border bg-brand-surface shadow-[0_3px_14px_rgba(23,32,51,.07)] transition duration-200 sm:rounded-2xl sm:shadow-[0_4px_18px_rgba(23,32,51,.08)] sm:hover:-translate-y-0.5 sm:hover:shadow-lg"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenDetails(product)}
          className={`relative block w-full overflow-hidden bg-brand-cream text-right focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15 ${isPopup ? "aspect-[4/3]" : "aspect-square"}`}
          aria-label={`عرض تفاصيل ${product.name}`}
        >
          <ProductImage
            product={product}
            className={`h-full w-full transition duration-300 sm:group-hover:scale-[1.02] ${isPopup ? "object-contain p-2 sm:p-3" : "object-cover"}`}
            sizesHint="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          />
          {product.category && (
            <span className="absolute right-2 top-2 inline-flex max-w-[70%] truncate rounded-full bg-brand-surface/95 px-2 py-1 text-[10px] font-bold text-brand-navy shadow-sm ring-1 ring-brand-border sm:right-3 sm:top-3 sm:px-3 sm:text-[11px]">
              {displayCategoryName(product.category)}
            </span>
          )}
          {(product.galleryImages.length > 0 || product.videoUrl) && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-brand-navy/85 px-2 py-1 text-[10px] font-bold text-white sm:bottom-3 sm:left-3">
              {product.videoUrl ? <Play size={12} aria-hidden="true" /> : <Images size={12} aria-hidden="true" />}
              {product.videoUrl ? "فيديو" : `${product.galleryImages.length + 1} صور`}
            </span>
          )}
        </button>
      </div>

      <div className={`flex flex-1 flex-col gap-2.5 ${isPopup ? "p-3 sm:p-4" : "p-3 sm:gap-3 sm:p-5"}`}>
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-extrabold leading-[1.4rem] text-brand-ink sm:min-h-0 sm:text-lg sm:leading-7">{product.name}</h3>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold leading-5 sm:text-xs">
          <span className="text-brand-muted" dir="ltr">SKU: {product.sku || product.id}</span>
          <span className={`rounded-full px-2.5 py-1 ${product.availability === "unavailable" ? "bg-red-50 text-brand-red" : "bg-brand-sky text-brand-navy"}`}>
            {AVAILABILITY_LABELS[product.availability]}
          </span>
        </div>

        <div className="mt-auto grid grid-cols-1 gap-2 pt-1 sm:pt-2">
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" onClick={handleWhatsAppClick} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-whatsapp px-2.5 py-2.5 text-[12px] font-bold leading-4 text-white transition active:scale-[0.98] hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25 max-[359px]:gap-1 max-[359px]:px-1.5 max-[359px]:text-[11px] sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm">
              <MessageCircle size={16} aria-hidden="true" className="shrink-0" />
              <span>للاستفسار والكميات</span>
            </a>
          )}
          <button type="button" onClick={() => onOpenDetails(product)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-brand-surface px-2.5 py-2.5 text-[12px] font-bold text-brand-blue transition active:scale-[0.98] hover:border-brand-blue hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15 sm:gap-2 sm:px-4 sm:text-sm">
            التفاصيل <Info size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.1rem] border border-brand-border bg-brand-surface shadow-[0_3px_14px_rgba(23,32,51,.06)] sm:rounded-2xl">
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
