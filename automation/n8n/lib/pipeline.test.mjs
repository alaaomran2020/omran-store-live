import { describe, expect, it } from "vitest";
import {
  buildPreviewMessage,
  findDuplicates,
  nameSimilarity,
  nextProductId,
  normalizeArabic,
  parseCaption,
  parsePrice,
  parseQuickEdit,
  safeSlug,
  validateAiProduct,
} from "./pipeline.mjs";

describe("parseCaption — حالات الإدخال الثلاث من Telegram", () => {
  it("(أ) صورة بلا caption → كل الحقول null", () => {
    expect(parseCaption("")).toEqual({
      price: null,
      category: null,
      name: null,
      notes: [],
    });
    expect(parseCaption(undefined).price).toBeNull();
  });

  it("(ب) السعر فقط", () => {
    expect(parseCaption("السعر: 350").price).toBe(350);
    expect(parseCaption("السعر 350").price).toBe(350);
    expect(parseCaption("سعر: ٣٥٠").price).toBe(350);
    expect(parseCaption("350").price).toBe(350); // رقم فقط = سعر
    expect(parseCaption("350 جنيه").price).toBe(350);
  });

  it("(ج) السعر + القسم + معلومات إضافية", () => {
    const parsed = parseCaption("السعر: 350\nالقسم: ألعاب بنات\nلون وردي");
    expect(parsed.price).toBe(350);
    expect(parsed.category).toBe("ألعاب بنات");
    expect(parsed.notes).toEqual(["لون وردي"]);
  });

  it("الاسم الصريح يُستخرج", () => {
    expect(parseCaption("الاسم: عروسة أميرة").name).toBe("عروسة أميرة");
  });
});

describe("validateAiProduct — بعد الـAI مباشرة (قسم 6)", () => {
  const good = {
    name: "عروسة أميرة بفستان وردي",
    price: 350,
    category: "عرائس",
    description: "عروسة قماش ناعمة بفستان وردي مناسبة للأطفال.",
    slug: "princess-doll-pink",
    confidence: 0.9,
  };

  it("منتج سليم يمر، والنشر يظل يدويًا دائمًا", () => {
    const v = validateAiProduct(good, { categories: ["عرائس", "سيارات"] });
    expect(v.ok).toBe(true);
    expect(v.needsReview).toBe(true); // لا نشر تلقائي إطلاقًا
    expect(v.lowConfidence).toBe(false);
    expect(v.product.category).toBe("عرائس");
  });

  it("confidence < 0.75 → lowConfidence (يمنع أي نشر تلقائي مستقبلًا)", () => {
    const v = validateAiProduct({ ...good, confidence: 0.5 }, {});
    expect(v.lowConfidence).toBe(true);
  });

  it("سعر المستخدم يعلو على سعر الـAI ولا يُغيَّر", () => {
    const v = validateAiProduct({ ...good, price: 999 }, { userPrice: 350 });
    expect(v.product.price).toBe(350);
  });

  it("price غير رقم وغير null → مشكلة مسجلة، والسعر يصبح null بأمان", () => {
    const v = validateAiProduct({ ...good, price: "غالي" }, {});
    expect(v.problems).toContain("price_invalid");
    expect(v.product.price).toBeNull();
  });

  it("name/description ناقصة → غير صالح (ok=false)", () => {
    expect(validateAiProduct({ ...good, name: "" }, {}).ok).toBe(false);
    expect(validateAiProduct({ ...good, description: null }, {}).ok).toBe(false);
  });

  it("مخرجات AI تالفة تمامًا (ليست object) لا ترمي استثناء", () => {
    expect(() => validateAiProduct(null, {})).not.toThrow();
    expect(validateAiProduct("not json", {}).ok).toBe(false);
    expect(validateAiProduct(undefined, {}).problems).toContain("name_missing");
  });

  it("تصنيف غير موجود في الموقع → category_unknown (بلا اختراع تصنيفات)", () => {
    const v = validateAiProduct(
      { ...good, category: "دراجات نارية" },
      { categories: ["عرائس", "سيارات"] }
    );
    expect(v.problems).toContain("category_unknown");
  });

  it("slug تالف يُشتق من id", () => {
    expect(safeSlug("", "OT-00007")).toBe("product-ot-00007");
    expect(safeSlug("عروسة", "OT-00007")).toBe("product-ot-00007");
    expect(safeSlug("Princess Doll!!", "x")).toBe("princess-doll"); // ينظف الرموز
  });
});

