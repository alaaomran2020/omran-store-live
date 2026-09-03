// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyOverridesToProducts,
  applyPublicationGate,
  isPubliclyVisible,
  parseOperationalMetadata,
  parseProductsCsv,
  parseQaStatus,
  parseWorkflowStatus,
  type Product,
  type ProductOverride,
} from "@shared/products";

/**
 * PUBLIC PRODUCT = active === true AND workflowStatus === "PUBLISHED"
 *                 AND qaStatus === "PASS"
 *
 * كل اختبارات بوابة النشر هنا. القاعدة Fail-Closed:
 * غياب أي شرط أو قيمته غير معروفة → NOT PUBLIC.
 */

const HEADER =
  "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status,source_drive_id,processed_image,review_reason";

const sheet = (rows: string[]) => [HEADER, ...rows].join("\n");

/** صف كامل بالقيم الافتراضية (منشور + PASS + active). */
const publishedRow = (overrides: Record<number, string> = {}): string => {
  const cells = [
    "P-1", // id
    "منتج", // name
    "100", // price
    "ألعاب", // category
    "وصف", // description
    "", // image
    "TRUE", // active
    "1", // sort_order
    "", // product_prompt
    "PUBLISHED", // workflow_status
    "PASS", // qa_status
    "", // source_drive_id
    "", // processed_image
    "", // review_reason
  ];
  for (const [i, value] of Object.entries(overrides)) {
    cells[Number(i)] = value;
  }
  return cells.join(",");
};

const baseProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "P-1",
  name: "منتج",
  price: 100,
  category: "ألعاب",
  description: "وصف",
  image: null,
  imageSource: null,
  active: true,
  sortOrder: 1,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
  sourceDriveId: null,
  processedImage: null,
  reviewReason: null,
  rowIndex: 1,
  ...overrides,
});

