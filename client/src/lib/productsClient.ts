import {
  fetchProductsPayload,
  parseProductsCsv,
  type Product,
  type ProductsPayload,
} from "@shared/products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";

export type { Product, ProductsPayload } from "@shared/products";

/**
 * مصدر منتجات المتجر في المتصفح.
 *
 * ترتيب المحاولات (أول مصدر صالح وغير فارغ يفوز):
 *   1. `/api/products` — نفس الأصل، ويجيب عليه Cloudflare Worker.
 *   2. `/edge-api/products` — مرآة نفس الكتالوج على نفس الأصل خارج `/api/*`.
 *   3. رابط CSV المنشور مباشرةً من Google Sheets إذا كان مضبوطًا وقت البناء.
 *   4. Last-known-good snapshot موثّق داخل الـbuild، حتى لا ينهار المتجر إلى
 *      كتالوج فارغ عند Cloudflare Challenge أو عطل شبكي مؤقت.
 */

/** رابط Google Sheet العام وقت البناء. */
export const SHEET_URL: string =
  (import.meta.env.VITE_PRODUCTS_SHEET_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_PRODUCTS_SHEET_URL as string | undefined) ??
  "";

function snapshotPayload(): ProductsPayload {
  return {
    products: PUBLIC_PRODUCTS_SNAPSHOT.map(product => ({ ...product })),
    status: "ok",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * قراءة المنتجات من Cloudflare Worker على نفس النطاق.
 * الاستجابة `status=ok` مع `products=[]` لا تعتبر نجاحًا للواجهة؛ لدينا منتجات
 * موثقة منشورة، لذا القائمة الفارغة تعني مصدرًا stale/غير متزامن وننتقل للبديل.
 */
async function fetchSameOrigin(
  path: string,
  signal?: AbortSignal
): Promise<ProductsPayload | null> {
  try {
    const refresh = Date.now();
    const apiUrl = `${path}?refresh=${refresh}`;

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

    if (!res.ok) return null;

    const data = (await res.json()) as Partial<ProductsPayload>;
    if (!Array.isArray(data.products) || data.status !== "ok") return null;
    if (data.products.length === 0) return null;

    return {
      products: data.products as Product[],
      status: "ok",
      fetchedAt: data.fetchedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

const fromSameOriginApi = (signal?: AbortSignal) =>
  fetchSameOrigin("/api/products", signal);

const fromEdgeMirror = (signal?: AbortSignal) =>
  fetchSameOrigin("/edge-api/products", signal);

/** قراءة Google Sheet المنشور بصيغة CSV مباشرةً. */
async function fromPublishedCsv(
  signal?: AbortSignal
): Promise<ProductsPayload | null> {
  if (!SHEET_URL) return null;

  try {
    const payload = await fetchProductsPayload(SHEET_URL, (url, init) =>
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

    if (payload.status !== "ok" || payload.products.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}

/** الواجهة الوحيدة التي تستخدمها صفحة المنتجات. */
export async function fetchProducts(
  signal?: AbortSignal
): Promise<ProductsPayload> {
  const viaApi = await fromSameOriginApi(signal);
  if (viaApi) return viaApi;

  const viaMirror = await fromEdgeMirror(signal);
  if (viaMirror) return viaMirror;

  const viaCsv = await fromPublishedCsv(signal);
  if (viaCsv) return viaCsv;

  // Fail-open للعرض فقط ببيانات سبق أن اجتازت بوابة النشر الثلاثية.
  // لا نعرض أي منتج NEEDS_REVIEW ولا نخترع بيانات جديدة.
  return snapshotPayload();
}

/** يستخدم في الاختبارات فقط لتحويل CSV إلى منتجات بنفس منطق الموقع. */
export { parseProductsCsv };
