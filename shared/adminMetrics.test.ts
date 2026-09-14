import { describe, expect, it } from "vitest";
import {
  dailyEventSeries,
  inventoryDistribution,
  productsByCategory,
  qaDistribution,
  summarizeCatalog,
  summarizeWhatsAppClicks,
  topItems,
  workflowDistribution,
  type AdminProductLike,
} from "./adminMetrics";
import type { Product } from "./products";

function product(overrides: Partial<Product> = {}): AdminProductLike {
  return {
    id: "OMR-T-1",
    sku: null,
    name: "منتج",
    price: 100,
    category: "قسم",
    description: "وصف",
    image: "/x.webp",
    imageSource: "/x.webp",
    active: true,
    sortOrder: null,
    productPrompt: "",
    workflowStatus: "PUBLISHED",
    qaStatus: "PASS",
    sourceDriveId: null,
    processedImage: null,
    reviewReason: null,
    rowIndex: 1,
    tags: ["x"],
    availability: "available",
    ...overrides,
  };
}

describe("summarizeCatalog", () => {
  it("counts real statuses without inventing data", () => {
    const kpis = summarizeCatalog([
      product(),
      product({ id: "OMR-2", rowIndex: 2, workflowStatus: "REVIEW", qaStatus: "NEEDS_REVIEW", availability: "unknown", tags: [] }),
      product({ id: "OMR-3", rowIndex: 3, workflowStatus: null, qaStatus: null, image: null, availability: "unavailable" }),
      product({ id: "POP-1", sourceBrand: "POPUP", rowIndex: 4, category: "بالونات", price: null, availability: "unknown" }),
    ]);
    expect(kpis.total).toBe(4);
    expect(kpis.published).toBe(2);
    expect(kpis.inReview).toBe(1);
    expect(kpis.missingWorkflow).toBe(1);
    expect(kpis.omranTotal).toBe(3);
    expect(kpis.popupTotal).toBe(1);
    expect(kpis.inventory.available).toBe(1);
    expect(kpis.inventory.unavailable).toBe(1);
    expect(kpis.inventory.unknown).toBe(2);
    expect(kpis.quality.critical).toBeGreaterThan(0);
  });

  it("separates brands in category counts", () => {
    const products = [
      product({ id: "POP-1", sourceBrand: "POPUP", category: "بالونات" }),
      product({ id: "POP-2", sourceBrand: "POPUP", category: "بالونات", rowIndex: 2 }),
      product({ id: "OMR-1", category: "مطبخ", rowIndex: 3 }),
    ];
    const popup = productsByCategory(products, { brand: "POPUP" });
    expect(popup).toEqual([{ key: "بالونات", label: "بالونات", count: 2 }]);
  });

  it("builds distributions", () => {
    const products = [
      product(),
      product({ id: "OMR-2", rowIndex: 2, workflowStatus: "DRAFT", qaStatus: null }),
    ];
    const workflow = workflowDistribution(products).map(s => s.key);
    expect(workflow).toContain("PUBLISHED");
    expect(workflow).toContain("DRAFT");
    const qa = qaDistribution(products).map(s => s.key);
    expect(qa).toContain("PASS");
    expect(qa).toContain("UNVERIFIED");
    expect(inventoryDistribution(products).find(s => s.key === "available")?.count).toBe(2);
  });
});

describe("event-derived metrics", () => {
  it("builds a daily series with real zeros for empty days", () => {
    const now = new Date("2026-09-13T12:00:00Z");
    const series = dailyEventSeries(
      [
        { occurredAt: "2026-09-13T10:00:00Z" },
        { occurredAt: "2026-09-13T11:00:00Z" },
        { occurredAt: "2026-09-11T10:00:00Z" },
      ],
      7,
      now
    );
    expect(series).toHaveLength(7);
    const last = series[6]!;
    expect(last.count).toBe(2);
    expect(series.reduce((sum, p) => sum + p.count, 0)).toBe(3);
  });

  it("ranks top items from real events", () => {
    const items = topItems(
      [
        { product_id: "A", product_name: "مطبخ" },
        { product_id: "A", product_name: "مطبخ" },
        { product_id: "B", product_name: "سيارة" },
        { product_id: "" },
      ],
      "product_id",
      "product_name",
      5
    );
    expect(items[0]).toEqual({ key: "A", label: "مطبخ", count: 2 });
    expect(items[1]!.count).toBe(1);
  });

  it("summarizes whatsapp clicks honestly", () => {
    const now = new Date("2026-09-13T12:00:00Z");
    const summary = summarizeWhatsAppClicks(
      [
        { occurredAt: "2026-09-13T10:00:00Z", product_id: "A", product_name: "مطبخ", category: "مطبخ" },
        { occurredAt: "2026-09-12T10:00:00Z", product_id: "A", product_name: "مطبخ", category: "مطبخ" },
        { occurredAt: "2026-09-01T10:00:00Z", product_id: "B", product_name: "سيارة", category: "ريموت" },
      ],
      now
    );
    expect(summary.total).toBe(3);
    expect(summary.today).toBe(1);
    expect(summary.last7).toBe(2);
    expect(summary.topProducts[0]).toMatchObject({ key: "A", count: 2 });
    expect(summary.trend).toHaveLength(14);
  });
});
