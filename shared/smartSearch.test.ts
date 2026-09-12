import { describe, expect, it } from "vitest";
import type { SearchableProduct } from "./smartSearch";
import { editDistance, normalizeSearchText, smartSearch, searchSuggestions } from "./smartSearch";

function product(id: string, name: string, extra: Partial<SearchableProduct> = {}): SearchableProduct {
  return {
    id, sku: id, name, price: null, category: "ألعاب", description: "",
    image: null, imageSource: null, active: true, sortOrder: null,
    productPrompt: "", workflowStatus: "PUBLISHED", qaStatus: "PASS",
    sourceDriveId: null, processedImage: null, reviewReason: null, rowIndex: 0,
    ...extra,
  };
}

const glasses = product("T1", "نظارة أطفال", { search_keywords_en: ["glasses"] });
const car = product("T2", "سيارة لعبة", { description: "سيارة صغيرة" });
const popup = product("P1", "بالون حفلات", { category: "بالونات" });

describe("smart search", () => {
  it("normalizes Arabic and both Arabic numeral sets", () => {
    expect(normalizeSearchText(" إِلَى  نَظّارة ـ ١۲ ")).toBe("الي نظاره 12");
  });
  it("matches Arabic spelling variants and English synonyms", () => {
    for (const query of ["نظاره", "نظارة", "نضاره", "نضارة", "نظارات", "glasses"]) {
      expect(smartSearch([glasses, car], query).results[0]?.product.id).toBe("T1");
    }
    for (const query of ["عربية", "عربيه", "car", "cars"]) {
      expect(smartSearch([glasses, car], query).results[0]?.product.id).toBe("T2");
    }
    const doll = product("T3", "عروسة أطفال");
    for (const query of ["عرايس", "عروسة", "doll"]) {
      expect(smartSearch([glasses, car, doll], query).results[0]?.product.id).toBe("T3");
    }
    const balloon = product("T4", "بالون حفلات");
    for (const query of ["بلالين", "بلونه", "balloons"]) {
      expect(smartSearch([glasses, balloon], query).results[0]?.product.id).toBe("T4");
    }
  });
  it("searches documented SKU, brand and tags", () => {
    const branded = product("T5", "لعبة تركيب", {
      sku: "OT-BLOCK-25",
      brand: "Fun Blocks",
      tags: ["تنمية المهارات"],
    });
    for (const query of ["OT-BLOCK-25", "fun blocks", "المهارات"]) {
      expect(smartSearch([glasses, branded], query).results[0]?.product.id).toBe("T5");
    }
  });
  it("ranks exact names above synonyms and descriptions", () => {
    const exact = product("E", "سيارة");
    const synonym = product("S", "مركبة", { search_synonyms: ["سيارة"] });
    expect(smartSearch([synonym, car, exact], "سيارة").results[0].product.id).toBe("E");
  });
  it("returns a bounded typo suggestion without unrelated results", () => {
    const result = smartSearch([glasses, car], "سيارهه");
    expect(result.results.map(item => item.product.id)).toEqual(["T2"]);
    expect(result.suggestion).toBe("سيارة لعبة");
    expect(smartSearch([glasses, car], "zzzzzz").results).toEqual([]);
    expect(editDistance("سياره", "سيارهه", 1)).toBe(1);
  });
  it("never adds a product from another supplied catalog", () => {
    expect(smartSearch([glasses, car], "بالون").results).toEqual([]);
    expect(smartSearch([popup], "سيارة").results).toEqual([]);
  });
  it("keeps empty queries ordered and caps suggestions", () => {
    expect(smartSearch([car, glasses], " ").results.map(item => item.product.id)).toEqual(["T2", "T1"]);
    expect(searchSuggestions([glasses, car], "", 1)).toHaveLength(1);
  });
  it("does not let a business boost invent a match", () => {
    expect(smartSearch([product("B", "مكعبات", { search_boost: 100 })], "سيارة").results).toEqual([]);
  });
});

