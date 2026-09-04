// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchProducts } from "./productsClient";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";

describe("static products client", () => {
  it("يعيد الكتالوج المحلي فقط دون أي طلب شبكة", async () => {
    const fetchMock = vi.fn(() => {
      throw new Error("The static storefront must not fetch product data");
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchProducts();

    expect(payload.status).toBe("ok");
    expect(payload.products.map(product => product.id)).toEqual(
      PUBLIC_PRODUCTS_SNAPSHOT.map(product => product.id)
    );
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("لا يحتوي إلا على منتجات اجتازت بوابة النشر وصور محلية", async () => {
    const { products } = await fetchProducts();

    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.active).toBe(true);
      expect(product.workflowStatus).toBe("PUBLISHED");
      expect(product.qaStatus).toBe("PASS");
      expect(product.image).toMatch(/^\/products\/processed\//);
    }
  });
});
