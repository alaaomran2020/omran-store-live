import { describe, expect, it } from "vitest";
import {
  filterQualityIssues,
  inferSourceBrand,
  runCatalogQuality,
  type QualityInput,
} from "./catalogQuality";
import type { Product } from "./products";

function product(overrides: Partial<Product> = {}): QualityInput {
  return {
    id: "OMR-T-1",
    sku: "SKU-1",
    name: "منتج اختبار",
    price: 100,
    category: "ألعاب مطبخ",
    description: "وصف كافٍ للمنتج",
    image: "/products/processed/x.webp",
    imageSource: "/products/processed/x.webp",
    active: true,
    sortOrder: null,
    productPrompt: "",
    workflowStatus: "PUBLISHED",
    qaStatus: "PASS",
    sourceDriveId: null,
    processedImage: null,
    reviewReason: null,
    rowIndex: 1,
    tags: ["لعب"],
    availability: "available",
    ...overrides,
  };
}

describe("inferSourceBrand", () => {
  it("separates POP UP from Omran by id prefix", () => {
    expect(inferSourceBrand({ id: "POP-BAL-1" })).toBe("POPUP");
    expect(inferSourceBrand({ id: "OMR-RAW-1" })).toBe("OMRAN");
  });
});

describe("runCatalogQuality", () => {
  it("returns no issues for a healthy published product", () => {
    const result = runCatalogQuality([product()]);
    expect(result.counts.total).toBe(0);
  });

  it("flags missing image as CRITICAL for public products", () => {
    const issues = runCatalogQuality([product({ image: null, imageSource: null })]).issues;
    expect(issues.some(i => i.rule === "MISSING_IMAGE" && i.severity === "CRITICAL")).toBe(true);
  });

  it("flags missing image as WARNING for drafts", () => {
    const issues = runCatalogQuality([
      product({ image: null, workflowStatus: "DRAFT", qaStatus: null }),
    ]).issues;
    expect(issues.some(i => i.rule === "MISSING_IMAGE" && i.severity === "WARNING")).toBe(true);
  });

  it("flags raw Google Drive image references", () => {
    const issues = runCatalogQuality([
      product({ image: "https://drive.google.com/uc?export=view&id=ABC" }),
    ]).issues;
    expect(issues.some(i => i.rule === "BROKEN_IMAGE_REFERENCE")).toBe(true);
  });

  it("flags missing category, description and tags", () => {
    const result = runCatalogQuality([
      product({ category: "", description: "", tags: [] }),
    ]);
    expect(result.issues.some(i => i.rule === "MISSING_CATEGORY")).toBe(true);
    expect(result.issues.some(i => i.rule === "MISSING_DESCRIPTION")).toBe(true);
    expect(result.issues.some(i => i.rule === "MISSING_TAGS")).toBe(true);
  });

  it("detects duplicate SKUs critically", () => {
    const result = runCatalogQuality([
      product({ id: "A", sku: "DUP-1" }),
      product({ id: "B", sku: "dup-1", name: "منتج آخر", sortOrder: 2, rowIndex: 2 }),
    ]);
    const dupes = result.issues.filter(i => i.rule === "DUPLICATE_SKU");
    expect(dupes).toHaveLength(2);
    expect(dupes.every(i => i.severity === "CRITICAL")).toBe(true);
  });

  it("detects invalid SKU format", () => {
    const result = runCatalogQuality([product({ sku: "خ ط" })]);
    expect(result.issues.some(i => i.rule === "INVALID_SKU")).toBe(true);
  });

  it("flags PUBLISHED without QA PASS as critical", () => {
    const result = runCatalogQuality([product({ qaStatus: "NEEDS_REVIEW" })]);
    expect(result.issues.some(i => i.rule === "PUBLISHED_WITHOUT_QA_PASS" && i.severity === "CRITICAL")).toBe(true);
  });

  it("flags missing workflow status (fail-closed)", () => {
    const result = runCatalogQuality([
      product({ workflowStatus: null, qaStatus: null, image: null }),
    ]);
    expect(result.issues.some(i => i.rule === "MISSING_WORKFLOW_STATUS")).toBe(true);
  });

  it("flags invalid raw workflow values", () => {
    const result = runCatalogQuality(
      [product({ workflowStatus: null, qaStatus: null })],
      { rawWorkflow: { "OMR-T-1": "PUBLISSHED" } }
    );
    expect(result.issues.some(i => i.rule === "INVALID_WORKFLOW_STATUS")).toBe(true);
  });

  it("detects duplicate public names", () => {
    const result = runCatalogQuality([
      product({ id: "A", sku: "S1" }),
      product({ id: "B", sku: "S2", rowIndex: 2, sortOrder: 2 }),
    ]);
    expect(result.issues.some(i => i.rule === "DUPLICATE_PUBLIC_NAME")).toBe(true);
  });

  it("detects QA/workflow conflicts and hidden public records", () => {
    const conflict = runCatalogQuality([
      product({ workflowStatus: "REVIEW", qaStatus: "PASS" }),
    ]);
    expect(conflict.issues.some(i => i.rule === "PUBLICATION_CONFLICT")).toBe(true);

    const hidden = runCatalogQuality([product({ active: false })]);
    expect(hidden.issues.some(i => i.rule === "HIDDEN_PUBLIC_RECORD")).toBe(true);
  });

  it("flags missing inventory data as info", () => {
    const result = runCatalogQuality([product({ availability: "unknown" })]);
    expect(result.issues.some(i => i.rule === "NO_INVENTORY_DATA")).toBe(true);
  });

  it("flags explicit brand source mismatch (Omran/POP UP separation)", () => {
    const result = runCatalogQuality([
      product({ id: "POP-1", sourceBrand: "OMRAN", image: "/p.webp" }),
    ]);
    expect(result.issues.some(i => i.rule === "BRAND_SOURCE_MISMATCH")).toBe(true);
  });

  it("filters by severity, brand and search", () => {
    const result = runCatalogQuality([
      product({ id: "POP-1", sourceBrand: "POPUP", category: "", image: null, workflowStatus: "DRAFT", qaStatus: null }),
      product({ id: "OMR-2", sku: "S2", rowIndex: 2, category: "", description: "" }),
    ]);
    expect(filterQualityIssues(result, { severity: "CRITICAL" }).every(i => i.severity === "CRITICAL")).toBe(true);
    expect(filterQualityIssues(result, { sourceBrand: "POPUP" }).every(i => i.sourceBrand === "POPUP")).toBe(true);
    expect(filterQualityIssues(result, { search: "OMR-2" }).length).toBeGreaterThan(0);
  });
});
