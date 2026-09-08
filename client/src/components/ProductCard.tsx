import { useMemo, useState } from "react";
import type { Product } from "@/lib/productsClient";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, formatPrice, productPermalink } from "@/lib/productFormat";
import { extractProductColors, productColorHex } from "@/lib/productColors";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { addProductToCart } from "@/lib/cart";
import { toast } from "sonner";
import { Info, MessageCircle, ShoppingCart } from "lucide-react";

/**
 * Omran Product Card v3
 * Image → Name → price/inquiry → verified color selector → WhatsApp CTA.
 */
export function ProductCard({
  product,
  onOpenDetails,
}: {
  product: Product;
  onOpenDetails: (product: Product) => void;
}) {
  const colors = useMemo(() => extractProductColors(product.description), [product.description]);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null);

  const waUrl = buildWhatsAppUrl(product, {
    selectedColor,
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

  const handleAddToCart = () => {
    const items = addProductToCart(product);
    const quantity = items.find(item => item.productId === product.id)?.quantity ?? 1;
    toast.success("تمت إضافة المنتج للسلة", {
      description: `${product.name} — الكمية: ${quantity}`,
    });
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
          className="h-full w-full object-cover transition duration-300 sm:group-hover:scale-[1.02]"
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

        {colors.length > 0 && (
          <div className="rounded-xl border border-brand-border bg-white/80 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-brand-navy sm:text-xs">اختار اللون</span>
              {selectedColor && (
                <span className="truncate text-[10px] font-bold text-brand-muted sm:text-[11px]">{selectedColor}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5" role="list" aria-label={`ألوان ${product.name}`}>
              {colors.map(color => {
                const active = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    title={color}
                    aria-label={`اختيار اللون ${color}`}
                    aria-pressed={active}
                    className={`h-7 w-7 rounded-full border-2 shadow-sm transition active:scale-95 ${
                      active ? "border-brand-blue ring-2 ring-brand-blue/20" : "border-white ring-1 ring-brand-border"
                    }`}
                    style={{ backgroundColor: productColorHex(color) }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto grid grid-cols-1 gap-2 pt-1 sm:pt-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-brand-red px-2.5 py-2.5 text-[12px] font-extrabold leading-4 text-white transition active:scale-[0.98] hover:brightness-95 focus-visible:ring-4 focus-visible:ring-brand-red/25 sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <ShoppingCart size={16} aria-hidden="true" className="shrink-0" />
            إضافة للسلة
          </button>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleWhatsAppClick}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-whatsapp px-2.5 py-2.5 text-[12px] font-bold leading-4 text-white transition active:scale-[0.98] hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm"
            >
              <MessageCircle size={16} aria-hidden="true" className="shrink-0" />
              <span>{selectedColor ? `الكميات — ${selectedColor}` : "للاستفسار والكميات"}</span>
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
