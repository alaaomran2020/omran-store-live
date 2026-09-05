import type { Product } from "@shared/products";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";

/**
 * Omran Trading Company — product display + WhatsApp assisted-selling helpers.
 * Rules: Egyptian Arabic, concise, useful, no invented price/stock/specifications.
 */

/**
 * الوضع التجاري الحالي: الأسعار والكميات غير جاهزة بعد.
 * عند تحويله إلى true لاحقًا تعود الأسعار المؤكدة للعرض بدون تغيير بيانات المنتجات.
 */
export const SHOW_CATALOG_PRICES = false;
export const PRICE_ENQUIRY_LABEL = "اسأل عن السعر والتوفر";

const numberFormatter = new Intl.NumberFormat("ar-EG-u-nu-latn", {
  maximumFractionDigits: 2,
});

export const CURRENCY_LABEL = "ج.م";

export const WHATSAPP_SCRIPTS = {
  welcome:
    "أهلاً بيك في شركة عمران التجارية 👋\nابعتلنا اسم المنتج أو صورته، ولو محتاج ترشيح قولنا سن الطفل ونوع الهدية اللي بتدور عليها وهنساعدك تختار.",
  giftFinder:
    "أهلاً بيك 👋\nقولنا سن الطفل، نوع الهدية، والمناسبة والميزانية التقريبية، وهنساعدك في الوصول لاختيارات مناسبة.",
  unavailableInfo:
    "هنتأكد لك من المعلومة ونرجعلك بالبيانات الصحيحة.",
} as const;

/** أثناء وضع إخفاء الأسعار لا يظهر أي رقم حتى لو كان موجودًا في المصدر. */
export function formatPrice(price: number | null): string {
  if (!SHOW_CATALOG_PRICES) return PRICE_ENQUIRY_LABEL;
  if (price === null || !Number.isFinite(price)) return PRICE_ENQUIRY_LABEL;
  return `${numberFormatter.format(price)} ${CURRENCY_LABEL}`;
}

/** رقم واتساب المتجر: من متغيّر البيئة إن وُجد، وإلا من إعدادات القنوات الحالية. */
export function whatsappNumber(): string {
  const fromEnv =
    (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "";
  return (fromEnv || SOCIAL_EMBED_CONFIG.whatsappNumber || "").replace(
    /[^\d]/g,
    ""
  );
}

export function buildWhatsAppUrl(
  product: Pick<Product, "name" | "price"> &
    Partial<Pick<Product, "id" | "category">> & { sku?: string | null },
  options: { number?: string; pageUrl?: string } = {}
): string | null {
  const number = (options.number ?? whatsappNumber()).replace(/[^\d]/g, "");
  if (!number) return null;

  const productId = (product as { id?: string }).id?.trim() || "";
  const sku = (product as { sku?: string | null }).sku?.trim() || "";
  const category = (product as { category?: string }).category?.trim() || "";

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
    if (!pageUrl && typeof window !== "undefined" && window.location?.href) {
      pageUrl = window.location.href;
    }
  }

  const lines = [
    "أهلاً بيك 👋",
    `بالنسبة لـ ${product.name}، حابب أعرف السعر والتوفر وأي تفاصيل متاحة عنه.`,
    "",
    productId ? `كود المنتج: ${productId}` : null,
    sku ? `SKU: ${sku}` : null,
    category ? `التصنيف: ${category}` : null,
    pageUrl ? `الرابط: ${pageUrl}` : null,
  ].filter(Boolean);

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
