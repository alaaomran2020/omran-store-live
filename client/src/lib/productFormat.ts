import type { Product } from "@shared/products";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";

const numberFormatter = new Intl.NumberFormat("ar-EG-u-nu-latn", {
  maximumFractionDigits: 2,
});

export const CURRENCY_LABEL = "ج.م";
export const INQUIRY_PRICE_LABEL = "للاستفسار والكميات";

export function formatPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return INQUIRY_PRICE_LABEL;
  return `${numberFormatter.format(price)} ${CURRENCY_LABEL}`;
}

export function whatsappNumber(): string {
  const fromEnv =
    (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "";
  return (fromEnv || SOCIAL_EMBED_CONFIG.whatsappNumber || "").replace(
    /[^\d]/g,
    ""
  );
}

export function buildWhatsAppUrl(
  product: Pick<Product, "id" | "name" | "price" | "category">,
  options: { number?: string; pageUrl?: string } = {}
): string | null {
  const number = (options.number ?? whatsappNumber()).replace(/[^\d]/g, "");
  if (!number) return null;

  const lines = [
    `مرحبًا، أريد الاستفسار عن المنتج: ${product.name}`,
    `كود المنتج: ${product.id}`,
  ];
  if (product.category) lines.push(`التصنيف: ${product.category}`);
  lines.push(
    product.price === null
      ? INQUIRY_PRICE_LABEL
      : `السعر المعروض: ${formatPrice(product.price)}`
  );
  if (options.pageUrl) lines.push(`رابط المنتج: ${options.pageUrl}`);

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function productPermalink(productId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window === "undefined"
      ? ""
      : window.location.origin + window.location.pathname);
  return `${base}?product=${encodeURIComponent(productId)}`;
}
