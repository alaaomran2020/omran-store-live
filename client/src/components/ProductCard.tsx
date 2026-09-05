import type { Product } from "@shared/products";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, formatPrice, productPermalink } from "@/lib/productFormat";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { Info, MessageCircle } from "lucide-react";

/**
 * بطاقة المنتج — Omran Brand System v1
 * Modern Playful Retail: صورة المنتج هي البطل، Navy/Blue للهوية،
 * Brand Red للسعر المؤكد، وWhatsApp Green محجوز للتحويل عبر واتساب.
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
      // analytics failure يجب ألا يمنع فتح WhatsApp أبدًا
    }
  };

  return (
    <article
      data-testid="product-card"
      data-product-id={product.id}
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-brand-border bg-brand-surface shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <button
        type="button"
        onClick={() => onOpenDetails(product)}
        className="relative block aspect-square w-full overflow-hidden bg-brand-cream text-right"
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        <ProductImage
          product={product}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          sizesHint="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.category && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand-navy/95 px-3 py-1 text-xs font-bold text-white shadow-sm">
            {product.category}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-extrabold leading-8 text-brand-navy">
          {product.name}
        </h3>
        <p className="text-base font-extrabold text-brand-red">
          {formatPrice(product.price)}
        </p>
        {product.description && (
          <p className="line-clamp-3 text-sm leading-7 text-brand-muted">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleWhatsAppClick}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-4 py-2.5 text-sm font-bold text-white transition hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25"
            >
              <MessageCircle size={17} aria-hidden="true" /> اطلب عبر واتساب
            </a>
          )}
          <button
            type="button"
            onClick={() => onOpenDetails(product)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-brand-border px-4 py-2.5 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
          >
            تفاصيل المنتج <Info size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.75rem] border border-brand-border bg-brand-surface">
      <div className="aspect-square bg-brand-cream" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 rounded-full bg-brand-border/70" />
        <div className="h-4 w-1/3 rounded-full bg-brand-border/60" />
        <div className="h-4 w-full rounded-full bg-brand-border/60" />
        <div className="h-11 w-full rounded-2xl bg-brand-border/50" />
      </div>
    </div>
  );
}
