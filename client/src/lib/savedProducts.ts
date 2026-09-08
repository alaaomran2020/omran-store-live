import type { Product } from "@/lib/productsClient";
import type { ProductCatalog } from "@/lib/productCatalog";

export const WISHLIST_STORAGE_KEY = "omran-store-wishlist-v1";
export const COMPARE_STORAGE_KEY = "omran-store-compare-v1";
export const SAVED_PRODUCTS_UPDATED_EVENT = "omran:saved-products-updated";
export const SAVED_PRODUCTS_OPEN_EVENT = "omran:saved-products-open";
export const MAX_COMPARE_ITEMS = 3;

export type SavedProduct = {
  productId: string;
  sku: string | null;
  name: string;
  image: string | null;
  category: string;
  catalog: ProductCatalog;
  brand: string | null;
  availability: Product["availability"];
  ageMin: number | null;
  ageMax: number | null;
  material: string | null;
  piecesCount: number | null;
  dimensions: string | null;
};

export type CompareToggleResult = {
  items: SavedProduct[];
  status: "added" | "removed" | "full" | "different_catalog";
};

function toSavedProduct(product: Product, catalog: ProductCatalog): SavedProduct {
  const { productLengthCm: length, productWidthCm: width, productHeightCm: height } = product.specifications;
  const dimensions = length !== null || width !== null || height !== null
    ? [length, width, height].map(value => value === null ? "—" : String(value)).join(" × ") + " سم"
    : null;
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    image: product.processedImage || product.image,
    category: product.category,
    catalog,
    brand: product.brand,
    availability: product.availability,
    ageMin: product.ageMin,
    ageMax: product.ageMax,
    material: product.specifications.material,
    piecesCount: product.specifications.piecesCount,
    dimensions,
  };
}

function normalizeItem(value: unknown): SavedProduct | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SavedProduct>;
  if (!item.productId || !item.name) return null;
  const catalog: ProductCatalog = item.catalog === "popup" ? "popup" : "toys";
  const availability: Product["availability"] = ["available", "unavailable", "preorder", "unknown"].includes(String(item.availability))
    ? item.availability as Product["availability"]
    : "unknown";
  return {
    productId: String(item.productId),
    sku: typeof item.sku === "string" && item.sku.trim() ? item.sku.trim() : null,
    name: String(item.name),
    image: typeof item.image === "string" && item.image.trim() ? item.image : null,
    category: typeof item.category === "string" ? item.category : "",
    catalog,
    brand: typeof item.brand === "string" && item.brand.trim() ? item.brand : null,
    availability,
    ageMin: typeof item.ageMin === "number" && Number.isFinite(item.ageMin) ? item.ageMin : null,
    ageMax: typeof item.ageMax === "number" && Number.isFinite(item.ageMax) ? item.ageMax : null,
    material: typeof item.material === "string" && item.material.trim() ? item.material : null,
    piecesCount: typeof item.piecesCount === "number" && Number.isFinite(item.piecesCount) ? item.piecesCount : null,
    dimensions: typeof item.dimensions === "string" && item.dimensions.trim() ? item.dimensions : null,
  };
}

function readList(key: string): SavedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter((item): item is SavedProduct => Boolean(item));
  } catch {
    return [];
  }
}

function writeList(key: string, items: SavedProduct[]): SavedProduct[] {
  if (typeof window === "undefined") return items;
  window.localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(SAVED_PRODUCTS_UPDATED_EVENT));
  return items;
}

export function readWishlist(): SavedProduct[] {
  return readList(WISHLIST_STORAGE_KEY);
}

export function readCompare(): SavedProduct[] {
  return readList(COMPARE_STORAGE_KEY);
}

export function isWishlisted(productId: string): boolean {
  return readWishlist().some(item => item.productId === productId);
}

export function isCompared(productId: string): boolean {
  return readCompare().some(item => item.productId === productId);
}

export function toggleWishlist(product: Product, catalog: ProductCatalog): SavedProduct[] {
  const items = readWishlist();
  const exists = items.some(item => item.productId === product.id);
  return writeList(
    WISHLIST_STORAGE_KEY,
    exists ? items.filter(item => item.productId !== product.id) : [...items, toSavedProduct(product, catalog)]
  );
}

export function removeWishlist(productId: string): SavedProduct[] {
  return writeList(WISHLIST_STORAGE_KEY, readWishlist().filter(item => item.productId !== productId));
}

export function toggleCompare(product: Product, catalog: ProductCatalog): CompareToggleResult {
  const items = readCompare();
  if (items.some(item => item.productId === product.id)) {
    return { items: writeList(COMPARE_STORAGE_KEY, items.filter(item => item.productId !== product.id)), status: "removed" };
  }
  if (items.length > 0 && items.some(item => item.catalog !== catalog)) {
    return { items, status: "different_catalog" };
  }
  if (items.length >= MAX_COMPARE_ITEMS) return { items, status: "full" };
  const next = writeList(COMPARE_STORAGE_KEY, [...items, toSavedProduct(product, catalog)]);
  return { items: next, status: "added" };
}

export function removeCompare(productId: string): SavedProduct[] {
  return writeList(COMPARE_STORAGE_KEY, readCompare().filter(item => item.productId !== productId));
}

export function clearWishlist(): SavedProduct[] {
  return writeList(WISHLIST_STORAGE_KEY, []);
}

export function clearCompare(): SavedProduct[] {
  return writeList(COMPARE_STORAGE_KEY, []);
}

export function openSavedProducts(view: "wishlist" | "compare" = "wishlist"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAVED_PRODUCTS_OPEN_EVENT, { detail: { view } }));
}

export function savedProductUrl(item: SavedProduct): string {
  const path = item.catalog === "popup" ? "/popup" : "/products";
  return `${path}?product=${encodeURIComponent(item.productId)}`;
}
