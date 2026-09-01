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

  it("سعر ناقص أو غير صالح لا يكسر البطاقة", () => {
    expect(formatPrice(null)).toBe("السعر عند الطلب");
    expect(formatPrice(Number.NaN)).toBe("السعر عند الطلب");
  });
});

describe("buildWhatsAppUrl", () => {
  it("يستخدم اسم المنتج كما هو في Google Sheets", () => {
    const url = buildWhatsAppUrl(
      { name: "سيارة أطفال سباق", price: 250 },
      { number: "201000000000" }
    );
    expect(url).toBeTruthy();
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(
      text.startsWith("مرحبًا، أريد الاستفسار عن منتج: سيارة أطفال سباق")
    ).toBe(true);
    expect(text).toContain("250 ج.م");
    expect(url!.startsWith("https://wa.me/201000000000?text=")).toBe(true);
  });

  it("يتجاهل السعر غير الموجود ويضيف رابط الصفحة عند تمريره", () => {
    const url = buildWhatsAppUrl(
      { name: "مكعبات", price: null },
      {
        number: "+20 100 000 0000",
        pageUrl: "https://omrantoys.store/?product=003",
      }
    );
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(text).toBe(
      "مرحبًا، أريد الاستفسار عن منتج: مكعبات\nhttps://omrantoys.store/?product=003"
    );
    expect(url!).toContain("wa.me/201000000000");
  });

  it("يُخفي الزر (null) إذا لم يُضبط رقم واتساب", () => {
    expect(
      buildWhatsAppUrl({ name: "لعبة", price: 10 }, { number: "" })
    ).toBeNull();
  });
});

describe("productPermalink", () => {
  it("ينتج رابطًا قابلًا للمشاركة لكل منتج", () => {
    expect(productPermalink("003", "https://omrantoys.store/")).toBe(
      "https://omrantoys.store/?product=003"
    );
  });
});
