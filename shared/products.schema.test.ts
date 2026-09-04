import { describe, expect, it } from "vitest";
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
