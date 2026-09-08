import type { Product } from "./productsClient";
import { smartSearch, normalizeSearchText } from "@shared/smartSearch";

export type CatalogSearchResult = {
  products: Product[];
  suggestion: string | null;
  suggestions: Array<{ label: string; value: string; kind: "product" | "category" }>;
};

function facetMatchesQuery(product: Product, term: string): boolean {
  const values = [product.brand ?? "", ...product.tags];
  return values.some(value => {
    const normalized = normalizeSearchText(value);
    return normalized && (normalized.includes(term) || term.includes(normalized));
  });
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
  for (const category of new Set(products.map(product => product.category).filter(Boolean))) {
    const key = normalizeSearchText(category);
    if ((key.includes(term) || term.includes(key)) && !seen.has(key) && suggestions.length < 6) {
      seen.add(key);
      suggestions.push({ label: category, value: category, kind: "category" });
    }
  }
  return { products: Array.from(ordered.values()), suggestion: result.suggestion, suggestions };
}
