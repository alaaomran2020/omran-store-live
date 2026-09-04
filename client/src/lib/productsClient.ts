import type { ProductsPayload } from "@shared/products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";

export type { Product, ProductsPayload } from "@shared/products";

/**
 * مصدر المنتجات الوحيد للمتجر الثابت.
 * لا API، ولا Worker، ولا قاعدة بيانات، ولا طلبات شبكة لتحميل الكتالوج.
 */

function snapshotPayload(): ProductsPayload {
  return {
    products: PUBLIC_PRODUCTS_SNAPSHOT.map(product => ({ ...product })),
    status: "ok",
    fetchedAt: new Date().toISOString(),
  };
}

/** الواجهة الوحيدة التي تستخدمها صفحة المنتجات. */
export async function fetchProducts(): Promise<ProductsPayload> {
  return snapshotPayload();
}
