import type { Product } from "@shared/products";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";

/**
 * تنسيق العرض ورسالة واتساب — دوال نقية قابلة للاختبار (productFormat.test.ts).
 */

/** أرقام لاتينية مع فاصل آلاف عربي مصري + العملة، مثل: 1,250 ج.م */
const numberFormatter = new Intl.NumberFormat("ar-EG-u-nu-latn", {
  maximumFractionDigits: 2,
});

export const CURRENCY_LABEL = "ج.م";

/** السعر الفارغ/غير الصالح لا يكسر البطاقة: يظهر "السعر عند الطلب". */
export function formatPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return "السعر عند الطلب";
  return `${numberFormatter.format(price)} ${CURRENCY_LABEL}`;
}

/** رقم واتساب المتجر: من متغيّر البيئة إن وُجد، وإلا من ثابت الموقع الحالي. */
export function whatsappNumber(): string {
  const fromEnv =
    (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "";
  return (fromEnv || SOCIAL_EMBED_CONFIG.whatsappNumber || "").replace(
    /[^\d]/g,
    ""
  );
}

/**
 * نص الاستفسار — يستخدم اسم المنتج كما هو مكتوب في Google Sheets حرفيًا.
 * يُرجع null إذا لم يُضبط رقم واتساب (فيختفي الزر بدل أن يقود لرابط مكسور).
 */
export function buildWhatsAppUrl(
  product: Pick<Product, "name" | "price">,
  options: { number?: string; pageUrl?: string } = {}
): string | null {
  const number = (options.number ?? whatsappNumber()).replace(/[^\d]/g, "");
  if (!number) return null;

  const lines = [`مرحبًا، أريد الاستفسار عن منتج: ${product.name}`];
  if (product.price !== null)
    lines.push(`السعر المعروض: ${formatPrice(product.price)}`);
  if (options.pageUrl) lines.push(options.pageUrl);

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** رابط مباشر لبطاقة منتج (يفتح نافذة التفاصيل عند الزيارة). */
export function productPermalink(productId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window === "undefined"
      ? ""
      : window.location.origin + window.location.pathname);
  return `${base}?product=${encodeURIComponent(productId)}`;
}
