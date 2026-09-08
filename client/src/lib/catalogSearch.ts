import type { Product } from "./productsClient";
import { smartSearch, normalizeSearchText } from "@shared/smartSearch";

export type CatalogSearchResult = {
  products: Product[];
  suggestion: string | null;
  suggestions: Array<{ label: string; value: string; kind: "product" | "category" }>;
};

/** The caller must first apply publication, department, category and age filters. */
export function searchCatalog(products: Product[], query: string): CatalogSearchResult {
  const term = normalizeSearchText(query);
  if (!term) return { products, suggestion: null, suggestions: [] };
  const result = smartSearch(products, query);
  const suggestions: CatalogSearchResult["suggestions"] = [];
  const seen = new Set<string>();
  for (const product of result.results.slice(0, 6)) {
    const key = normalizeSearchText(product.name);
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ label: product.name, value: product.name, kind: "product" });
  }
  for (const category of [...new Set(products.map(product => product.category).filter(Boolean))]) {
    const key = normalizeSearchText(category);
    if ((key.includes(term) || term.includes(key)) && !seen.has(key) && suggestions.length < 6) {
      seen.add(key);
      suggestions.push({ label: category, value: category, kind: "category" });
    }
  }
  return { products: result.results.map(item => item.product), suggestion: result.suggestion, suggestions };
}
