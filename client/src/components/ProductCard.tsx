import type { Product } from "@shared/products";
import { ProductImage } from "@/components/ProductImage";
import { buildWhatsAppUrl, formatPrice, productPermalink } from "@/lib/productFormat";
import { trackWhatsAppInquiry } from "@/lib/analytics";
import { Info, MessageCircle } from "lucide-react";

/**
 * بطاقة المنتج — نفس لغة التصميم الحالية للموقع (زوايا 1.75rem، حدود stone،
 * ألوان emerald/orange، RTL) مع بيانات قادمة من Google Sheets بدل منشورات Meta.
 */
export function ProductCard({
  product,
  onOpenDetails,
}: {
  product: Product;
  onOpenDetails: (product: Product) => void;
}) {
  // نبني رابط واتساب مع permalink للمنتج (Stage 2) — يتضمن كل حقول الرسالة المطلوبة
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
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <button
        type="button"
        onClick={() => onOpenDetails(product)}
        className="relative block aspect-square w-full overflow-hidden bg-stone-100 text-right"
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        <ProductImage
          product={product}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          sizesHint="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.category && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-900/90 px-3 py-1 text-xs font-black text-white shadow">
            {product.category}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-black leading-8 text-emerald-950">
          {product.name}
        </h3>
        <p className="text-base font-black text-orange-700">
          {formatPrice(product.price)}
        </p>
        {product.description && (
          <p className="line-clamp-3 text-sm leading-7 text-stone-600">
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1eb857]"
            >
              <MessageCircle size={17} aria-hidden="true" /> اطلب عبر واتساب
            </a>
          )}
          <button
            type="button"
            onClick={() => onOpenDetails(product)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:border-emerald-700 hover:bg-emerald-50"
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
    <div className="animate-pulse overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white">
      <div className="aspect-square bg-stone-200/70" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 rounded-full bg-stone-200/70" />
        <div className="h-4 w-1/3 rounded-full bg-stone-200/60" />
        <div className="h-4 w-full rounded-full bg-stone-200/60" />
        <div className="h-11 w-full rounded-2xl bg-stone-200/50" />
      </div>
    </div>
  );
}
