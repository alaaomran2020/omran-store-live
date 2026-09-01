import {
  fetchProductsPayload,
  parseProductsCsv,
  type Product,
  type ProductsPayload,
} from "@shared/products";

export type { Product, ProductsPayload } from "@shared/products";

/**
 * مصدر منتجات المتجر في المتصفح.
 *
 * ترتيب المحاولات (أول نجاح يفوز):
 *   1. `/api/products` — نفس الأصل، يجيب عليه Cloudflare Worker على الحافة (أو
 *      Express في التطوير) مع كاش 5 دقائق. لا مشاكل CORS ولا طلب لكل زائر.
 *   2. رابط الـCSV المنشور مباشرةً من المتصفح — يعمل حتى لو نُشر الموقع كملفات
 *      ثابتة فقط بلا Worker، ما دام `VITE_PRODUCTS_SHEET_URL` مضبوطًا وقت البناء.
 *
 * أي فشل يُترجم إلى حمولة فارغة بحالة `error`، والصفحة تعرض حالة محترمة بدل خطأ تقني.
 */

/** الرابط العام (وقت البناء). `NEXT_PUBLIC_*` مقبول كمرادف لمن نسخه من دليل Next. */
export const SHEET_URL: string =
  (import.meta.env.VITE_PRODUCTS_SHEET_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_PRODUCTS_SHEET_URL as string | undefined) ??
  "";

const empty = (status: ProductsPayload["status"]): ProductsPayload => ({
  products: [],
  status,
  fetchedAt: new Date().toISOString(),
});

async function fromSameOriginApi(
  signal?: AbortSignal
): Promise<ProductsPayload | null> {
  try {
    const res = await fetch("/api/products", {
      signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ProductsPayload>;
    if (!Array.isArray(data.products)) return null;
    if (data.status !== "ok") return null; // غير مضبوط على الخادم → جرّب المسار المباشر
    return {
      products: data.products as Product[],
      status: "ok",
      fetchedAt: data.fetchedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fromPublishedCsv(
  signal?: AbortSignal
): Promise<ProductsPayload | null> {
  if (!SHEET_URL) return null;
  try {
    return await fetchProductsPayload(SHEET_URL, (url, init) =>
      fetch(url, { ...init, signal: signal ?? init?.signal })
    );
  } catch {
    return null;
  }
}

/** الواجهة الوحيدة التي تستخدمها الصفحة. لا ترمي استثناءً أبدًا. */
export async function fetchProducts(
  signal?: AbortSignal
): Promise<ProductsPayload> {
  const viaApi = await fromSameOriginApi(signal);
  if (viaApi) return viaApi;

  const viaCsv = await fromPublishedCsv(signal);
  if (viaCsv) return viaCsv;

  return empty(SHEET_URL ? "error" : "not_configured");
}

/** يُستخدم في الاختبارات فقط: تحويل نص CSV إلى منتجات بنفس منطق الموقع. */
export { parseProductsCsv };
