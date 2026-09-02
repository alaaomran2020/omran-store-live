/**
 * server/adminCatalog.ts — كتالوج لوحة الإدارة: شيت Google Sheets كأساس
 * + تجاوزات المدراء من قاعدة البيانات مدمجة فوقه (applyOverridesToProducts).
 *
 * الفرق عن `/api/products` العام: يشمل المنتجات المخفية (includeInactive)
 * ليتمكن المدير من إعادة إظهارها أو تعديلها.
 */

import {
  applyOverridesToProducts,
  createProductsCache,
  fetchProductsPayload,
  type Product,
  type ProductsPayload,
} from "@shared/products";
import { getStore } from "./adminStore";

/** كاش مستقل للوحة الإدارة (يشمل المخفي) — 5 دقائق مثل الكاش العام. */
const adminCatalogCache = createProductsCache();

export type MergedCatalog = {
  products: Product[];
  status: ProductsPayload["status"];
  fetchedAt: string;
};

export async function fetchMergedCatalog(): Promise<MergedCatalog> {
  const sheetUrl =
    process.env.PRODUCTS_SHEET_URL ||
    process.env.VITE_PRODUCTS_SHEET_URL ||
    process.env.NEXT_PUBLIC_PRODUCTS_SHEET_URL ||
    "";
  let payload: ProductsPayload;
  try {
    payload = await adminCatalogCache.get(() =>
      fetchProductsPayload(sheetUrl, (url, init) => fetch(url, init), {
        includeInactive: true,
      })
    );
  } catch {
    // الزائر لا يرى خطأ تقنيًا أبدًا — وحالة واضحة للوحة
    payload = {
      products: [],
      status: "error",
      fetchedAt: new Date().toISOString(),
    };
  }

  const overrides = await getStore()
    .getOverrides()
    .catch(() => []);

  return {
    products: applyOverridesToProducts(payload.products, overrides),
    status: payload.status,
    fetchedAt: payload.fetchedAt,
  };
}

export async function fetchMergedProduct(
  id: string
): Promise<Product | null> {
  const catalog = await fetchMergedCatalog();
  return catalog.products.find(p => p.id === id) ?? null;
}
