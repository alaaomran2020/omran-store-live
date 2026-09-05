import type { Product } from "./productsClient";

export type AgeRange = {
  min: number;
  max: number;
  key: string;
};

const AGE_RANGES: Record<string, AgeRange> = {
  "0-2": { key: "0-2", min: 0, max: 2 },
  "3-5": { key: "3-5", min: 3, max: 5 },
  "6-8": { key: "6-8", min: 6, max: 8 },
  "9-12": { key: "9-12", min: 9, max: 12 },
  "13+": { key: "13+", min: 13, max: 99 },
};

export const AGE_FILTER_OPTIONS = Object.values(AGE_RANGES);

export function parseAgeRange(value: string | null | undefined): AgeRange | null {
  if (!value) return null;
  return AGE_RANGES[value.trim()] ?? null;
}

/**
 * Age Range Intersection — strict and fail-closed.
 * A product participates in age filtering only when both source boundaries
 * are explicitly present and valid. Missing age never gets inferred from
 * product name, description, category, packaging text, or another product.
 */
export function matchesAgeRange(product: Product, range: AgeRange): boolean {
  if (product.ageMin === null || product.ageMax === null) return false;
  if (product.ageMin > product.ageMax) return false;
  return product.ageMin <= range.max && product.ageMax >= range.min;
}

export function filterProductsByAge(products: Product[], value: string | null): Product[] {
  const range = parseAgeRange(value);
  if (!range) return products;
  return products.filter(product => matchesAgeRange(product, range));
}
