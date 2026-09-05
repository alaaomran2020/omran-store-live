import { describe, expect, it } from "vitest";
import type { Product } from "./productsClient";
import { filterProductsByAge, matchesAgeRange, parseAgeRange } from "./productAge";

const base = (overrides: Partial<Product>): Product => ({
  id: "p",
  sku: null,
  name: "منتج اختبار",
  price: null,
  category: "اختبار",
  description: "",
  image: null,
  imageSource: null,
  active: true,
  sortOrder: null,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
  sourceDriveId: null,
  processedImage: null,
  reviewReason: null,
  ageMin: null,
  ageMax: null,
  rowIndex: 1,
  ...overrides,
});

describe("Shop by Age", () => {
  it("يطبق Age Range Intersection فعليًا", () => {
    const range = parseAgeRange("3-5")!;
    expect(matchesAgeRange(base({ ageMin: 3, ageMax: 5 }), range)).toBe(true);
    expect(matchesAgeRange(base({ ageMin: 5, ageMax: 8 }), range)).toBe(true);
    expect(matchesAgeRange(base({ ageMin: 6, ageMax: 8 }), range)).toBe(false);
  });

  it("يستبعد المنتج إذا كان أحد حدي العمر غير موثق", () => {
    const range = parseAgeRange("6-8")!;
    expect(matchesAgeRange(base({ ageMin: null, ageMax: null }), range)).toBe(false);
    expect(matchesAgeRange(base({ ageMin: 6, ageMax: null }), range)).toBe(false);
    expect(matchesAgeRange(base({ ageMin: null, ageMax: 8 }), range)).toBe(false);
  });

  it("لا يخمن العمر من الاسم أو الوصف", () => {
    const products = [
      base({ id: "unknown", name: "لعبة 3+", description: "مناسبة من 3 سنوات", ageMin: null, ageMax: null }),
      base({ id: "verified", ageMin: 3, ageMax: 7 }),
    ];
    expect(filterProductsByAge(products, "3-5").map(product => product.id)).toEqual(["verified"]);
  });

  it("يرفض قيمة فلتر غير معتمدة ويترك الكتالوج كما هو", () => {
    const products = [base({ id: "a" }), base({ id: "b" })];
    expect(parseAgeRange("4-6")).toBeNull();
    expect(filterProductsByAge(products, "4-6")).toEqual(products);
  });
});
