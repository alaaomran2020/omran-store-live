// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildWhatsAppInquiryPayload,
  trackWhatsAppInquiry,
  type WhatsAppProductInquiryPayload,
} from "@/lib/analytics";

const baseProduct = {
  id: "OT-00010",
  name: "مطبخ ألعاب للأطفال",
  category: "ألعاب مطبخ",
  price: 850,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildWhatsAppInquiryPayload", () => {
  it("price_mode=priced لسعر رقمي صالح", () => {
    const p = buildWhatsAppInquiryPayload(baseProduct, "product_card", "https://omrantoys.store/products");
    expect(p.price_mode).toBe("priced");
  });

  it("price_mode=inquiry عندما يكون السعر null أو غير صالح", () => {
    expect(buildWhatsAppInquiryPayload({ ...baseProduct, price: null }, "product_details", "x").price_mode).toBe(
      "inquiry"
    );
    expect(
      buildWhatsAppInquiryPayload({ ...baseProduct, price: Number.NaN }, "product_details", "x").price_mode
    ).toBe("inquiry");
  });

  it("cta_location product_card", () => {
    const p = buildWhatsAppInquiryPayload(baseProduct, "product_card", "x");
    expect(p.cta_location).toBe("product_card");
  });

  it("cta_location product_details", () => {
    const p = buildWhatsAppInquiryPayload(baseProduct, "product_details", "x");
    expect(p.cta_location).toBe("product_details");
  });

  it("product_id و product_name و category كما هي (category تُقصّ مساحتها)", () => {
    const p = buildWhatsAppInquiryPayload(
      { ...baseProduct, category: "  ألعاب مطبخ  " },
      "product_card",
      "x"
    );
    expect(p.product_id).toBe("OT-00010");
    expect(p.product_name).toBe("مطبخ ألعاب للأطفال");
    expect(p.category).toBe("ألعاب مطبخ");
  });

  it("sku: يُستخدم SKU الحقيقي إن وُجد", () => {
    const p = buildWhatsAppInquiryPayload({ ...baseProduct, sku: "SKU-9" }, "product_card", "x");
    expect(p.sku).toBe("SKU-9");
  });

  it("sku: بدون SKU حقيقي يُستخدم product_id كمرجع (لا اختلاق)", () => {
    const p = buildWhatsAppInquiryPayload({ ...baseProduct, sku: null }, "product_card", "x");
    expect(p.sku).toBe("OT-00010");
    const p2 = buildWhatsAppInquiryPayload({ ...baseProduct, sku: "   " }, "product_card", "x");
    expect(p2.sku).toBe("OT-00010");
  });

  it("page_location: الرابط المُمرَّر (يحاكي window.location.href)", () => {
    const p = buildWhatsAppInquiryPayload(baseProduct, "product_card", "https://omrantoys.store/products?product=OT-00010");
    expect(p.page_location).toBe("https://omrantoys.store/products?product=OT-00010");
  });
});

describe("trackWhatsAppInquiry (integration مع trackEvent)", () => {
  it("تطلق whatsapp_product_inquiry بالحمولة الصحيحة + whatsapp_click للتوافق", () => {
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    trackWhatsAppInquiry(baseProduct, "product_details");

    expect(umami.track).toHaveBeenCalledTimes(2);
    const [event1, payload1] = umami.track.mock.calls[0] as [string, Record<string, unknown>];
    expect(event1).toBe("whatsapp_product_inquiry");
    expect(payload1).toMatchObject({
      product_id: "OT-00010",
      sku: "OT-00010",
      product_name: "مطبخ ألعاب للأطفال",
      category: "ألعاب مطبخ",
      price_mode: "priced",
      cta_location: "product_details",
    });
    expect(typeof (payload1 as WhatsAppProductInquiryPayload).page_location).toBe("string");

    const [event2, payload2] = umami.track.mock.calls[1] as [string, Record<string, unknown>];
    expect(event2).toBe("whatsapp_click");
    expect(payload2).toMatchObject({ product: "مطبخ ألعاب للأطفال", id: "OT-00010", from: "details", price_mode: "priced" });
  });

  it("فشل التتبع (exception) لا يرمي — لا يمنع فتح واتساب", () => {
    (window as unknown as { umami: unknown }).umami = {
      track: () => {
        throw new Error("boom");
      },
    };
    expect(() => trackWhatsAppInquiry({ ...baseProduct, price: null }, "product_card")).not.toThrow();
  });

  it("لا umami على الإطلاق (التتبع غير مفعّل) — لا خطأ", () => {
    delete (window as unknown as Record<string, unknown>).umami;
    expect(() => trackWhatsAppInquiry(baseProduct, "product_card")).not.toThrow();
  });
});
