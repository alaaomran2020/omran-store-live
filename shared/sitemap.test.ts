// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildSitemap,
  buildSitemapEntries,
  buildSitemapXml,
  escapeXml,
  productSitemapPath,
  STATIC_SITEMAP_ENTRIES,
} from "./sitemap";
import { SITE_ORIGIN } from "./site";
import type { Product } from "./products";

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: "OMR-TEST-01",
    sku: null,
    name: "منتج تجريبي",
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
    rowIndex: 0,
    ...overrides,
  };
}

const PRODUCTS: Product[] = [
  makeProduct({ id: "OMR-A-1", name: "لعبة تعليمية" }),
  makeProduct({ id: "POP-B-1", name: "بالونات", category: "بالونات" }),
  makeProduct({ id: "OMR-C-REJECTED", name: "منتج مرفوض", workflowStatus: "REJECTED" }),
  makeProduct({ id: "OMR-D-QA", name: "منتج قيد المراجعة", qaStatus: "NEEDS_REVIEW" }),
  makeProduct({ id: "OMR-E-OFF", name: "منتج غير نشط", active: false }),
  makeProduct({ id: "", name: "منتج بلا معرف" }),
  makeProduct({ id: "OMR-G-NONAME", name: "   " }),
];

describe("buildSitemapEntries", () => {
  it("includes the static public routes exactly once", () => {
    const entries = buildSitemapEntries([]);
    for (const entry of STATIC_SITEMAP_ENTRIES) {
      const matches = entries.filter(e => e.loc === `${SITE_ORIGIN}${entry.loc}`);
      expect(matches).toHaveLength(1);
    }
  });

  it("only lists products that pass the publication gate", () => {
    const entries = buildSitemapEntries(PRODUCTS);
    const locs = entries.map(e => e.loc);
    expect(locs).toContain(`${SITE_ORIGIN}/products?product=OMR-A-1`);
    expect(locs).toContain(`${SITE_ORIGIN}/popup?product=POP-B-1`);
    for (const excluded of ["OMR-C-REJECTED", "OMR-D-QA", "OMR-E-OFF"]) {
      expect(locs.some(loc => loc.includes(excluded))).toBe(false);
    }
  });

  it("never emits search/filter/sort query URLs", () => {
    const entries = buildSitemapEntries(PRODUCTS);
    for (const entry of entries) {
      expect(entry.loc).not.toMatch(/[?&](search|category|age|brand|tag|availability|sort)=/);
    }
  });

  it("never emits admin/internal/test routes", () => {
    const entries = buildSitemapEntries(PRODUCTS);
    for (const entry of entries) {
      expect(entry.loc).not.toMatch(/\/(admin|404|vip\/qr-test|vip\/staff-register)([?#].*)?$/);
    }
  });

  it("produces unique canonical URLs and routes popup products to /popup", () => {
    const entries = buildSitemapEntries(PRODUCTS);
    const locs = entries.map(e => e.loc);
    expect(new Set(locs).size).toBe(locs.length);
    expect(productSitemapPath("POP-X", "popup")).toBe("/popup?product=POP-X");
    expect(productSitemapPath("TOY X", "toys")).toBe("/products?product=TOY%20X");
  });

  it("uses only the production origin", () => {
    const entries = buildSitemapEntries(PRODUCTS);
    for (const entry of entries) {
      expect(entry.loc.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
    }
  });
});

describe("buildSitemapXml", () => {
  it("emits valid, well-formed XML with one urlset", () => {
    const xml = buildSitemapXml(buildSitemapEntries(PRODUCTS));
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.match(/<urlset/g)).toHaveLength(1);
    expect(xml.match(/<\/urlset>/g)).toHaveLength(1);
    const open = xml.match(/<url>/g)?.length ?? 0;
    const close = xml.match(/<\/url>/g)?.length ?? 0;
    expect(open).toBe(close);
    expect(open).toBeGreaterThanOrEqual(STATIC_SITEMAP_ENTRIES.length + 2);
  });

  it("contains no lastmod (no trusted modification timestamps exist)", () => {
    const xml = buildSitemapXml(buildSitemapEntries(PRODUCTS));
    expect(xml).not.toContain("lastmod");
  });

  it("escapes XML special characters in URLs", () => {
    expect(escapeXml("a&b<c>d\"e'f")).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
    const xml = buildSitemapXml([{ loc: `${SITE_ORIGIN}/products?product=OMR&A<1>`, priority: 0.6 }]);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/products?product=OMR&amp;A&lt;1&gt;</loc>`);
  });

  it("returns a parseable document through a strict tag walk", () => {
    const { xml } = buildSitemap(PRODUCTS);
    const lines = xml.split("\n");
    const stack: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("<!--") || trimmed.startsWith("-->")) continue;
      for (const match of trimmed.matchAll(/<\/?([a-z]+)[^>]*?>/gi)) {
        const tag = match[1].toLowerCase();
        if (match[0].startsWith("<?")) continue;
        if (match[0].endsWith("/>")) continue;
        if (match[0].startsWith("</")) {
          expect(stack.pop()).toBe(tag);
        } else {
          stack.push(tag);
        }
      }
    }
    expect(stack).toEqual([]);
  });
});
