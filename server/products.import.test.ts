// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@shared/products";
import { canonicalCategory } from "@shared/taxonomy";

/**
 * يتحقق من ملف الاستيراد الحقيقي (بيانات منتجات موثّقة نُقلت من المستودع
 * المرجعي) عبر نفس محلّل الإنتاج — بلا اختراع بيانات.
 *
 * ملاحظة سياسة (Fail-Closed): هذا الملف قديم ويحمل 9 أعمدة فقط بلا
 * workflow_status / qa_status — لذلك في الوضع العام (Public) يعود صفرًا:
 * البيانات القديمة بدون source evidence + حالات نشر صريحة لا تُنشر.
 * في وضع التشخيص نقرأها كاملة ونتحقق من سلامة القيم (لا فقد للبيانات).
 */

const CSV_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "docs",
  "omran-real-products-import.csv"
);

const csv = fs.readFileSync(CSV_PATH, "utf-8");

describe("ملف استيراد المنتجات الحقيقية (legacy)", () => {
  it("يُقرأ بوضع التشخيص: أربعة منتجات بمعرّفات فريدة (SKU حقيقي)", () => {
    const products = parseProductsCsv(csv, { includeNonPublished: true });
    expect(products).toHaveLength(4);
    const ids = products.map(product => product.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids).toContain("OMR-IG-KIT-46");
    expect(ids).toContain("OMR-IG-SQ-01");
    expect(ids).toContain("OMR-IG-HC-104");
  });

  it("كل منتج له اسم وسعر EGP صالح وتصنيف معروف", () => {
    const products = parseProductsCsv(csv, { includeNonPublished: true });
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
    const products = parseProductsCsv(csv, { includeNonPublished: true });
    const ported = products.filter(product => product.id.startsWith("OMR-"));
    expect(ported).toHaveLength(3);
    for (const product of ported) {
      expect(product.image, product.id).toMatch(
        /^https:\/\/omrantoys\.store\/products\/omran-product-\d{2}\.jpg$/
      );
    }
  });

  it("منتج الشيت الحالي (id=1) بلا صورة — موثّق كناقص وليس مختلَقًا", () => {
    const products = parseProductsCsv(csv, { includeNonPublished: true });
    const rcCar = products.find(product => product.id === "1");
    expect(rcCar).toBeDefined();
    expect(rcCar!.image).toBeNull();
  });

  it("ترتيب العرض عبر sort_order تصاعديًا", () => {
    const products = parseProductsCsv(csv, { includeNonPublished: true });
    const orders = products.map(product => product.sortOrder);
    expect(orders).toEqual([1, 2, 3, 4]);
  });

  it("PUBLIC GATE: الملف القديم بلا حالات أول-فئة → لا يُنشر شيء (Fail-Closed)", () => {
    expect(parseProductsCsv(csv)).toHaveLength(0);
    // ما دام لا توجد workflow_status/qa_status في الشيت، لا توجد استثناءات.
    for (const product of parseProductsCsv(csv, { includeNonPublished: true })) {
      expect(product.workflowStatus).toBe("");
      expect(product.qaStatus).toBe("");
    }
  });
});
