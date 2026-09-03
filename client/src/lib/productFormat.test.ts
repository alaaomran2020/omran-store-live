import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  formatPrice,
  productPermalink,
} from "@/lib/productFormat";

describe("formatPrice", () => {
  it("يعرض السعر بأرقام لاتينية مع العملة", () => {
    expect(formatPrice(250)).toBe("250 ج.م");
    expect(formatPrice(1250.5)).toBe("1,250.5 ج.م");
  });

  it("سعر ناقص أو غير صالح لا يكسر البطاقة — يعرض للاستفسار والكميات", () => {
    expect(formatPrice(null)).toBe("للاستفسار والكميات");
    expect(formatPrice(Number.NaN)).toBe("للاستفسار والكميات");
  });
});

describe("buildWhatsAppUrl", () => {
  it("يستخدم اسم المنتج كما هو في Google Sheets ويُنشئ الرسالة الكاملة", () => {
    const url = buildWhatsAppUrl(
      { id: "OT-0001", name: "سيارة أطفال سباق", price: 250, category: "سيارات" },
      { number: "201000000000", pageUrl: "https://omrantoys.store/?product=OT-0001" }
    );
    expect(url).toBeTruthy();
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(text).toContain("مرحبًا، أريد الاستفسار عن هذا المنتج من عمران تويز.");
    expect(text).toContain("المنتج: سيارة أطفال سباق");
    expect(text).toContain("كود المنتج: OT-0001");
    expect(text).toContain("التصنيف: سيارات");
    expect(text).toContain("السعر: 250 ج.م");
    expect(text).toContain("رابط المنتج: https://omrantoys.store/?product=OT-0001");
    expect(url!.startsWith("https://wa.me/201000000000?text=")).toBe(true);
  });

  it("يتعامل مع السعر غير الموجود ويعرض للاستفسار والكميات", () => {
    const url = buildWhatsAppUrl(
      { id: "003", name: "مكعبات", price: null, category: "" },
      {
        number: "+20 100 000 0000",
        pageUrl: "https://omrantoys.store/?product=003",
      }
    );
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(text).toContain("المنتج: مكعبات");
    expect(text).toContain("كود المنتج: 003");
    expect(text).toContain("التصنيف: غير محدد");
    expect(text).toContain("السعر: للاستفسار والكميات");
    expect(text).toContain("رابط المنتج: https://omrantoys.store/?product=003");
    expect(url!).toContain("wa.me/201000000000");
  });

  it("يُخفي الزر (null) إذا لم يُضبط رقم واتساب", () => {
    expect(
      buildWhatsAppUrl({ name: "لعبة", price: 10 }, { number: "" })
    ).toBeNull();
  });

  it("يشفّر الرسالة بشكل صحيح (URL encode) ويتعامل مع sku", () => {
    const url = buildWhatsAppUrl(
      { id: "OT-001", name: "عروسة أميرة & خاصة", price: 100, category: "عرائس", sku: "SKU-123" } as any,
      { number: "201555570269", pageUrl: "https://omrantoys.store/?product=OT-001" }
    );
    expect(url).toContain(encodeURIComponent("عروسة أميرة & خاصة"));
    // sku should be used when provided
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(text).toContain("كود المنتج: SKU-123");
  });

  it("يستخدم رقمه الافتراضي من الإعدادات عندما لا يُمرر number", () => {
    // بدون تمرير number، يجب أن يستخدم SOCIAL_EMBED_CONFIG.whatsappNumber = 201555570269
    const url = buildWhatsAppUrl(
      { id: "OT-999", name: "اختبار", price: 10, category: "اختبار" },
      { pageUrl: "https://omrantoys.store/?product=OT-999" }
    );
    // الرقم الافتراضي من socialEmbeds هو 201555570269
    expect(url).toContain("wa.me/201555570269");
  });
});

describe("productPermalink", () => {
  it("ينتج رابطًا قابلًا للمشاركة لكل منتج", () => {
    expect(productPermalink("003", "https://omrantoys.store/")).toBe(
      "https://omrantoys.store/?product=003"
    );
  });
});
