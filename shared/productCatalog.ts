/**
 * OMRAN TOYS — تصنيف المنتج بين كتالوجَي المتجر (عمران تويز / POP UP).
 *
 * نُقل إلى `shared` حتى يخدم نفس القاعدة كلًا من الواجهة (client) وتوليد
 * sitemap أثناء البناء — قاعدة واحدة لا تنسخ في مكانين.
 *
 * التصنيف مبني على حقل `category` الصريح فقط (data-driven)، ولا يُستخدم
 * اسم المنتج أو وصفه إطلاقًا، حتى لا تتسرب منتجات اللعب العادية إلى POP UP.
 */

import type { Product } from "./products";

export const POPUP_CATEGORY_MARKERS = [
  "بالونات",
  "هدايا",
  "مستلزمات حفلات",
  "مستلزمات الحفلات",
  "حفلات ومناسبات",
  "ديكور حفلات",
  "ديكورات حفلات",
  "birthday",
  "party",
  "gift",
  "pop up",
  "popup",
] as const;

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().replace(/[ـ]/g, "").replace(/\s+/g, " ");
}

export function isPopUpProduct(product: Pick<Product, "category">): boolean {
  const category = normalizeCategory(product.category);
  if (!category) return false;
  return POPUP_CATEGORY_MARKERS.some(marker => category.includes(marker));
}

export type ProductCatalog = "toys" | "popup";

export function filterProductsByCatalog<T extends Pick<Product, "category">>(
  products: T[],
  catalog: ProductCatalog
): T[] {
  return products.filter(product =>
    catalog === "popup" ? isPopUpProduct(product) : !isPopUpProduct(product)
  );
}
