import type { Product } from "./productsClient";
import { smartSearch, normalizeSearchText } from "@shared/smartSearch";

export type CatalogSearchResult = {
  products: Product[];
  suggestion: string | null;
  suggestions: Array<{ label: string; value: string; kind: "product" | "category" }>;
};

/**
 * Normalized brand/tag facet text, computed once per product object. Keypresses
 * re-run the search against the same product instances, so re-normalizing
 * every facet on every keystroke (NFKC + Arabic folding) was pure waste.
 */
const facetTextCache = new WeakMap<Product, string[]>();

function facetTexts(product: Product): string[] {
  const cached = facetTextCache.get(product);
  if (cached) return cached;
  const values = [product.brand ?? "", ...product.tags]
    .map(value => normalizeSearchText(value))
    .filter(Boolean);
  facetTextCache.set(product, values);
  return values;
}

function facetMatchesQuery(product: Product, term: string): boolean {
  return facetTexts(product).some(value => value.includes(term) || term.includes(value));
}

/** Distinct non-empty categories, cached per catalog array instance. */
const categorySetCache = new WeakMap<Product[], Set<string>>();

function distinctCategories(products: Product[]): Set<string> {
  const cached = categorySetCache.get(products);
  if (cached) return cached;
  const categories = new Set<string>();
  for (const product of products) {
    if (product.category) categories.add(product.category);
  }
  categorySetCache.set(products, categories);
  return categories;
}

/** The caller must first apply publication, department, category and age filters. */
export function searchCatalog(products: Product[], query: string): CatalogSearchResult {
  const term = normalizeSearchText(query);
  if (!term) return { products, suggestion: null, suggestions: [] };

  const result = smartSearch(products, query);
  const ordered = new Map<string, Product>();
  for (const product of products.filter(item => facetMatchesQuery(item, term))) ordered.set(product.id, product);
  for (const { product } of result.results) ordered.set(product.id, product as Product);

  const suggestions: CatalogSearchResult["suggestions"] = [];
  const seen = new Set<string>();
  for (const product of ordered.values()) {
    if (suggestions.length >= 6) break;
    const key = normalizeSearchText(product.name);
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ label: product.name, value: product.name, kind: "product" });
  }
  for (const category of distinctCategories(products)) {
    const key = normalizeSearchText(category);
    if ((key.includes(term) || term.includes(key)) && !seen.has(key) && suggestions.length < 6) {
      seen.add(key);
      suggestions.push({ label: category, value: category, kind: "category" });
    }
  }
  return { products: Array.from(ordered.values()), suggestion: result.suggestion, suggestions };
}
