import { describe, expect, it } from "vitest";
import type { Product } from "./productsClient";
import { findSimilarProducts } from "./similarProducts";

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id, sku: id, name: id, price: null, category: "", description: "",
    image: null, imageSource: null, active: true, sortOrder: null,
    productPrompt: "", workflowStatus: "PUBLISHED", qaStatus: "PASS",
    sourceDriveId: null, processedImage: null, reviewReason: null, rowIndex: 1,
    ageMin: null, ageMax: null, galleryImages: [], videoUrl: null,
    videoPoster: null, videoDuration: null, options: [], brand: null, tags: [],
    availability: "unknown",
    specifications: {
      productLengthCm: null, productWidthCm: null, productHeightCm: null,
      packageLengthCm: null, packageWidthCm: null, packageHeightCm: null,
      weightKg: null, material: null, piecesCount: null, powerSource: null,
      assemblyRequired: null, boxContents: null, boxContentsItems: [], playInstructions: null,
    },
    ...overrides,
  };
}

describe("ترتيب المنتجات المشابهة", () => {
  it("يحترم أولوية التصنيف ثم الماركة ثم الوسوم ثم العمر", () => {
    const source = product("source", { category: "سيارات أطفال", brand: "Speed", tags: ["ريموت"], ageMin: 6, ageMax: 8 });
    const sameCategoryBrand = product("category-brand", { category: "تحكم عن بعد وروبوتات", brand: "speed" });
    const sameCategory = product("category", { category: "سيارات", tags: ["ريموت"] });
    const brandOnly = product("brand", { category: "مكعبات", brand: "Speed", tags: ["ريموت"], ageMin: 6, ageMax: 10 });
    const ageOnly = product("age", { category: "فنون", ageMin: 7, ageMax: 9 });

    expect(findSimilarProducts([ageOnly, brandOnly, sameCategory, sameCategoryBrand], source, 4).map(item => item.id))
      .toEqual(["category-brand", "category", "brand", "age"]);
  });

  it("يستبعد المنتج نفسه والمنتجات غير المرتبطة ويحترم الحد", () => {
    const source = product("source", { category: "بالونات" });
    const related = product("related", { category: "بالونات" });
    const unrelated = product("unrelated", { category: "عرايس" });
    expect(findSimilarProducts([source, unrelated, related], source, 1).map(item => item.id)).toEqual(["related"]);
  });
});