describe("بوابة النشر — 12 حالات Regression", () => {
  it("1) active=true + PASS + PUBLISHED → INCLUDED", () => {
    const products = parseProductsCsv(sheet([publishedRow()]));
    expect(products.map(p => p.id)).toEqual(["P-1"]);
  });

  it("2) active=false + PASS + PUBLISHED → EXCLUDED", () => {
    const products = parseProductsCsv(
      sheet([publishedRow({ 6: "FALSE" })])
    );
    expect(products).toHaveLength(0);
    // التشخيص يبقى قادرًا على رؤيته — بلا فقد للبيانات
    const diagnostics = parseProductsCsv(sheet([publishedRow({ 6: "FALSE" })]), {
      includeInactive: true,
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].active).toBe(false);
  });

  it("3) active=true + NEEDS_REVIEW + PUBLISHED → EXCLUDED", () => {
    const products = parseProductsCsv(
      sheet([publishedRow({ 10: "NEEDS_REVIEW" })])
    );
    expect(products).toEqual([]);
  });

  it("4) active=true + PASS + REVIEW → EXCLUDED", () => {
    const products = parseProductsCsv(
      sheet([publishedRow({ 9: "REVIEW" })])
    );
    expect(products).toEqual([]);
  });

  it("5) missing QA → EXCLUDED (غياب qa_status لا يعني PASS)", () => {
    const products = parseProductsCsv(sheet([publishedRow({ 10: "" })]));
    expect(products).toEqual([]);
  });

  it("6) missing workflow status → EXCLUDED (غياب workflow_status لا يعني PUBLISHED)", () => {
    const products = parseProductsCsv(sheet([publishedRow({ 9: "" })]));
    expect(products).toEqual([]);
  });

  it("7) malformed row → لا يكسر الكتالوج", () => {
    const products = parseProductsCsv(
      sheet([
        "لم يتم تحديد أعمدة",
        publishedRow({ 0: "OK-1", 1: "منتج صالح" }),
        ",,,,,,,,", // صف فارغ
        "9", // أعمدة ناقصة جدًا
        publishedRow({ 0: "OK-2", 1: "منتج صالح آخر" }),
      ])
    );
    expect(products.map(p => p.id)).toEqual(["OK-1", "OK-2"]);
  });

  it("8) duplicate IDs → لا تسريب ولا فقد غير متوقع", () => {
    const products = parseProductsCsv(
      sheet([
        publishedRow({ 0: "DUP", 1: "الأول" }),
        publishedRow({ 0: "DUP", 1: "الثاني" }),
        publishedRow({ 0: "DUP", 1: "الثالث" }),
      ])
    );
    const ids = products.map(p => p.id);
    expect(new Set(ids).size).toBe(3); // كل المنتجات محفوظة (لا فقد)
    expect(ids[1]).toBe("DUP-2"); // تفريغ حتمي مستقر (لا تسريب عبر overwrite)
    expect(ids[2]).toBe("DUP-3");
  });

  it("9) blank price → price=null", () => {
    const [product] = parseProductsCsv(
      sheet([publishedRow({ 2: "" })])
    );
    expect(product.price).toBeNull();
  });

  it("10) Arabic data → preserved", () => {
    const [product] = parseProductsCsv(
      sheet([
        publishedRow({
          1: "مطبخ ألعاب للأطفال — ٤٦ قطعة",
          3: "ألعاب مطبخ",
          4: "وصف عربي كامل",
        }),
      ])
    );
    expect(product.name).toBe("مطبخ ألعاب للأطفال — ٤٦ قطعة");
    expect(product.category).toBe("ألعاب مطبخ");
    expect(product.description).toBe("وصف عربي كامل");
  });

  it("11) CSV quoted fields/newlines → preserved", () => {
    const csv = [
      HEADER,
      `"P-1","منتج بينه, فاصلة","100","ألعاب","سطر أول
سطر ثانٍ","","TRUE","1","","PUBLISHED","PASS","","",""`,
    ].join("\n");
    const [product] = parseProductsCsv(csv);
    expect(product.name).toBe("منتج بينه, فاصلة");
    expect(product.description).toBe("سطر أول\nسطر ثانٍ");
  });

  it("12) Overrides → لا تستطيع تجاوز Publication Gate", () => {
    const needsReview = baseProduct({
      id: "NR-1",
      workflowStatus: "PUBLISHED",
      qaStatus: "NEEDS_REVIEW",
      active: false,
    });
    const review = baseProduct({
      id: "REV-1",
      workflowStatus: "REVIEW",
      qaStatus: "PASS",
      active: false,
    });
    const published = baseProduct({ id: "OK-1" });

    const overrides: ProductOverride[] = [
      { productId: "NR-1", active: true },
      { productId: "REV-1", active: true },
      { productId: "OK-1", name: "مُعدَّل", price: 123 },
    ];

    // نفس المسار العام (worker/index.ts): دمج Overrides ثم Final Guard.
    const merged = applyOverridesToProducts(
      [needsReview, review, published],
      overrides
    );
    const result = applyPublicationGate(merged);

    // المحاولة صفرت: حتى مع active=true لا يُنشر NEEDS_REVIEW/REVIEW.
    expect(result.map(p => p.id)).toEqual(["OK-1"]);
    expect(result[0].name).toBe("مُعدَّل"); // التعديلات على المنشور سارية
    expect(result[0].price).toBe(123);
  });
});

describe("بوابة النشر — سلوك إضافي (Fail-Closed)", () => {
  it("قيمة حالة غير معروفة → غير معروف (لا يُفترض PASS/PUBLISHED)", () => {
    expect(parseQaStatus("maybe ok")).toBeNull();
    expect(parseQaStatus("")).toBeNull();
    expect(parseWorkflowStatus("on shelf")).toBeNull();
    expect(parseWorkflowStatus("")).toBeNull();
  });

  it("active=true وحدها لا تكفي للنشر", () => {
    const [product] = parseProductsCsv(
      sheet([publishedRow({ 9: "", 10: "" })])
    );
    expect(product).toBeUndefined();
  });

  it("PUBLISHED + PASS + active=true هي المجموعة الوحيدة المعتمدة", () => {
    const products = parseProductsCsv(
      sheet([
        publishedRow({ 0: "A", 1: "منشور" }),
        publishedRow({ 0: "B", 1: "بلا QA", 10: "" }),
        publishedRow({ 0: "C", 1: "بلا إصدار", 9: "" }),
        publishedRow({ 0: "D", 1: "مخفي", 6: "FALSE" }),
        publishedRow({ 0: "E", 1: "تحت مراجعة", 10: "NEEDS_REVIEW" }),
      ])
    );
    expect(products.map(p => p.id)).toEqual(["A"]);
  });

  it("NEEDS_REVIEW مع active=false يبقى في التشخيص ولا يُنشر", () => {
    const csv = sheet([
      publishedRow({
        0: "HOLD-1",
        6: "FALSE",
        9: "REVIEW",
        10: "NEEDS_REVIEW",
        11: "1AaBbCcDdEeFfGgHhIiJj",
        12: "/products/held.webp",
        13: "صورة غير مطابقة للمنتج — بانتظار تأكيد المالك",
      }),
    ]);
    expect(parseProductsCsv(csv)).toHaveLength(0);
    const diag = parseProductsCsv(csv, { includeNonPublished: true });
    expect(diag).toHaveLength(1);
    expect(diag[0].workflowStatus).toBe("REVIEW");
    expect(diag[0].qaStatus).toBe("NEEDS_REVIEW");
    expect(diag[0].sourceDriveId).toBe("1AaBbCcDdEeFfGgHhIiJj");
    expect(diag[0].reviewReason).toContain("غير مطابقة");
  });
});

