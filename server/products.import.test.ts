// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@shared/products";
import { canonicalCategory } from "@shared/taxonomy";

/**
 * يتحقق من ملف الاستيراد الحقيقي (بيانات منتجات موثّقة نُقلت من المستودع
 * المرجعي) عبر نفس المحلّل الذي يستخدمه الـWorker والـExpress — بلا اختراع
 * بيانات: أي حقل ناقص يجب أن يبقى ناقصًا وموثّقًا في التقرير.
 */
const CSV_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "docs",
  "omran-real-products-import.csv"
);

const csv = fs.readFileSync(CSV_PATH, "utf-8");
const products = parseProductsCsv(csv);

describe("ملف استيراد المنتجات الحقيقية", () => {
  it("أربعة منتجات فعّالة بمعرّفات فريدة (SKU حقيقي)", () => {
    expect(products).toHaveLength(4);
    const ids = products.map(product => product.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids).toContain("OMR-IG-KIT-46");
    expect(ids).toContain("OMR-IG-SQ-01");
    expect(ids).toContain("OMR-IG-HC-104");
  });

  it("كل منتج له اسم وسعر EGP صالح وتصنيف معروف", () => {
    for (const product of products) {
      expect(product.name.length, product.id).toBeGreaterThan(0);
      expect(product.price, product.id).toBeTypeOf("number");
      expect(product.price!, product.id).toBeGreaterThan(0);
      expect(product.category.length, product.id).toBeGreaterThan(0);
      expect(canonicalCategory(product.category), product.id).not.toBeNull();
      expect(product.active, product.id).toBe(true);
    }
  });

  it("المنتجات المنقولة لها صور حقيقية على النطاق الأساسي", () => {
    const ported = products.filter(product =>
      product.id.startsWith("OMR-")
    );
    expect(ported).toHaveLength(3);
    for (const product of ported) {
      expect(product.image, product.id).toMatch(
        /^https:\/\/omrantoys\.store\/products\/omran-product-\d{2}\.jpg$/
      );
    }
  });

  it("منتج الشيت الحالي (id=1) بلا صورة — موثّق كناقص وليس مختلَقًا", () => {
    const rcCar = products.find(product => product.id === "1");
    expect(rcCar).toBeDefined();
    expect(rcCar!.image).toBeNull();
  });

  it("ترتيب العرض عبر sort_order تصاعديًا", () => {
    const orders = products.map(product => product.sortOrder);
    expect(orders).toEqual([1, 2, 3, 4]);
  });
});