describe("ranking parity with the original algorithm (regression guard)", () => {
  // Compact re-implementation of the pre-2026-09 scoring loop. Performance
  // refactors must change SPEED, never results: ids, scores, order and the
  // suggestion must stay bit-identical across the corpus below.
  const groups = [
    ["نظارة", "نضارة", "نظارات", "نضارات", "glasses", "eyeglasses"],
    ["سيارة", "سيارات", "عربية", "عربيات", "car", "cars"],
    ["عروسة", "عرايس", "دمية", "دمى", "doll", "dolls"],
    ["مطبخ", "مطابخ", "kitchen", "kitchens"],
    ["سكوتر", "سكوترات", "scooter", "scooters"],
    ["كرة", "كرات", "ball", "balls"],
    ["بالون", "بلونه", "بالونات", "بلالين", "balloon", "balloons"],
    ["عجلة", "دراجة", "دراجات", "bike", "bicycle", "bicycles"],
    ["مسدس", "بندقية", "رشاش", "blaster", "gun"],
  ].map(g => g.map(normalizeSearchText));
  const equivOf = (token: string) => groups.find(g => g.includes(token)) ?? [token];
  const refWords = (value: string) => normalizeSearchText(value).split(" ").filter(Boolean);
  const refEntries = (value: string[] | string | undefined): string[] =>
    Array.isArray(value) ? value.filter(v => typeof v === "string") : typeof value === "string" ? value.split(/[\n,،;|]+/).map(v => v.trim()).filter(Boolean) : [];

  function refRank(p: SearchableProduct, query: string, fuzzy: boolean): number {
    const fields: Array<[string, number]> = [
      [p.name, 1], [p.search_normalized_name ?? "", 0.95], [p.sku ?? "", 0.9],
      ...refEntries(p.search_synonyms).map(v => [v, 0.85] as [string, number]),
      ...refEntries(p.search_keywords_ar).map(v => [v, 0.75] as [string, number]),
      ...refEntries(p.search_keywords_en).map(v => [v, 0.75] as [string, number]),
      [p.brand ?? "", 0.55], ...(p.tags ?? []).map(v => [v, 0.5] as [string, number]),
      [p.category, 0.45], [p.description, 0.15],
    ];
    const prepared = fields
      .map(([value, weight]) => ({ value: normalizeSearchText(value), weight, tokens: refWords(value) }))
      .filter(f => f.value);
    const terms = refWords(query);
    if (!terms.length) return 0;
    let total = 0;
    for (const term of terms) {
      let best = 0;
      for (const field of prepared) {
        for (const token of field.tokens) {
          let score = 0;
          if (term === token) score = 100;
          else if (equivOf(term).includes(token)) score = 85;
          else if (term.length >= 2 && token.startsWith(term)) score = 65;
          else if (fuzzy && term.length >= 4 && token.length >= 4 && term[0] === token[0] && editDistance(term, token, 1) <= 1) score = 35;
          best = Math.max(best, score * field.weight);
        }
      }
      if (!best) return 0;
      total += best;
    }
    const name = normalizeSearchText(p.name);
    if (name === query) total += 140;
    else if (query.length >= 2 && name.startsWith(query)) total += 35;
    const boost = Number.isFinite(p.search_boost) ? Math.max(-10, Math.min(10, p.search_boost!)) : 0;
    return total + boost;
  }

  function refSearch(products: SearchableProduct[], query: string) {
    const normalized = normalizeSearchText(query);
    if (!normalized) return { results: products.map(p => ({ product: p, score: 0 })), suggestion: null };
    const exact = products.map(p => ({ product: p, score: refRank(p, normalized, false) })).filter(i => i.score > 0);
    const matches = exact.length ? exact : products.map(p => ({ product: p, score: refRank(p, normalized, true) })).filter(i => i.score > 0);
    matches.sort((a, b) => b.score - a.score || (a.product.sortOrder ?? Infinity) - (b.product.sortOrder ?? Infinity));
    return { results: matches, suggestion: exact.length || !matches.length ? null : matches[0].product.name };
  }

  const corpus: SearchableProduct[] = [];
  const names = ["مطبخ ألعاب للأطفال", "سيارة سباق متحركة", "دمية قماش كبيرة", "عربة نحل كهربائية", "سكوتر ثلاث عجلات", "لعبة بناء مغناطيسي", "كرة قدم كبيرة", "مسدس رذاذ ماء", "عروسة غناء", "دراجة خشبية", "بالون حفلات", "نظارة لعب", "طقم مكياج أطفال", "زرافة خشبية", "روبت ذكي"];
  const cats = ["ألعاب تمثيل أدوار", "لعب تعليمي", "لعب خشبية", "ألعاب سيارات", "دميات", "لعب إلكترونية", "بالونات", "هدايا"];
  const brands = ["Omran Kids", "FunPlay", "Smart Toys", "مصر بلاستيك", null, "ToyCo"];
  for (let i = 0; i < 120; i++) {
    corpus.push(product(`C${i}`, `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`, {
      sku: i % 3 === 0 ? `OT-${i}` : null,
      category: cats[i % cats.length],
      description: i % 2 ? "وصف تفصيلي طويل عن اللعبة ومكوناتها وسن الاستخدام المناسب مع مزايا إضافية." : "",
      sortOrder: i,
      brand: brands[i % brands.length],
      tags: ["أطفال", "هدايا"],
      search_keywords_ar: i % 4 === 0 ? ["مطبخ", "كيتشن"] : undefined,
      search_keywords_en: i % 4 === 1 ? ["kitchen set", "play"] : undefined,
      search_synonyms: i % 5 === 0 ? "لعبة, توي" : undefined,
      search_boost: i % 7 === 0 ? 3 : undefined,
    }));
  }
  const queries = ["مطبخ", "مطب", "سيار", "سيارة", "سيارات", "عربية", "عربيه", "car", "cars", "بالون", "بلالين", "بلونه", "balloons", "نظاره", "نضارة", "glasses", "عرايس", "دميه", "دمية", "سكوتر", "كره", "كرات", "ball", "مسدس", "بندقيه", "روبت", "زرافه", "قطه", "عجله", "دراجه", "bike", "مطبخ ألعاب", "سيارة سباق", "عروسة غناء", "مطبخ اطفال", "OT-12", "OT-1", "FunPlay", "fun play", "أطفال", "هدايا", "لعبة", "كيتشن", "play", "١٢", "12", "مطبخ 1", "زرافه خشبيه", "", "   "];

  it("keeps ids, scores, order and suggestion identical to the original scorer", () => {
    for (const query of queries) {
      const expected = refSearch(corpus, query);
      const actual = smartSearch(corpus, query);
      expect(actual.results.map(r => [r.product.id, r.score]), `query ${JSON.stringify(query)}`).toEqual(
        expected.results.map(r => [r.product.id, r.score])
      );
      expect(actual.suggestion).toBe(expected.suggestion);
    }
  });

  it("keeps searchSuggestions identical", () => {
    for (const query of ["مطبخ", "سيار", "بالون", "glasses"]) {
      expect(searchSuggestions(corpus, query).map(p => p.id)).toEqual(
        refSearch(corpus, query).results.slice(0, 6).map(r => r.product.id)
      );
    }
  });
});
