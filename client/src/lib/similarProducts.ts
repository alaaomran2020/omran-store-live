import type { Product } from "./productsClient";
import { normalizeSearchText } from "@shared/smartSearch";
import { displayCategoryName } from "@shared/taxonomy";

type Similarity = {
  product: Product;
  category: number;
  brand: number;
  sharedTags: number;
  age: number;
};

function normalized(value: string | null | undefined): string {
  return normalizeSearchText(value ?? "");
}

function ageRangesOverlap(a: Product, b: Product): boolean {
  if (a.ageMin === null && a.ageMax === null) return false;
  if (b.ageMin === null && b.ageMax === null) return false;
  const aMin = a.ageMin ?? 0;
  const aMax = a.ageMax ?? Number.POSITIVE_INFINITY;
  const bMin = b.ageMin ?? 0;
  const bMax = b.ageMax ?? Number.POSITIVE_INFINITY;
  return aMin <= bMax && bMin <= aMax;
}

function signals(candidate: Product, source: Product): Similarity {
  const sourceTags = new Set(source.tags.map(tag => normalized(tag)).filter(Boolean));
  const sharedTags = new Set(
    candidate.tags.map(tag => normalized(tag)).filter(tag => tag && sourceTags.has(tag))
  ).size;
  const sourceCategory = normalized(displayCategoryName(source.category));
  const candidateCategory = normalized(displayCategoryName(candidate.category));
  const sourceBrand = normalized(source.brand);
  const candidateBrand = normalized(candidate.brand);

  return {
    product: candidate,
    category: Number(Boolean(sourceCategory && sourceCategory === candidateCategory)),
    brand: Number(Boolean(sourceBrand && sourceBrand === candidateBrand)),
    sharedTags,
    age: Number(ageRangesOverlap(candidate, source)),
  };
}

/** المنتجات الواردة تكون معزولة مسبقًا حسب الكتالوج (toys أو popup). */
export function findSimilarProducts(products: Product[], source: Product, limit = 3): Product[] {
  return products
    .filter(product => product.id !== source.id)
    .map(product => signals(product, source))
    .filter(item => item.category || item.brand || item.sharedTags || item.age)
    .sort((a, b) =>
      b.category - a.category ||
      b.brand - a.brand ||
      b.sharedTags - a.sharedTags ||
      b.age - a.age ||
      (a.product.sortOrder ?? Number.POSITIVE_INFINITY) - (b.product.sortOrder ?? Number.POSITIVE_INFINITY) ||
      a.product.rowIndex - b.product.rowIndex ||
      a.product.name.localeCompare(b.product.name, "ar")
    )
    .slice(0, Math.max(0, limit))
    .map(item => item.product);
}
