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
    for (const query of ["نظارة", "نضارة", "نظارات", "glasses"]) {
      expect(smartSearch([glasses, car], query).results[0]?.product.id).toBe("T1");
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
