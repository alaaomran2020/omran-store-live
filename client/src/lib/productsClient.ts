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
 *   1. `/api/products` — نفس الأصل، ويجيب عليه Cloudflare Worker.
 *      يُضاف معرّف زمني ويُعطّل كاش المتصفح لمنع استخدام استجابات النظام القديم.
 *   2. رابط CSV المنشور مباشرةً من المتصفح، إذا كان
 *      `VITE_PRODUCTS_SHEET_URL` مضبوطًا وقت البناء.
 *
 * أي فشل يُترجم إلى حمولة فارغة بحالة error، وتعرض الصفحة حالة عربية واضحة
 * بدل إظهار خطأ تقني للزائر.
 */

/**
 * رابط Google Sheet العام وقت البناء.
 * `NEXT_PUBLIC_PRODUCTS_SHEET_URL` مقبول كمرادف للتوافق مع الإعدادات السابقة.
 */
export const SHEET_URL: string =
  (import.meta.env.VITE_PRODUCTS_SHEET_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_PRODUCTS_SHEET_URL as string | undefined) ??
  "";

/** إنشاء استجابة فارغة آمنة عند تعذر جميع مصادر البيانات. */
const empty = (status: ProductsPayload["status"]): ProductsPayload => ({
  products: [],
  status,
  fetchedAt: new Date().toISOString(),
});

/**
 * قراءة المنتجات من Cloudflare Worker على نفس النطاق.
 *
 * نستخدم:
 * - قيمة refresh متغيرة لتجاوز أي استجابة قديمة مخزنة حسب عنوان URL.
 * - cache: no-store لمنع المتصفح من إعادة استخدام بيانات النظام القديم.
 * - ترويسات no-cache لطلب أحدث استجابة من طبقات الوساطة.
 */
async function fromSameOriginApi(
  signal?: AbortSignal
): Promise<ProductsPayload | null> {
  try {
    const refresh = Date.now();
    const apiUrl = `/api/products?refresh=${refresh}`;

    const res = await fetch(apiUrl, {
      method: "GET",
      signal,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Partial<ProductsPayload>;

    if (!Array.isArray(data.products)) {
      return null;
    }

    if (data.status !== "ok") {
      // الـWorker غير مضبوط أو المصدر غير متاح؛ جرّب رابط CSV المباشر.
      return null;
    }

    return {
      products: data.products as Product[],
      status: "ok",
      fetchedAt: data.fetchedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * المسار الاحتياطي: قراءة Google Sheet المنشور بصيغة CSV مباشرةً.
 */
async function fromPublishedCsv(
  signal?: AbortSignal
): Promise<ProductsPayload | null> {
  if (!SHEET_URL) {
    return null;
  }

  try {
    return await fetchProductsPayload(SHEET_URL, (url, init) =>
      fetch(url, {
        ...init,
        signal: signal ?? init?.signal,
        cache: "no-store",
        headers: {
          ...init?.headers,
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
      })
    );
  } catch {
    return null;
  }
}

/**
 * الواجهة الوحيدة التي تستخدمها صفحة المنتجات.
 * لا ترمي استثناءً للمكوّن أو للزائر.
 */
export async function fetchProducts(
  signal?: AbortSignal
): Promise<ProductsPayload> {
  const viaApi = await fromSameOriginApi(signal);

  if (viaApi) {
    return viaApi;
  }

  const viaCsv = await fromPublishedCsv(signal);

  if (viaCsv) {
    return viaCsv;
  }

  return empty(SHEET_URL ? "error" : "not_configured");
}

/**
 * يستخدم في الاختبارات فقط لتحويل CSV إلى منتجات بنفس منطق الموقع.
 */
export { parseProductsCsv };
