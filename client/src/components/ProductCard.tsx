import type { Product } from "@/lib/productsClient";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, formatPrice, productPermalink } from "@/lib/productFormat";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { Info, MessageCircle } from "lucide-react";

/**
 * Omran Product Card v2
 * Image → Name → key info → primary CTA.
 * Mobile keeps dense scanability while preserving 44px+ touch targets.
 */
export function ProductCard({
  product,
  onOpenDetails,
}: {
  product: Product;
  onOpenDetails: (product: Product) => void;
}) {
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
      className="group flex min-w-0 flex-col overflow-hidden rounded-[1.1rem] border border-brand-border bg-brand-surface shadow-[0_3px_14px_rgba(23,32,51,.07)] transition duration-200 sm:rounded-2xl sm:shadow-[0_4px_18px_rgba(23,32,51,.08)] sm:hover:-translate-y-0.5 sm:hover:shadow-lg"
    >
      <button
        type="button"
        onClick={() => onOpenDetails(product)}
        className="relative block aspect-square w-full overflow-hidden bg-brand-cream text-right focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        <ProductImage
          product={product}
          className="h-full w-full object-contain p-2.5 transition duration-300 sm:p-3 sm:group-hover:scale-[1.02]"
          sizesHint="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.category && (
          <span className="absolute right-2 top-2 inline-flex max-w-[86%] truncate rounded-full bg-brand-surface/95 px-2 py-1 text-[10px] font-bold text-brand-navy shadow-sm ring-1 ring-brand-border sm:right-3 sm:top-3 sm:px-3 sm:text-[11px]">
            {product.category}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-5">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-extrabold leading-[1.4rem] text-brand-ink sm:min-h-0 sm:text-lg sm:leading-7">
          {product.name}
        </h3>

        <p className="text-xs font-extrabold leading-5 text-brand-red sm:text-sm">
          {formatPrice(product.price)}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:pt-2">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleWhatsAppClick}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-whatsapp px-2.5 py-2.5 text-[12px] font-bold leading-4 text-white transition active:scale-[0.98] hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm"
            >
              <MessageCircle size={16} aria-hidden="true" className="shrink-0" />
              <span className="sm:hidden">استفسر واتساب</span>
              <span className="hidden sm:inline">اسأل عن السعر والتوفر</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => onOpenDetails(product)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-brand-surface px-2.5 py-2.5 text-[12px] font-bold text-brand-blue transition active:scale-[0.98] hover:border-brand-blue hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15 sm:gap-2 sm:px-4 sm:text-sm"
          >
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
