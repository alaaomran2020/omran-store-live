import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/productsClient";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, productPermalink } from "@/lib/productFormat";
import { productColorHex } from "@/lib/productColors";
import { productColors } from "@/lib/productOptions";
import { isPopUpProduct } from "@/lib/productCatalog";
import { addProductToCart, openCartDrawer } from "@/lib/cart";
import {
  SAVED_PRODUCTS_UPDATED_EVENT,
  isWishlisted,
  openSavedProducts,
  toggleWishlist,
} from "@/lib/savedProducts";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { Heart, Info, Images, MessageCircle, Play, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

/**
 * Omran Product Card v6
 * Preserves the separate POP UP media treatment with wishlist,
 * cart preparation and WhatsApp conversion actions.
 */
export function ProductCard({
  product,
  onOpenDetails,
}: {
  product: Product;
  onOpenDetails: (product: Product) => void;
}) {
  const colors = useMemo(() => productColors(product), [product]);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const isPopup = isPopUpProduct(product);
  const catalog = isPopup ? "popup" as const : "toys" as const;

  useEffect(() => {
    const sync = () => setWishlisted(isWishlisted(product.id));
    sync();
    window.addEventListener(SAVED_PRODUCTS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(SAVED_PRODUCTS_UPDATED_EVENT, sync);
  }, [product.id]);

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
    addProductToCart(product, selectedColor ? { اللون: selectedColor } : {});
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1400);
    toast.success("اتضاف لطلبك", {
      description: selectedColor ? `${product.name} — ${selectedColor}` : product.name,
      action: { label: "عرض الطلب", onClick: openCartDrawer },
    });
  };

  const handleWishlist = () => {
    const next = toggleWishlist(product, catalog);
    const active = next.some(item => item.productId === product.id);
    setWishlisted(active);
    toast.success(active ? "اتحفظ في المفضلة" : "اتشال من المفضلة", {
      description: product.name,
      action: active ? { label: "عرض المفضلة", onClick: () => openSavedProducts("wishlist") } : undefined,
    });
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
              {product.category}
            </span>
          )}
          {(product.galleryImages.length > 0 || product.videoUrl) && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-brand-navy/85 px-2 py-1 text-[10px] font-bold text-white sm:bottom-3 sm:left-3">
              {product.videoUrl ? <Play size={12} aria-hidden="true" /> : <Images size={12} aria-hidden="true" />}
              {product.videoUrl ? "فيديو" : `${product.galleryImages.length + 1} صور`}
            </span>
          )}
        </button>
        <div className="absolute left-2 top-2 z-10 sm:left-3 sm:top-3">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} للمفضلة`}
            aria-pressed={wishlisted}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-md backdrop-blur transition ${wishlisted ? "border-red-200 bg-red-50 text-brand-red" : "border-white/80 bg-white/95 text-brand-muted hover:text-brand-red"}`}
          >
            <Heart size={16} fill={wishlisted ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`flex flex-1 flex-col gap-2.5 ${isPopup ? "p-3 sm:p-4" : "p-3 sm:gap-3 sm:p-5"}`}>
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-extrabold leading-[1.4rem] text-brand-ink sm:min-h-0 sm:text-lg sm:leading-7">{product.name}</h3>
        <p className="text-[11px] font-bold leading-5 text-brand-muted sm:text-xs" dir="ltr">SKU: {product.sku || product.id}</p>

        {colors.length > 0 && (
          <div className="rounded-xl border border-brand-border bg-white/80 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-brand-navy sm:text-xs">اختار اللون</span>
              {selectedColor && <span className="truncate text-[10px] font-bold text-brand-muted sm:text-[11px]">{selectedColor}</span>}
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
                    className={`h-7 w-7 rounded-full border-2 shadow-sm transition active:scale-95 ${active ? "border-brand-blue ring-2 ring-brand-blue/20" : "border-white ring-1 ring-brand-border"}`}
                    style={{ backgroundColor: productColorHex(color) }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto grid grid-cols-1 gap-2 pt-1 sm:pt-2">
          <button type="button" onClick={handleAddToCart} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-brand-blue bg-brand-sky px-2.5 py-2.5 text-[12px] font-extrabold leading-4 text-brand-navy transition active:scale-[0.98] hover:bg-brand-blue hover:text-white focus-visible:ring-4 focus-visible:ring-brand-blue/20 sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm">
            <ShoppingBag size={16} aria-hidden="true" className="shrink-0" />
            <span>{addedFeedback ? "اتضاف لطلبك ✓" : "أضف لطلبك"}</span>
          </button>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" onClick={handleWhatsAppClick} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-whatsapp px-2.5 py-2.5 text-[12px] font-bold leading-4 text-white transition active:scale-[0.98] hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm">
              <MessageCircle size={16} aria-hidden="true" className="shrink-0" />
              <span>{selectedColor ? `استفسر عن ${selectedColor}` : "استفسر عن السعر والتوفر"}</span>
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
