// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveCatalogIndexing } from "./catalogIndexing";

function params(pairs: Record<string, string | null> = {}) {
  return pairs;
}

describe("resolveCatalogIndexing", () => {
  it("keeps clean catalog URLs indexable", () => {
    expect(resolveCatalogIndexing({ urlParams: params(), productOpen: false, catalogLoaded: true, productFoundInCatalog: false })).toEqual({
      robots: "index,follow",
      reason: "clean",
    });
  });

  it("noindexes search result state (but keeps follow)", () => {
    const state = resolveCatalogIndexing({
      urlParams: params({ search: "مطبخ" }),
      productOpen: false,
      catalogLoaded: true,
      productFoundInCatalog: false,
    });
    expect(state.robots).toBe("noindex,follow");
    expect(state.reason).toBe("transient-filters");
  });

  it("noindexes every transient filter/sort combination", () => {
    for (const key of ["category", "age", "brand", "tag", "availability", "sort"] as const) {
      const state = resolveCatalogIndexing({
        urlParams: params({ [key]: "x" }),
        productOpen: false,
        catalogLoaded: true,
        productFoundInCatalog: false,
      });
      expect(state.robots, key).toBe("noindex,follow");
    }
    const combined = resolveCatalogIndexing({
      urlParams: params({ category: "مطبخ", age: "3-5", sort: "name-asc", search: " " }),
      productOpen: false,
      catalogLoaded: true,
      productFoundInCatalog: false,
    });
    expect(combined.robots).toBe("noindex,follow");
  });

  it("keeps real product URLs indexable", () => {
    expect(
      resolveCatalogIndexing({
        urlParams: params({ product: "OMR-A-1" }),
        productOpen: true,
        catalogLoaded: true,
        productFoundInCatalog: true,
      })
    ).toEqual({ robots: "index,follow", reason: "product-open" });
    // نفس النتيجة مع dialog مغلق لكن المنتج موجود (شاشة تحميل/إغلاق سريع).
    expect(
      resolveCatalogIndexing({
        urlParams: params({ product: "OMR-A-1" }),
        productOpen: false,
        catalogLoaded: true,
        productFoundInCatalog: true,
      }).robots
    ).toBe("index,follow");
  });

  it("noindexes a missing or foreign-catalog product param (soft 404 / alias)", () => {
    for (const found of [false]) {
      const state = resolveCatalogIndexing({
        urlParams: params({ product: "DOES-NOT-EXIST" }),
        productOpen: false,
        catalogLoaded: true,
        productFoundInCatalog: found,
      });
      expect(state.robots).toBe("noindex,follow");
      expect(state.reason).toBe("missing-product-param");
    }
  });

  it("does not decide before the catalog is loaded", () => {
    const state = resolveCatalogIndexing({
      urlParams: params({ product: "OMR-A-1" }),
      productOpen: false,
      catalogLoaded: false,
      productFoundInCatalog: false,
    });
    expect(state.robots).toBe("index,follow");
  });

  it("returns to indexable state when a product is opened from search (no stale noindex)", () => {
    const searching = resolveCatalogIndexing({
      urlParams: params({ search: "عرايس" }),
      productOpen: false,
      catalogLoaded: true,
      productFoundInCatalog: false,
    });
    expect(searching.robots).toBe("noindex,follow");

    const opened = resolveCatalogIndexing({
      urlParams: params({ search: "عرايس", product: "OMR-A-1" }),
      productOpen: true,
      catalogLoaded: true,
      productFoundInCatalog: true,
    });
    expect(opened.robots).toBe("index,follow");
  });
});
