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
  it("يستخدم اسم المنتج كما هو ويخفي السعر في رسالة واتساب أيضًا", () => {
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
    expect(text).toContain("المنتج: سيارة أطفال سباق");
    expect(text).toContain("كود المنتج: OT-0001");
    expect(text).toContain("التصنيف: سيارات");
    expect(text).toContain(`السعر: ${PRICE_ENQUIRY_LABEL}`);
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
    expect(text).toContain("كود المنتج: OT-001");
    expect(text).toContain("SKU: SKU-123");
  });
});

describe("productPermalink", () => {
  it("ينتج رابطًا قابلًا للمشاركة لكل منتج", () => {
    expect(productPermalink("003", "https://omrantoys.store/")).toBe(
      "https://omrantoys.store/?product=003"
    );
  });
});
