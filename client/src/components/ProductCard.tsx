import type { Product } from "@/lib/productsClient";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, formatPrice, productPermalink } from "@/lib/productFormat";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { Info, MessageCircle } from "lucide-react";

/**
 * Omran Product Card v2
 * Image → Name → key info → primary CTA.
 * Keep the card scannable; details belong in the product dialog/page.
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-[0_4px_18px_rgba(23,32,51,.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <button
        type="button"
        onClick={() => onOpenDetails(product)}
        className="relative block aspect-square w-full overflow-hidden bg-brand-cream text-right"
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        <ProductImage
          product={product}
          className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
          sizesHint="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.category && (
          <span className="absolute right-3 top-3 inline-flex max-w-[80%] items-center rounded-full bg-brand-surface/95 px-3 py-1 text-[11px] font-bold text-brand-navy shadow-sm ring-1 ring-brand-border">
            {product.category}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <h3 className="line-clamp-2 text-base font-extrabold leading-7 text-brand-ink sm:text-lg">
          {product.name}
        </h3>

        <p className="text-sm font-extrabold text-brand-red">
          {formatPrice(product.price)}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleWhatsAppClick}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-bold text-white transition hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25"
            >
              <MessageCircle size={17} aria-hidden="true" /> اسأل عن السعر والتوفر
            </a>
          )}
          <button
            type="button"
            onClick={() => onOpenDetails(product)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-sky focus-visible:ring-4 focus-visible:ring-brand-blue/15"
          >
            عرض التفاصيل <Info size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-[0_4px_18px_rgba(23,32,51,.06)]">
      <div className="aspect-square bg-brand-cream" />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="h-5 w-3/4 rounded-full bg-brand-border/70" />
        <div className="h-4 w-1/3 rounded-full bg-brand-border/60" />
        <div className="h-12 w-full rounded-xl bg-brand-border/50" />
        <div className="h-11 w-full rounded-xl bg-brand-border/40" />
      </div>
    </div>
  );
}
