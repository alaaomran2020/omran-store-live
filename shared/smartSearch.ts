import type { Product } from "./products";

/** Search-only metadata. Empty fields never imply verified product facts. */
export type SearchableProduct = Product & {
  search_keywords_ar?: string[] | string;
  search_keywords_en?: string[] | string;
  search_synonyms?: string[] | string;
  search_normalized_name?: string;
  search_boost?: number;
};

export type SearchResult<T> = { product: T; score: number };
export type SearchResponse<T> = { results: SearchResult<T>[]; suggestion: string | null };

const synonymGroups = [
  ["نظارة", "نضارة", "نظارات", "نضارات", "glasses", "eyeglasses"],
  ["سيارة", "سيارات", "عربية", "عربيات", "car", "cars"],
  ["عروسة", "عرايس", "دمية", "دمى", "doll", "dolls"],
  ["مطبخ", "مطابخ", "kitchen", "kitchens"],
  ["سكوتر", "سكوترات", "scooter", "scooters"],
  ["كرة", "كرات", "ball", "balls"],
] as const;

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي")
    .replace(/ة/g, "ه").replace(/[ؤ]/g, "و").replace(/[ئ]/g, "ي")
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function words(value: string): string[] { return normalizeSearchText(value).split(" ").filter(Boolean); }
function entries(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  return value.split(/[\n,،;|]+/).map(item => item.trim()).filter(Boolean);
}

const groups = synonymGroups.map(group => group.map(normalizeSearchText));
function equivalents(token: string): string[] {
  const group = groups.find(group => group.includes(token));
  return group ? [...new Set(group)] : [token];
}

/** Bounded edit distance: stop when more than max edits are needed. */
export function editDistance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let smallest = i;
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      smallest = Math.min(smallest, current[j]);
    }
    if (smallest > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

function tokenScore(query: string, value: string, fuzzy: boolean): number {
  if (query === value) return 100;
  if (equivalents(query).includes(value)) return 85;
  if (value.startsWith(query) && query.length >= 2) return 65;
  if (fuzzy && query.length >= 4 && value.length >= 4 && query[0] === value[0] && editDistance(query, value, 1) <= 1) return 35;
  return 0;
}

function fieldScore(query: string, value: string, fuzzy: boolean): number {
  const normalized = normalizeSearchText(value);
  if (!normalized) return 0;
  if (query === normalized) return 140;
  if (normalized.startsWith(query) && query.length >= 2) return 110;
  const tokens = words(normalized);
  return words(query).reduce((total, term) => {
    const best = Math.max(0, ...tokens.map(token => tokenScore(term, token, fuzzy)));
    return best ? total + best : -10000;
  }, 0);
}

function rank<T extends SearchableProduct>(product: T, query: string, fuzzy: boolean): number {
  const fields: [string, number][] = [
    [product.name, 1], [product.search_normalized_name ?? "", 0.95],
    ...entries(product.search_synonyms).map(value => [value, 0.85] as [string, number]),
    ...entries(product.search_keywords_ar).map(value => [value, 0.75] as [string, number]),
    ...entries(product.search_keywords_en).map(value => [value, 0.75] as [string, number]),
    [product.category, 0.45], [product.description, 0.15],
  ];
  const best = Math.max(0, ...fields.map(([value, weight]) => fieldScore(query, value, fuzzy) * weight));
  if (!best) return 0;
  const boost = Number.isFinite(product.search_boost) ? Math.max(-10, Math.min(10, product.search_boost!)) : 0;
  return best + boost;
}

/** Call with an already scoped, public catalog; no hidden or cross-brand products are added. */
export function smartSearch<T extends SearchableProduct>(products: T[], query: string): SearchResponse<T> {
  const normalized = normalizeSearchText(query);
  if (!normalized) return { results: products.map(product => ({ product, score: 0 })), suggestion: null };
  const exact = products.map(product => ({ product, score: rank(product, normalized, false) })).filter(item => item.score > 0);
  const matches = exact.length ? exact : products.map(product => ({ product, score: rank(product, normalized, true) })).filter(item => item.score > 0);
  matches.sort((a, b) => b.score - a.score || (a.product.sortOrder ?? Infinity) - (b.product.sortOrder ?? Infinity));
  const suggestion = exact.length || !matches.length ? null : matches[0].product.name;
  return { results: matches, suggestion };
}

export function searchSuggestions<T extends SearchableProduct>(products: T[], query: string, limit = 6): T[] {
  return smartSearch(products, query).results.slice(0, Math.max(0, Math.min(10, limit))).map(item => item.product);
}
