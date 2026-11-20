import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseProductsCsv } from "./products";

describe("Products v3 schema compatibility", () => {
  it("reads SKU and the new media/AI field names without weakening the publication gate", () => {
    const csv = [
      [
        "id",
        "sku",
        "name",
        "price",
        "category",
        "description",
        "active",
        "workflow_status",
        "qa_status",
        "source_image",
        "processed_image",
        "ai_image_prompt",
        "qa_notes",
      ].join(","),
      [
        "OMR-TEST-1",
        "SKU-TEST-1",
        "منتج اختبار",
        "",
        "ألعاب تعليمية وفنية",
        "وصف موثق",
        "TRUE",
        "PUBLISHED",
        "PASS",
        "https://drive.google.com/uc?export=view&id=source",
        "/products/processed/product-test.webp",
        "catalog prompt",
        "",
      ].join(","),
    ].join("\n");

    const products = parseProductsCsv(csv);

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: "OMR-TEST-1",
      sku: "SKU-TEST-1",
      price: null,
      image: "/products/processed/product-test.webp",
      imageSource: "/products/processed/product-test.webp",
      processedImage: "/products/processed/product-test.webp",
      productPrompt: "catalog prompt",
      workflowStatus: "PUBLISHED",
      qaStatus: "PASS",
    });
  });
});

// Regression: approved new-product intake rows must make it through the
// actual publication parser; a stale review_reason can silently hide them.
describe("20 November 2026 intake publication", () => {
  it("includes all 15 approved products with same-origin images", () => {
    const csv = readFileSync(resolve(process.cwd(), "public/catalog/products.csv"), "utf8");
    const visible = parseProductsCsv(csv);
    const newlyPublished = visible.filter(product => product.id.startsWith("OMR-INTAKE-20261120-"));
    expect(newlyPublished).toHaveLength(15);
    expect(new Set(newlyPublished.map(product => product.id)).size).toBe(15);
    for (const product of newlyPublished) {
      expect(product.image).toMatch(/^\\/products\\/processed\\/toys-20261120\\/product-\\d{2}-original\\.jpg$/);
      expect(product.reviewReason).toBeNull();
      expect(product.price).toBeNull();
    }
  });
});