describe("طبقة compatibility القديمة (product_prompt)", () => {
  it("qa/processed/source من product_prompt تُقرأ فقط عند غياب العمود ولا تمنح نشرًا", () => {
    const csv = [
      "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status,source_drive_id,processed_image,review_reason",
      `RAW-1,منتج قديم,,"ألعاب",,https://drive.google.com/file/d/1AaBbCcDdEeFfGgHhIiJjKkLl/view,TRUE,1,"source_drive_id=1AaBbCcDdEeFfGgHhIiJjKkLl; qa=PASS; processed=product-raw-1.webp",,,, ,`,
    ].join("\n");
    // بدون workflow_status صريح → مستبعد (لا اشتقاق نشر من البرومبت).
    expect(parseProductsCsv(csv)).toHaveLength(0);

    const diag = parseProductsCsv(csv, { includeNonPublished: true });
    expect(diag).toHaveLength(1);
    expect(diag[0].qaStatus).toBe("PASS"); // legacy qa token مقبول كـ metadata
    expect(diag[0].workflowStatus).toBeNull(); // لكن ليس نشرًا
    expect(diag[0].sourceDriveId).toBe("1AaBbCcDdEeFfGgHhIiJjKkLl");
    expect(diag[0].processedImage).toBe("product-raw-1.webp");
    expect(diag[0].image).toContain("thumbnail?id=1AaBbCcDdEeFfGgHhIiJjKkLl");
  });

  it("العمود First-Class يعلو legacy: عمود qa_status فارغ فقط يسمح بالوراثة", () => {
    const csv = [
      "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status,source_drive_id,processed_image,review_reason",
      `OK-1,منتج,100,ألعاب,وصف,,TRUE,1,"qa=PASS",PUBLISHED,,, ,`,
      `BAD-1,منتج,100,ألعاب,وصف,,TRUE,1,"qa=PASS",PUBLISHED,FAILED,,, ,`,
    ].join("\n");
    // الصف الأول: عمود qa فارغ → PASS من legacy → منشور.
    // الصف الثاني: عمود FAILED صريح → FAILED (لا وراثة) → مستبعد.
    expect(parseProductsCsv(csv).map(p => p.id)).toEqual(["OK-1"]);
  });
});

describe("applyPublicationGate", () => {
  it("لا يتساهل مع أي منتج غير مطابق ولو كان في مجموعة تشخيصية", () => {
    const catalog = [
      baseProduct({ id: "A" }),
      baseProduct({ id: "B", qaStatus: "REVIEW" }),
      baseProduct({ id: "C", workflowStatus: "NEEDS_REVIEW" }),
      baseProduct({ id: "D", active: false }),
      baseProduct({ id: "E", qaStatus: null }),
      baseProduct({ id: "F", workflowStatus: null }),
    ];
    expect(applyPublicationGate(catalog).map(p => p.id)).toEqual(["A"]);
  });
});

