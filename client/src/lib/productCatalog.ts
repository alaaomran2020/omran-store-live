import type { Product } from "./productsClient";

export type ProductCatalog = "toys" | "popup";

const POPUP_CATEGORY_MARKERS = [
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

/**
 * POP UP classification is data-driven and intentionally based on the explicit
 * product category. Product names/descriptions are never used for department
 * routing, which prevents ordinary toy products from leaking into POP UP.
 */
export function isPopUpProduct(product: Pick<Product, "category">): boolean {
  const category = normalizeCategory(product.category);
  if (!category) return false;
  return POPUP_CATEGORY_MARKERS.some(marker => category.includes(marker));
}

export function filterProductsByCatalog(products: Product[], catalog: ProductCatalog): Product[] {
  return products.filter(product => (catalog === "popup" ? isPopUpProduct(product) : !isPopUpProduct(product)));
}
