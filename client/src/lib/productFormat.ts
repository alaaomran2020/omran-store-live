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

/** السعر الفارغ/غير الصالح لا يكسر البطاقة: يظهر "للاستفسار والكميات". */
export function formatPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return "للاستفسار والكميات";
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
 *
 * الصيغة المطلوبة إنتاجيًا (Stage 2):
 *   مرحبًا، أريد الاستفسار عن هذا المنتج من عمران تويز.
 *   المنتج: {product_name}
 *   كود المنتج: {sku OR product_id}
 *   التصنيف: {category}
 *   السعر: {price OR "للاستفسار والكميات"}
 *   رابط المنتج: {page_url}
 *
 * كل الحقول تُشفَّر بـ encodeURIComponent عبر معامل wa.me text.
 * لا يُعرض رقم خاطئ إذا لم يوجد Environment Variable — يُرجع null ويختفي الزر.
 */
export function buildWhatsAppUrl(
  product: Pick<Product, "name" | "price"> &
    Partial<Pick<Product, "id" | "category">> & {
      sku?: string | null;
    },
  options: { number?: string; pageUrl?: string } = {}
): string | null {
  const number = (options.number ?? whatsappNumber()).replace(/[^\d]/g, "");
  if (!number) return null;

  const sku =
    (product as { sku?: string | null }).sku?.trim() ||
    (product as { id?: string }).id?.trim() ||
    "";
  const category = (product as { category?: string }).category?.trim() || "";
  const priceText =
    product.price !== null && Number.isFinite(product.price as number)
      ? formatPrice(product.price as number)
      : "للاستفسار والكميات";

  // رابط المنتج: المُمرَّر صراحةً > مُولَّد من id إن أمكن > window.location.href كملاذ أخير
  let pageUrl = (options.pageUrl ?? "").trim();
  if (!pageUrl) {
    const pid = (product as { id?: string }).id;
    if (pid) {
      try {
        pageUrl = productPermalink(pid);
        if (
          pageUrl.startsWith("?") &&
          typeof window !== "undefined" &&
          window.location?.href
        ) {
          pageUrl = window.location.href.split("?")[0] + pageUrl;
        }
        if (pageUrl.startsWith("?") && typeof window !== "undefined") {
          pageUrl = window.location.href;
        }
      } catch {
        pageUrl = "";
      }
    }
    if (
      !pageUrl &&
      typeof window !== "undefined" &&
      window.location?.href
    ) {
      pageUrl = window.location.href;
    }
  }

  const lines = [
    "مرحبًا، أريد الاستفسار عن هذا المنتج من عمران تويز.",
    "",
    `المنتج: ${product.name}`,
    `كود المنتج: ${sku || "—"}`,
    `التصنيف: ${category || "غير محدد"}`,
    `السعر: ${priceText}`,
    `رابط المنتج: ${pageUrl || "—"}`,
  ];

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
