// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { fetchProducts, getInitialProductsSnapshot, loadPublishedCatalog } from "./productsClient";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";
import { POPUP_PRODUCTS_SNAPSHOT } from "./popupProductsSnapshot";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("products client", () => {
  it("لا ينشر أصناف POP UP القديمة أثناء إعادة الجرد", () => {
    expect(POPUP_PRODUCTS_SNAPSHOT).toEqual([]);
  });

  it("يبني الكتالوج من اللقطة المعتمدة داخل المستودع دون أي نداء شبكة", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("no network is allowed for the catalog")));
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchProducts();

    expect(payload.status).toBe("ok");
    expect(payload.products.map(product => product.id)).toEqual([
      ...PUBLIC_PRODUCTS_SNAPSHOT.map(product => product.id),
      ...POPUP_PRODUCTS_SNAPSHOT.map(product => product.id),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("يعيد نفس الكتالوج حرفيًا عند كل استدعاء (حتمي ومستقل عن الشبكة)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network is allowed for the catalog"))));

    const first = await fetchProducts();
    const second = await loadPublishedCatalog();
    const third = getInitialProductsSnapshot();

    const ids = (payload: { products: { id: string }[] }) => payload.products.map(product => product.id);
    expect(ids(second)).toEqual(ids(first));
    expect(ids(third)).toEqual(ids(first));
    expect(first.products).toHaveLength(
      PUBLIC_PRODUCTS_SNAPSHOT.length + POPUP_PRODUCTS_SNAPSHOT.length
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("يحافظ على صور POP UP المحلية ومصادر درايف كمرجع توثيقي فقط", async () => {
    const { products } = await fetchProducts();

    for (const expected of POPUP_PRODUCTS_SNAPSHOT) {
      const hydrated = products.find(item => item.id === expected.id);
      expect(hydrated).toMatchObject({
        image: expected.image,
        processedImage: expected.processedImage,
        sourceDriveId: expected.sourceDriveId,
      });
      expect(hydrated!.image!.startsWith("/products/popup/")).toBe(true);
    }
  });

  it("يعرض 32 منتج رمضان بدون سعر، ويستخدم صور WebP محلية ومعرض صور معتمد", async () => {
    const { products } = await fetchProducts();
    const ramadan = products.filter(p => p.category === "ramadan-lanterns");
    expect(ramadan).toHaveLength(21);
    expect(ramadan.every(p => p.price === null && p.availability === "unknown")).toBe(true);
    expect(ramadan.every(p => p.workflowStatus === "PUBLISHED" && p.qaStatus === "PASS")).toBe(true);
    expect(ramadan.reduce((sum, p) => sum + 1 + p.galleryImages.length, 0)).toBe(24);
    expect(ramadan.filter(p => p.galleryImages.length === 1)).toHaveLength(3);

    for (const product of ramadan) {
      expect(product.image?.startsWith("/products/processed/ramadan/")).toBe(true);
      for (const path of [product.image!, ...product.galleryImages]) {
        const assetPath = resolve("public", path.replace(/^\//, ""));
        await expect(access(assetPath)).resolves.toBeUndefined();
        await expect(sharp(assetPath).metadata()).resolves.toMatchObject({ format: "webp" });
      }
    }
  });

  it("لا يحتفظ بأي نقطة نهاية كتالوج خارجية داخل وحدة العميل", async () => {
    const source = await readFile(
      resolve("client/src/lib/productsClient.ts"),
      "utf8"
    );
    for (const forbidden of [
      "script.google.com",
      "docs.google.com",
      "hook.eu1.make.com",
      "makeCatalogUrl",
      "action=catalog",
      "PRODUCTS_SHEET_URL",
    ]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });
});
