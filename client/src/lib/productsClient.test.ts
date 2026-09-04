// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProducts } from "./productsClient";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";
import { makeCatalogUrl } from "./makeGateway";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("products client", () => {
  it("يحاول الكتالوج الحي ثم يعود للـSnapshot عند تعذر الشبكة", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("gateway unavailable")));
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchProducts();

    expect(payload.status).toBe("ok");
    expect(payload.products.map(product => product.id)).toEqual(
      PUBLIC_PRODUCTS_SNAPSHOT.map(product => product.id)
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      makeCatalogUrl(),
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
  });

  it("يستخدم الكتالوج الحي عندما يرجع منتجات منشورة ومجتازة QA", async () => {
    const liveRow = [
      "LIVE-001",
      "منتج حي",
      "",
      "ألعاب",
      "وصف",
      "/products/processed/product-kitchen-46pcs-main.webp",
      "TRUE",
      "1",
      "",
      "PUBLISHED",
      "PASS",
      "",
      "/products/processed/product-kitchen-46pcs-main.webp",
      "",
      "SKU-LIVE-001",
    ];
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          values: [
            [
              "id",
              "name",
              "price",
              "category",
              "description",
              "image",
              "active",
              "sort_order",
              "product_prompt",
              "workflow_status",
              "qa_status",
              "source_drive_id",
              "processed_image",
              "review_reason",
              "sku",
            ],
            liveRow,
          ],
        }),
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { products } = await fetchProducts();

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: "LIVE-001",
      sku: "SKU-LIVE-001",
      active: true,
      workflowStatus: "PUBLISHED",
      qaStatus: "PASS",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
