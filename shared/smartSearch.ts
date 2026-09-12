import type { Product } from "./products";

export type SearchableProduct = Product & {
  search_keywords_ar?: string[] | string;
  search_keywords_en?: string[] | string;
  search_synonyms?: string[] | string;
  search_normalized_name?: string;
  search_boost?: number;
  brand?: string | null;
  tags?: string[];
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
  ["بالون", "بلونه", "بالونات", "بلالين", "balloon", "balloons"],
  ["عجلة", "دراجة", "دراجات", "bike", "bicycle", "bicycles"],
  ["مسدس", "بندقية", "رشاش", "blaster", "gun"],
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
  return groups.find(group => group.includes(token)) ?? [token];
}

/** Bounded Levenshtein distance. */
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

/**
 * Per-term lookup table of synonym equivalents. Built once per query instead
 * of per (product × field × token) pair — the old hot loop re-ran the group
 * scan hundreds of thousands of times for a 3000-product catalog.
 */
type PreparedQuery = {
  normalized: string;
  terms: string[];
  termEquivs: Map<string, Set<string>>;
};

function prepareQuery(rawQuery: string, normalized: string): PreparedQuery {
  const terms = words(normalized);
  const termEquivs = new Map<string, Set<string>>();
  for (const term of terms) termEquivs.set(term, new Set(equivalents(term)));
  return { normalized, terms, termEquivs };
}

function tokenScore(term: string, termEquivs: Set<string>, value: string, fuzzy: boolean): number {
  if (term === value) return 100;
  if (termEquivs.has(value)) return 85;
  if (term.length >= 2 && value.startsWith(term)) return 65;
  if (fuzzy && term.length >= 4 && value.length >= 4 && term[0] === value[0] && editDistance(term, value, 1) <= 1) return 35;
  return 0;
}

type SearchField = { value: string; weight: number; tokens: string[] };
type PreparedProduct = { fields: SearchField[]; name: string };

const fieldCache = new WeakMap<SearchableProduct, PreparedProduct>();

function fieldsFor(product: SearchableProduct): PreparedProduct {
  const cached = fieldCache.get(product);
  if (cached) return cached;
  const fields: Array<[string, number]> = [
    [product.name, 1], [product.search_normalized_name ?? "", 0.95],
    [product.sku ?? "", 0.9],
    ...entries(product.search_synonyms).map(value => [value, 0.85] as [string, number]),
    ...entries(product.search_keywords_ar).map(value => [value, 0.75] as [string, number]),
    ...entries(product.search_keywords_en).map(value => [value, 0.75] as [string, number]),
    [product.brand ?? "", 0.55],
    ...(product.tags ?? []).map(value => [value, 0.5] as [string, number]),
    [product.category, 0.45], [product.description, 0.15],
  ];
  const normalized = fields.map(([value, weight]) => ({ value: normalizeSearchText(value), weight, tokens: words(value) })).filter(field => field.value);
  const prepared: PreparedProduct = { fields: normalized, name: normalizeSearchText(product.name) };
  fieldCache.set(product, prepared);
  return prepared;
}

function rank(product: SearchableProduct, query: PreparedQuery, fuzzy: boolean): number {
  const { fields, name } = fieldsFor(product);
  const { terms, termEquivs } = query;
  if (!terms.length) return 0;
  // Every query term must match, but terms may occur in different fields.
  let total = 0;
  for (const term of terms) {
    let best = 0;
    const equivs = termEquivs.get(term)!;
    for (const field of fields) {
      for (const token of field.tokens) best = Math.max(best, tokenScore(term, equivs, token, fuzzy) * field.weight);
    }
    if (!best) return 0;
    total += best;
  }
  // Exact full-name matches always outrank synonyms and description matches.
  if (name === query.normalized) total += 140;
  else if (query.normalized.length >= 2 && name.startsWith(query.normalized)) total += 35;
  const boost = Number.isFinite(product.search_boost) ? Math.max(-10, Math.min(10, product.search_boost!)) : 0;
  return total + boost;
}

/** The caller supplies an already approved and department-scoped catalog. */
export function smartSearch<T extends SearchableProduct>(products: T[], query: string): SearchResponse<T> {
  const normalized = normalizeSearchText(query);
  if (!normalized) return { results: products.map(product => ({ product, score: 0 })), suggestion: null };
  // The query is prepared ONCE per keystroke; the old implementation re-ran
  // words() and the synonym scan per product (3000× per keystroke).
  const prepared = prepareQuery(query, normalized);
  const exact = products.map(product => ({ product, score: rank(product, prepared, false) })).filter(item => item.score > 0);
  // Preserve all exact matches. Only attempt typo recovery when no exact result exists.
  const matches = exact.length ? exact : products.map(product => ({ product, score: rank(product, prepared, true) })).filter(item => item.score > 0);
  matches.sort((a, b) => b.score - a.score || (a.product.sortOrder ?? Infinity) - (b.product.sortOrder ?? Infinity));
  return { results: matches, suggestion: exact.length || !matches.length ? null : matches[0].product.name };
}

export function searchSuggestions<T extends SearchableProduct>(products: T[], query: string, limit = 6): T[] {
  return smartSearch(products, query).results.slice(0, Math.max(0, Math.min(10, limit))).map(item => item.product);
}
