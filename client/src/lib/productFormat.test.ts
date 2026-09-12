import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  formatPrice,
  productPermalink,
  PRICE_ENQUIRY_LABEL,
  SHOW_CATALOG_PRICES,
} from "@/lib/productFormat";

describe("formatPrice", () => {
  it("يخفي كل الأسعار مؤقتًا حتى لو كانت موجودة في المصدر", () => {
    expect(SHOW_CATALOG_PRICES).toBe(false);
    expect(formatPrice(250)).toBe(PRICE_ENQUIRY_LABEL);
    expect(formatPrice(1250.5)).toBe(PRICE_ENQUIRY_LABEL);
    expect(formatPrice(null)).toBe(PRICE_ENQUIRY_LABEL);
    expect(formatPrice(Number.NaN)).toBe(PRICE_ENQUIRY_LABEL);
  });
});

describe("buildWhatsAppUrl", () => {
  it("يستخدم اسم المنتج كما هو ولا يخترع سعرًا داخل رسالة واتساب", () => {
    const url = buildWhatsAppUrl(
      {
        id: "OT-0001",
        name: "سيارة أطفال سباق",
        price: 250,
        category: "سيارات",
      },
      {
        number: "201000000000",
        pageUrl: "https://omrantoys.store/?product=OT-0001",
      }
    );
    expect(url).toBeTruthy();
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(text).toContain("السلام عليكم، عاوز أستفسر عن:\nسيارة أطفال سباق");
    expect(text).toContain("الكود: OT-0001");
    expect(text).toContain("التصنيف: سيارات");
    expect(text).toContain("التوفر والكميات");
    expect(text).not.toContain("250 ج.م");
  });

  it("يُخفي الزر إذا لم يُضبط رقم واتساب", () => {
    expect(
      buildWhatsAppUrl({ name: "لعبة", price: 10 }, { number: "" })
    ).toBeNull();
  });

  it("يتعامل مع sku", () => {
    const url = buildWhatsAppUrl(
      {
        id: "OT-001",
        name: "عروسة أميرة & خاصة",
        price: 100,
        category: "عرائس",
        sku: "SKU-123",
      } as any,
      {
        number: "201555570269",
        pageUrl: "https://omrantoys.store/?product=OT-001",
      }
    );
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(text).toContain("الكود: SKU-123");
    expect(text).not.toContain("الكود: OT-001");
  });

  it("يرمز الاختيارات الخاصة ولا يرسل قيمًا مفقودة أو كائنات خام", () => {
    const url = buildWhatsAppUrl(
      {
        id: "POP-001",
        name: "بالون خاص / حفلات",
        price: null,
        category: "بالونات",
        sku: " POP-001 ",
      },
      {
        number: "+20 (100) 000-0000",
        pageUrl: "https://omrantoys.store/popup?product=POP-001&utm_source=qa",
        selectedColor: "روز جولد",
        selectedOptions: { اللون: "روز جولد", المقاس: "50 بالونة", غير_موجود: null },
      }
    );
    const text = decodeURIComponent(new URL(url!).searchParams.get("text")!);
    expect(text).toContain("اللون المختار: روز جولد");
    expect(text).toContain("المقاس: 50 بالونة");
    expect(text).not.toMatch(/undefined|null|\[object Object\]/);
    expect(url).toContain("wa.me/201000000000");
  });
});

describe("productPermalink", () => {
  it("ينتج رابطًا قابلًا للمشاركة لكل منتج", () => {
    expect(productPermalink("003", "https://omrantoys.store/")).toBe(
      "https://omrantoys.store/?product=003"
    );
  });
});