describe("nextProductId — OT-xxxxx متسلسل (قسم 9)", () => {
  it("أول منتج في شيت فارغ أو بمعرفات قديمة", () => {
    expect(nextProductId([])).toBe("OT-00001");
    expect(nextProductId(["001", "002", "row-3"])).toBe("OT-00001");
  });

  it("يكمل التسلسل ويتجاهل غير المطابق", () => {
    expect(nextProductId(["001", "OT-00007", "OT-00002"])).toBe("OT-00008");
    expect(nextProductId(["ot-00019"])).toBe("OT-00020");
  });
});

describe("findDuplicates — كشف التكرار (قسم 10)", () => {
  const rows = [
    { id: "OT-00001", name: "سيارة أطفال سباق" },
    { id: "OT-00002", name: "عروسة قماش كبيرة" },
  ];

  it("تطابق id", () => {
    const d = findDuplicates({ id: "ot-00001", name: "أي اسم" }, rows);
    expect(d.duplicate).toBe(true);
    expect(d.matches[0].reason).toBe("same_id");
  });

  it("تطابق اسم بعد التطبيع (ة/ه، أ/ا)", () => {
    const d = findDuplicates({ id: "OT-00099", name: "عروسه قماش كبيره" }, rows);
    expect(d.duplicate).toBe(true);
    expect(d.matches[0].reason).toBe("same_name");
  });

  it("تشابه عالٍ يُلتقط، والمختلف لا يُلتقط", () => {
    expect(nameSimilarity("سيارة أطفال سباق", "سياره اطفال سباق")).toBe(1);
    const different = findDuplicates(
      { id: "OT-00099", name: "مكعبات تعليمية ملونة" },
      rows
    );
    expect(different.duplicate).toBe(false);
  });

  it("normalizeArabic يزيل التشكيل والتطويل", () => {
    expect(normalizeArabic("سـيَّارَة")).toBe("سياره");
  });
});

describe("parseQuickEdit — تعديل بسيط بلا AI (قسم 14)", () => {
  it("السعر 399", () => {
    expect(parseQuickEdit("السعر 399")).toEqual({ price: 399 });
    expect(parseQuickEdit("399")).toEqual({ price: 399 });
    expect(parseQuickEdit("سعر: ٤٥٠")).toEqual({ price: 450 });
  });

  it("غير الاسم إلى …", () => {
    expect(parseQuickEdit("غير الاسم إلى عروسة أميرة بفستان وردي")).toEqual({
      name: "عروسة أميرة بفستان وردي",
    });
  });

  it("القسم والوصف", () => {
    expect(parseQuickEdit("القسم: عرائس")).toEqual({ category: "عرائس" });
    expect(parseQuickEdit("الوصف: وصف جديد للمنتج")).toEqual({
      description: "وصف جديد للمنتج",
    });
  });

  it("تعديل مركّب → null (يتحول للـAI)", () => {
    expect(parseQuickEdit("خليه مناسب من سن 3 سنوات وارفع السعر شوية")).toBeNull();
    expect(parseQuickEdit("")).toBeNull();
  });
});

describe("buildPreviewMessage — رسالة المراجعة (قسم 11)", () => {
  it("تتضمن كل الحقول وأزرار الحالة", () => {
    const msg = buildPreviewMessage(
      {
        name: "عروسة أميرة",
        price: 350,
        category: "عرائس",
        description: "وصف",
        confidence: 0.9,
      },
      { id: "OT-00009" }
    );
    expect(msg).toContain("🧸 منتج جديد");
    expect(msg).toContain("350 جنيه");
    expect(msg).toContain("OT-00009");
    expect(msg).toContain("🟡 يحتاج مراجعة");
  });

  it("سعر null → السعر عند الطلب، وتحذير التكرار يظهر", () => {
    const msg = buildPreviewMessage(
      { name: "x", price: null, category: "", description: "", confidence: 0.4 },
      {
        id: "OT-00010",
        duplicateWarning: true,
        duplicateMatches: [{ id: "OT-00002", name: "عروسة قماش كبيرة" }],
        lowConfidence: true,
      }
    );
    expect(msg).toContain("السعر عند الطلب");
    expect(msg).toContain("⚠️ يبدو أن هذا المنتج موجود بالفعل.");
    expect(msg).toContain("الثقة منخفضة");
  });
});

describe("parsePrice — تطابق سلوك shared/products.ts", () => {
  it("نفس الحالات الحدية", () => {
    expect(parsePrice("1,250.5")).toBe(1250.5);
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice("")).toBeNull();
  });
});
