import { describe, expect, it } from "vitest";
import {
  createProductsCache,
  driveFileId,
  fallbackImageUrl,
  fetchProductsPayload,
  normalizeSheetUrl,
  parseActive,
  parseCsv,
  parsePrice,
  parseProductsCsv,
  parseSortOrder,
  productCategories,
  searchProducts,
  sortProducts,
  toDisplayableImageUrl,
  type Product,
} from "@shared/products";

const HEADER =
  "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status,source_drive_id,processed_image,review_reason";

/**
 * سطور اختبار قصيرة (9 أعمدة) تُكمَّل تلقائيًا بحقول النشر المعتمدة:
 * active=true + PUBLISHED + PASS — وإلا كان الوضع العام يستبعدها (Fail-Closed).
 * الصفوف التي تختبر صراحةً حالة النشر تمرَّر ببياناتها الكاملة.
 */
const csv = (...rows: string[]) =>
  [HEADER, ...rows.map(row => `${row},PUBLISHED,PASS,,,`)].join("\n");

describe("parseCsv", () => {
  it("يتعامل مع الاقتباس والفواصل والأسطر داخل الحقول", () => {
    const rows = parseCsv('a,"b,c","خط أول\nخط ثانٍ"\n1,2,3\n');
    expect(rows).toEqual([
      ["a", "b,c", "خط أول\nخط ثانٍ"],
      ["1", "2", "3"],
    ]);
  });

  it("يتجاهل BOM والأسطر الفارغة و CRLF", () => {
    expect(parseCsv("\uFEFFa,b\r\n\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("لا ينهار مع اقتباس غير مغلق", () => {
    expect(() => parseCsv('a,"b')).not.toThrow();
  });
});

describe("تحويل الأنواع", () => {
  it("price: أرقام عربية وفواصل وعملة ونصوص غير صالحة", () => {
    expect(parsePrice("250")).toBe(250);
    expect(parsePrice("1,250.5")).toBe(1250.5);
    expect(parsePrice("٢٥٠")).toBe(250);
    expect(parsePrice("250 ج.م")).toBe(250);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("اتصل بنا")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });

  it("active: TRUE/FALSE ومرادفاتها، والفارغ يعني معروضًا", () => {
    expect(parseActive("TRUE")).toBe(true);
    expect(parseActive("true")).toBe(true);
    expect(parseActive("1")).toBe(true);
    expect(parseActive("نعم")).toBe(true);
    expect(parseActive("")).toBe(true);
    expect(parseActive("FALSE")).toBe(false);
    expect(parseActive("0")).toBe(false);
    expect(parseActive("لا")).toBe(false);
  });

  it("sort_order: رقم أو null", () => {
    expect(parseSortOrder("3")).toBe(3);
    expect(parseSortOrder("٣")).toBe(3);
    expect(parseSortOrder("")).toBeNull();
    expect(parseSortOrder("abc")).toBeNull();
  });
});

describe("parseProductsCsv", () => {
  it("يقرأ صفًا كاملًا بالأنواع الصحيحة", () => {
    const [product] = parseProductsCsv(
      csv(
        '001,سيارة أطفال سباق,250,سيارات,وصف المنتج,https://cdn.example.com/car.jpg,TRUE,1,"برومبت"'
      )
    );
    expect(product).toMatchObject<Partial<Product>>({
      id: "001",
      name: "سيارة أطفال سباق",
      price: 250,
      category: "سيارات",
      description: "وصف المنتج",
      image: "https://cdn.example.com/car.jpg",
      active: true,
      sortOrder: 1,
      productPrompt: "برومبت",
    });
  });

  it("يخفي المنتجات inactive عن الموقع العام", () => {
    const products = parseProductsCsv(
      csv("1,معروض,10,ألعاب,,,TRUE,1,", "2,مخفي,10,ألعاب,,,FALSE,2,")
    );
    expect(products.map(p => p.name)).toEqual(["معروض"]);
    expect(
      parseProductsCsv(csv("2,مخفي,10,ألعاب,,,FALSE,2,"), {
        includeInactive: true,
      })
    ).toHaveLength(1);
  });

  it("لا ينكسر مع صفوف تالفة أو ناقصة أو فارغة", () => {
    const products = parseProductsCsv(
      csv(
        ",,,,,,,,", // صف فارغ تمامًا
        "9", // أعمدة ناقصة جدًا
        "10,منتج بلا سعر,,,,,,,", // بلا سعر ولا صورة
        "11,منتج بسعر تالف,abc,ألعاب,وصف,,,,",
        // صف بأعمدة زائدة: يُكتب بحقول نشر كاملة حتى لا تُصبح الأعمدة الزائدة
        // حالات نشر غير معروفة فيُستبعد (سلوك Fail-Closed صحيح لكنه خارج هذا الاختبار)
        "12,منتج بأعمدة زائدة,50,ألعاب,وصف,,TRUE,5,برومبت,PUBLISHED,PASS,,,,زيادة,زيادة أخرى"
      )
    );
    expect(products.map(p => p.name)).toEqual([
      "منتج بأعمدة زائدة",
      "منتج بلا سعر",
      "منتج بسعر تالف",
    ]);
    expect(products.find(p => p.name === "منتج بلا سعر")?.price).toBeNull();
    expect(products.find(p => p.name === "منتج بلا سعر")?.image).toBeNull();
    expect(products.find(p => p.name === "منتج بسعر تالف")?.price).toBeNull();
  });

  it("يولّد معرّفًا للصفوف بلا id ويفض تكرار المعرّفات", () => {
    const products = parseProductsCsv(
      csv(",منتج أ,10,,,,,,", "007,منتج ب,10,,,,,,", "007,منتج ج,10,,,,,,")
    );
    const ids = products.map(p => p.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain("row-1");
  });

  it("يرتّب حسب sort_order ثم حسب ترتيب الشيت للصفوف بلا ترتيب", () => {
    const products = parseProductsCsv(
      csv(
        "a,ثالث,10,,,,,3,",
        "b,بلا ترتيب أول,10,,,,,,",
        "c,أول,10,,,,,1,",
        "d,بلا ترتيب ثانٍ,10,,,,,,"
      )
    );
    expect(products.map(p => p.name)).toEqual([
      "أول",
      "ثالث",
      "بلا ترتيب أول",
      "بلا ترتيب ثانٍ",
    ]);
  });

  it("يقبل شيتًا بلا صف عناوين (الترتيب القياسي للأعمدة)", () => {
    const products = parseProductsCsv(
      "001,منتج بلا رأس,99,ألعاب,وصف,,TRUE,1,,PUBLISHED,PASS,,,"
    );
    expect(products).toHaveLength(1);
    expect(products[0].price).toBe(99);
  });

  it("يقبل أعمدة بأسماء عربية أو بترتيب مختلف", () => {
    const products = parseProductsCsv(
      [
        "الاسم,السعر,التصنيف,الصورة,الحالة,حالة_النشر,حالة_المراجعة",
        "لعبة,75,ألعاب,,TRUE,PUBLISHED,PASS",
      ].join("\n")
    );
    expect(products[0]).toMatchObject({
      name: "لعبة",
      price: 75,
      category: "ألعاب",
    });
  });

  it("يستخرج التصنيفات ويبحث في الاسم والوصف والتصنيف", () => {
    const products = parseProductsCsv(
      csv(
        "1,سيارة سباق,10,سيارات,لعبة سريعة,,TRUE,1,",
        "2,مكعبات,20,تعليمية,بناء,,TRUE,2,"
      )
    );
    expect(productCategories(products)).toEqual(["سيارات", "تعليمية"]);
    expect(searchProducts(products, "سيارة").map(p => p.id)).toEqual(["1"]);
    expect(searchProducts(products, "تعليمية").map(p => p.id)).toEqual(["2"]);
    expect(searchProducts(products, "  ").map(p => p.id)).toEqual(["1", "2"]);
  });
});

describe("صور Google Drive", () => {
  it("يحوّل روابط المشاركة إلى صيغة عرض مباشرة", () => {
    const expected =
      "https://drive.google.com/thumbnail?id=1AaBbCcDdEeFfGg&sz=w1000";
    expect(
      toDisplayableImageUrl(
        "https://drive.google.com/file/d/1AaBbCcDdEeFfGg/view?usp=sharing"
      )
    ).toBe(expected);
    expect(
      toDisplayableImageUrl("https://drive.google.com/open?id=1AaBbCcDdEeFfGg")
    ).toBe(expected);
    expect(
      toDisplayableImageUrl(
        "https://drive.google.com/uc?export=view&id=1AaBbCcDdEeFfGg"
      )
    ).toBe(expected);
    expect(
      toDisplayableImageUrl(
        "https://drive.usercontent.google.com/download?id=1AaBbCcDdEeFfGg"
      )
    ).toBe(expected);
  });

  it("يترك الروابط العادية كما هي ويرفض غير الآمنة", () => {
    expect(toDisplayableImageUrl("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg"
    );
    expect(toDisplayableImageUrl("javascript:alert(1)")).toBeNull();
    expect(toDisplayableImageUrl("")).toBeNull();
    expect(toDisplayableImageUrl(null)).toBeNull();
  });

  it("يوفّر بديلًا ثانيًا لملفات Drive فقط", () => {
    expect(
      driveFileId("https://drive.google.com/file/d/1AaBbCcDdEeFfGg/view")
    ).toBe("1AaBbCcDdEeFfGg");
    expect(
      fallbackImageUrl("https://drive.google.com/file/d/1AaBbCcDdEeFfGg/view")
    ).toBe("https://lh3.googleusercontent.com/d/1AaBbCcDdEeFfGg=w1000");
    expect(fallbackImageUrl("https://cdn.example.com/a.jpg")).toBeNull();
  });
});

describe("normalizeSheetUrl", () => {
  it("يقبل رابط CSV المنشور كما هو", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv";
    expect(normalizeSheetUrl(url)).toBe(url);
  });

  it("يصلح رابط pubhtml ورابط التحرير", () => {
    expect(
      normalizeSheetUrl(
        "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pubhtml"
      )
    ).toContain("/pub?output=csv");
    const fromEdit = normalizeSheetUrl(
      "https://docs.google.com/spreadsheets/d/1SheetId123/edit#gid=42"
    );
    expect(fromEdit).toBe(
      "https://docs.google.com/spreadsheets/d/1SheetId123/export?format=csv&gid=42"
    );
  });

  it("يرفض ما ليس رابطًا آمنًا، ويمرر استضافة CSV بديلة عبر https", () => {
    expect(normalizeSheetUrl("https://cdn.example.com/products.csv")).toBe(
      "https://cdn.example.com/products.csv"
    );
    expect(normalizeSheetUrl("http://cdn.example.com/products.csv")).toBeNull();
    expect(normalizeSheetUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSheetUrl("")).toBeNull();
    expect(normalizeSheetUrl(undefined)).toBeNull();
    // http مسموح على العنوان المحلي فقط (اختبار/تطوير)
    expect(normalizeSheetUrl("http://127.0.0.1:5055/products.csv")).toBe(
      "http://127.0.0.1:5055/products.csv"
    );
  });
});

const okResponse = (body: string) => ({
  ok: true,
  status: 200,
  text: async () => body,
});

describe("fetchProductsPayload", () => {
  const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?output=csv";

  it("يرجع not_configured بلا رابط، وبلا أي طلب شبكة", async () => {
    let called = false;
    const payload = await fetchProductsPayload("", async () => {
      called = true;
      return okResponse("");
    });
    expect(payload.status).toBe("not_configured");
    expect(payload.products).toEqual([]);
    expect(called).toBe(false);
  });

  it("يقرأ الشيت ويحوّله لمنتجات", async () => {
    const payload = await fetchProductsPayload(url, async () =>
      okResponse(csv("1,لعبة,50,ألعاب,وصف,,TRUE,1,"))
    );
    expect(payload.status).toBe("ok");
    expect(payload.products).toHaveLength(1);
  });

  it("يرمي عند رد HTML (شيت غير منشور) أو خطأ HTTP", async () => {
    await expect(
      fetchProductsPayload(url, async () =>
        okResponse("<!DOCTYPE html><html>…")
      )
    ).rejects.toThrow();
    await expect(
      fetchProductsPayload(url, async () => ({
        ok: false,
        status: 404,
        text: async () => "",
      }))
    ).rejects.toThrow();
  });
});

describe("createProductsCache", () => {
  it("يخدم من الكاش داخل مدة الصلاحية ولا يكرر الطلب", async () => {
    let now = 0;
    let calls = 0;
    const cache = createProductsCache(1000, () => now);
    const refresh = async () => {
      calls += 1;
      return { products: [], status: "ok" as const, fetchedAt: "x" };
    };
    await cache.get(refresh);
    await cache.get(refresh);
    expect(calls).toBe(1);
    now = 2000;
    await cache.get(refresh);
    expect(calls).toBe(2);
  });

  it("يقدّم النسخة القديمة إذا فشل التحديث", async () => {
    let now = 0;
    const cache = createProductsCache(1000, () => now);
    const good: Awaited<ReturnType<typeof cache.get>> = {
      products: [{ id: "1" } as Product],
      status: "ok",
      fetchedAt: "x",
    };
    await cache.get(async () => good);
    now = 5000;
    const payload = await cache.get(async () => {
      throw new Error("google down");
    });
    expect(payload.products).toHaveLength(1);
  });

  it("يرمي إذا فشل أول تحديث بلا كاش سابق", async () => {
    const cache = createProductsCache();
    await expect(
      cache.get(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow();
  });
});

describe("sortProducts", () => {
  it("ثابت: لا يغيّر ترتيب المتساويين", () => {
    const base = (
      id: string,
      rowIndex: number,
      sortOrder: number | null
    ): Product => ({
      id,
      name: id,
      price: null,
      category: "",
      description: "",
      image: null,
      imageSource: null,
      active: true,
      sortOrder,
      productPrompt: "",
      workflowStatus: "PUBLISHED",
      qaStatus: "PASS",
      sourceDriveId: null,
      processedImage: null,
      reviewReason: "",
      rowIndex,
    });
    const sorted = sortProducts([
      base("a", 1, 2),
      base("b", 2, 2),
      base("c", 3, 1),
    ]);
    expect(sorted.map(p => p.id)).toEqual(["c", "a", "b"]);
  });
});