describe("طبقة التوافق — parseOperationalMetadata", () => {
  it("تفك metadata الاستيراد الفعلي كما هي في الشيت الحي", () => {
    const meta = parseOperationalMetadata(
      "source_drive_id=1I_QGGoYTxq7zdfd5UgWFReB7MS9Tg36U; qa=PASS; processed=product-omr-raw-001-main.webp"
    );
    expect(meta).toEqual({
      sourceDriveId: "1I_QGGoYTxq7zdfd5UgWFReB7MS9Tg36U",
      qaStatus: "PASS",
      processedImage: "product-omr-raw-001-main.webp",
      reviewReason: null,
    });
  });

  it("reason= الموثقة تُرفق بسبب العزل (دليل لا اجتهاد)", () => {
    const meta = parseOperationalMetadata(
      "source_drive_id=abc123; qa=NEEDS_REVIEW; processed=p.webp; reason=possible duplicate/variant of OMR-RAW-013; uniqueness not proven"
    );
    expect(meta.qaStatus).toBe("NEEDS_REVIEW");
    expect(meta.reviewReason).toContain("possible duplicate/variant of OMR-RAW-013");
  });

  it("نص وصفي حر (برومبت عادي) لا يُفهم كدليل تشغيلي", () => {
    const meta = parseOperationalMetadata(
      "سيارة رياضية حمراء على خلفية بيضاء داخل مستودع"
    );
    expect(meta.qaStatus).toBeNull();
    expect(meta.sourceDriveId).toBeNull();
  });

  it("العمود الصريح qa_status يعلو طبقة التوافق دائمًا", () => {
    const csv = sheet([publishedRow({ 0: "C1", 8: "qa=PASS", 10: "NEEDS_REVIEW" })]);
    expect(parseProductsCsv(csv)).toHaveLength(0); // العمود هو القرار
    const diag = parseProductsCsv(csv, { includeNonPublished: true });
    expect(diag[0].qaStatus).toBe("NEEDS_REVIEW");
  });

  it("الفارغ فقط في العمود يسمح بوراثة دليل الـmetadata (qa=PASS)", () => {
    // هذا هو شكل الشيت الحي اليوم: qa=PASS داخل product_prompt
    const csv = sheet([publishedRow({ 0: "RAW-1", 8: "source_drive_id=1X0k; qa=PASS; processed=p.webp" })]);
    expect(parseProductsCsv(csv).map(p => p.id)).toEqual(["RAW-1"]);
    const [product] = parseProductsCsv(csv);
    expect(product.qaStatus).toBe("PASS");
    expect(product.sourceDriveId).toBe("1X0k");
    expect(product.processedImage).toBe("p.webp");
  });
});

describe("كشف تكرار الأسماء بين المنتجات العامة", () => {
  it("اسمان متطابقان بين مرشحين للنشر → كلاهما معزول duplicate_name", () => {
    const csv = sheet([
      publishedRow({ 0: "D1", 1: "سيارة سباق بالريموت" }),
      publishedRow({ 0: "D2", 1: "سيارة سباق بالريموت" }),
      publishedRow({ 0: "D3", 1: "منتج سليم" }),
    ]);
    expect(parseProductsCsv(csv).map(p => p.id)).toEqual(["D3"]);
    const diag = parseProductsCsv(csv, { includeInactive: true });
    expect(diag.find(p => p.id === "D1")!.reviewReason).toBe("duplicate_name");
    expect(diag.find(p => p.id === "D2")!.reviewReason).toBe("duplicate_name");
  });

  it("تطبيع عربي: التشكيل/التطويل/الحالة لا تخفي التكرار", () => {
    const csv = sheet([
      publishedRow({ 0: "E1", 1: "عـروسة أميـرة" }),
      publishedRow({ 0: "E2", 1: "عروسة  أميرة" }),
    ]);
    expect(parseProductsCsv(csv)).toHaveLength(0);
  });

  it("تكرار الاسم مع صف غير عام لا يعزل المنتج الموثق", () => {
    // صف legacy بنفس اسم منتج موثق: الlegacy معزول بسببه الخاص، والموثق يبقى عامًا
    const csv = sheet([
      publishedRow({ 0: "F1", 1: "سيارة سباق بالريموت", 9: "", 10: "" }),
      publishedRow({ 0: "F2", 1: "سيارة سباق بالريموت" }),
    ]);
    expect(parseProductsCsv(csv).map(p => p.id)).toEqual(["F2"]);
    const diag = parseProductsCsv(csv, { includeInactive: true });
    expect(diag.find(p => p.id === "F1")!.reviewReason).toBe("missing_workflow_status");
  });
});

describe("عقد الحارس isPubliclyVisible / applyPublicationGate", () => {
  it("ثلاثي المفاتيح صراحةً — أي خلل يعني غير عام", () => {
    expect(isPubliclyVisible(baseProduct())).toBe(true);
    expect(isPubliclyVisible(baseProduct({ active: false }))).toBe(false);
    expect(isPubliclyVisible(baseProduct({ workflowStatus: "REVIEW" }))).toBe(false);
    expect(isPubliclyVisible(baseProduct({ workflowStatus: null }))).toBe(false);
    expect(isPubliclyVisible(baseProduct({ qaStatus: "NEEDS_REVIEW" }))).toBe(false);
    expect(isPubliclyVisible(baseProduct({ qaStatus: null }))).toBe(false);
    expect(isPubliclyVisible(baseProduct({ qaStatus: "FAIL" }))).toBe(false);
  });
});
