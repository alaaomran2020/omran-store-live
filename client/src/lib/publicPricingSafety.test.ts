// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@shared/products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";

const source = readFileSync(new URL("../../../public/catalog/products.csv", import.meta.url), "utf8");
const generated = JSON.parse(readFileSync(new URL("../../../public/data/products.generated.json", import.meta.url), "utf8")) as {
  products: { id: string; price?: number | null; description?: string }[];
};

const PRIVATE_PRICE = /سعر\s+(?:الجملة|الشراء|البيع|القطاعي|التجزئة|للتجار)[^.!؟\n]{0,100}[0-9٠-٩۰-۹]/iu;

describe("Public catalogue privacy (WhatsApp enquiry only)", () => {
  it("does not commit financial prices to the repository's public CSV", () => {
    const products = parseProductsCsv(source, {});
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.price, product.id).toBeNull();
      expect(product.description, product.id).not.toMatch(PRIVATE_PRICE);
    }
  });

  it("does not ship financial prices to the browser or generated public JSON", () => {
    for (const product of [...PUBLIC_PRODUCTS_SNAPSHOT, ...generated.products]) {
      expect(product.price, product.id).toBeNull();
      expect(product.description ?? "", product.id).not.toMatch(PRIVATE_PRICE);
    }
  });

  it("keeps the two affected products published and discoverable", () => {
    expect(PUBLIC_PRODUCTS_SNAPSHOT.find(product => product.id === "OMR-SPK-MIC-001")?.name).toBe("سماعة محمولة مع مايك لاسلكي");
    expect(PUBLIC_PRODUCTS_SNAPSHOT.find(product => product.id === "OMR-KIDS-WATCH-001")?.name).toBe("ساعة الأطفال الرقمية");
  });
});
