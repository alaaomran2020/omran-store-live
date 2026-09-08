// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { Product } from "./productsClient";
import {
  COMPARE_STORAGE_KEY,
  MAX_COMPARE_ITEMS,
  WISHLIST_STORAGE_KEY,
  readCompare,
  readWishlist,
  toggleCompare,
  toggleWishlist,
} from "./savedProducts";

const product = (id: string): Product => ({
  id,
  sku: `SKU-${id}`,
  name: `منتج ${id}`,
  price: null,
  category: "ألعاب تعليمية",
  description: "",
  image: "/product.webp",
  imageSource: "/product.webp",
  active: true,
  sortOrder: null,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
  sourceDriveId: null,
  processedImage: null,
  reviewReason: null,
  rowIndex: 1,
  ageMin: 3,
  ageMax: 5,
  galleryImages: [],
  videoUrl: null,
  videoPoster: null,
  videoDuration: null,
  options: [],
  brand: "Omran",
  tags: ["تعليمي"],
  availability: "unknown",
  specifications: {
    productLengthCm: 10,
    productWidthCm: 20,
    productHeightCm: 30,
    packageLengthCm: null,
    packageWidthCm: null,
    packageHeightCm: null,
    weightKg: null,
    material: "بلاستيك",
    piecesCount: 12,
    powerSource: null,
    assemblyRequired: null,
    boxContents: null,
    boxContentsItems: [],
    playInstructions: null,
  },
});

describe("local wishlist and compare", () => {
  beforeEach(() => window.localStorage.clear());

  it("يضيف ويزيل المنتج من المفضلة محليًا", () => {
    expect(toggleWishlist(product("1"), "toys")).toHaveLength(1);
    expect(readWishlist()[0]).toMatchObject({ productId: "1", catalog: "toys" });
    expect(toggleWishlist(product("1"), "toys")).toHaveLength(0);
    expect(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) ?? "[]")).toHaveLength(0);
  });

  it("يمنع خلط عمران تويز وPOP UP في نفس المقارنة", () => {
    expect(toggleCompare(product("1"), "toys").status).toBe("added");
    expect(toggleCompare(product("2"), "popup").status).toBe("different_catalog");
    expect(readCompare()).toHaveLength(1);
  });

  it("يقيد المقارنة بثلاثة منتجات", () => {
    for (let index = 1; index <= MAX_COMPARE_ITEMS; index += 1) {
      expect(toggleCompare(product(String(index)), "toys").status).toBe("added");
    }
    expect(toggleCompare(product("4"), "toys").status).toBe("full");
    expect(JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) ?? "[]")).toHaveLength(MAX_COMPARE_ITEMS);
  });

  it("يحفظ فقط مواصفات المقارنة الموثقة اللازمة", () => {
    toggleCompare(product("1"), "toys");
    expect(readCompare()[0]).toMatchObject({
      brand: "Omran",
      material: "بلاستيك",
      piecesCount: 12,
      dimensions: "10 × 20 × 30 سم",
    });
  });
});
