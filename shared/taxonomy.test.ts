import { describe, expect, it } from "vitest";
import {
  AGE_GROUPS,
  CATEGORIES,
  canonicalCategory,
  normalizeCategoryName,
} from "./taxonomy";

describe("normalizeCategoryName", () => {
  it("يطوي الصيغ المكررة الشائعة لنفس التصنيف", () => {
    const base = normalizeCategoryName("سيارات");
    expect(normalizeCategoryName("السيارات")).toBe(base);
    expect(normalizeCategoryName("سيارات أطفال")).toBe(base);
    expect(normalizeCategoryName("العاب سيارات")).toBe(base);
  });

  it("يوحد الهمزات والتاء المربوطة والمسافات", () => {
    expect(normalizeCategoryName("  دمى  وألعاب   أطفال ")).toBe(
      normalizeCategoryName("دمي")
    );
  });
});

describe("canonicalCategory", () => {
  it("أمثلة المستخدم الأربعة → تصنيف واحد", () => {
    const ids = ["سيارات", "السيارات", "سيارات أطفال", "العاب سيارات"].map(
      input => canonicalCategory(input)?.id
    );
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe("rc-electronic");
  });

  it("يعرف التصنيف بالـslug أو بالاسم العربي", () => {
    expect(canonicalCategory("arts-crafts")?.id).toBe("arts-crafts");
    expect(canonicalCategory("فوانيس رمضان")?.id).toBe("ramadan-lanterns");
    expect(canonicalCategory("اسكوشي")?.id).toBe("arts-crafts");
  });

  it("يرد null للاسم غير المعروف (لا اختراع)", () => {
    expect(canonicalCategory("")).toBeNull();
    expect(canonicalCategory("تصنيف غير موجود إطلاقًا")).toBeNull();
  });
});

describe("سلامة المعجم", () => {
  it("معرّفات وسلوجات فريدة وترتيب كامل", () => {
    const ids = CATEGORIES.map(category => category.id);
    const slugs = CATEGORIES.map(category => category.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    const orders = CATEGORIES.map(category => category.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("فئات عمرية كاملة بالمعرّفات المتوقعة", () => {
    expect(AGE_GROUPS.map(group => group.id)).toEqual([
      "0-2",
      "3-5",
      "6-8",
      "9-12",
      "12+",
    ]);
  });
});
