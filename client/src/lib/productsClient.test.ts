// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { fetchProducts } from "./productsClient";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";
import { POPUP_PRODUCTS_SNAPSHOT } from "./popupProductsSnapshot";
import { makeCatalogUrl } from "./makeGateway";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("products client", () => {
  it("يربط منتجات POP UP الخمسة بالصور المحلية الأصلية القابلة للقراءة", async () => {
    const expectedImages = new Map([
      ["POP-BAL-US-100", "/products/popup/pop-bal-us-100-pro.webp"],
      ["POP-BAL-MET-050", "/products/popup/pop-bal-met-050-pro.webp"],
      ["POP-BAL-PANDA-100", "/products/popup/pop-bal-panda-100-pro.webp"],
      ["POP-BAL-MET-100", "/products/popup/pop-bal-met-100-pro.webp"],
      ["POP-BAL-CHR-050", "/products/popup/pop-bal-chr-050-pro.webp"],
    ]);

    expect(POPUP_PRODUCTS_SNAPSHOT).toHaveLength(5);

    for (const product of POPUP_PRODUCTS_SNAPSHOT) {
      const expectedImage = expectedImages.get(product.id);
      expect(product.image).toBe(expectedImage);
      expect(product.processedImage).toBe(expectedImage);
      expect(product.imageSource).toContain(product.sourceDriveId);

      const assetPath = resolve("public", expectedImage!.replace(/^\//, ""));
      await expect(access(assetPath)).resolves.toBeUndefined();
      await expect(sharp(assetPath).metadata()).resolves.toMatchObject({ format: "webp" });
    }
  });

  it("يحاول الكتالوج الحي ثم يعود للـSnapshot مع منتجات POP UP عند تعذر الشبكة", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("gateway unavailable")));
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchProducts();

    expect(payload.status).toBe("ok");
    expect(payload.products.map(product => product.id)).toEqual([
      ...PUBLIC_PRODUCTS_SNAPSHOT.map(product => product.id),
      ...POPUP_PRODUCTS_SNAPSHOT.map(product => product.id),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      makeCatalogUrl(),
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
  });

  it("يستخدم الكتالوج الحي ويضيف منتجات POP UP إذا لم تكن وصلت للمصدر الحي بعد", async () => {
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

    expect(products).toHaveLength(1 + POPUP_PRODUCTS_SNAPSHOT.length);
    expect(products[0]).toMatchObject({
      id: "LIVE-001",
      sku: "SKU-LIVE-001",
      active: true,
      workflowStatus: "PUBLISHED",
      qaStatus: "PASS",
    });
    expect(products.slice(1).map(product => product.id)).toEqual(
      POPUP_PRODUCTS_SNAPSHOT.map(product => product.id)
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("يحافظ على صور POP UP المحلية عند ترطيب الكتالوج من المصدر الحي", async () => {
    const product = POPUP_PRODUCTS_SNAPSHOT[0];
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          values: [
            [
              "id", "name", "price", "category", "description", "image", "active",
              "sort_order", "product_prompt", "workflow_status", "qa_status",
              "source_drive_id", "processed_image", "review_reason", "sku",
            ],
            [
              product.id, product.name, product.price, product.category, product.description,
              "https://drive.google.com/inaccessible.png", "TRUE", product.sortOrder, "",
              "PUBLISHED", "PASS", product.sourceDriveId,
              "https://drive.google.com/inaccessible-processed.png", "", "",
            ],
          ],
        }),
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { products } = await fetchProducts();
    const hydrated = products.find(item => item.id === product.id);

    expect(hydrated).toMatchObject({
      image: product.image,
      processedImage: product.processedImage,
      imageSource: "https://drive.google.com/inaccessible.png",
      sourceDriveId: product.sourceDriveId,
    });
  });
});
