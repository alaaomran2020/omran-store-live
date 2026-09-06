import { describe, expect, it } from "vitest";
import type { Product } from "./productsClient";
import { filterProductsByCatalog, isPopUpProduct } from "./productCatalog";

const base = (overrides: Partial<Product>): Product => ({
  id: "p",
  sku: null,
  name: "منتج اختبار",
  price: null,
  category: "ألعاب تعليمية",
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

describe("POP UP catalog classification", () => {
  it("يعتمد على category فقط ولا يعتمد على اسم المنتج", () => {
    expect(isPopUpProduct(base({ name: "بالون لعبة للأطفال", category: "ألعاب خارجية وفقاعات" }))).toBe(false);
    expect(isPopUpProduct(base({ name: "منتج بدون كلمة هدية", category: "هدايا" }))).toBe(true);
  });

  it("يقبل فئات POP UP الصريحة", () => {
    expect(isPopUpProduct(base({ category: "بالونات" }))).toBe(true);
    expect(isPopUpProduct(base({ category: "مستلزمات حفلات" }))).toBe(true);
    expect(isPopUpProduct(base({ category: "Party Decorations" }))).toBe(true);
  });

  it("يفصل toys وpopup بدون تكرار أو تسريب", () => {
    const toy = base({ id: "toy", category: "سيارات وطائرات ريموت" });
    const gift = base({ id: "gift", category: "هدايا" });
    const balloons = base({ id: "balloons", category: "بالونات" });
    const products = [toy, gift, balloons];

    expect(filterProductsByCatalog(products, "toys").map(product => product.id)).toEqual(["toy"]);
    expect(filterProductsByCatalog(products, "popup").map(product => product.id)).toEqual(["gift", "balloons"]);
  });
});
