// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
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
  delete (window as unknown as Record<string, unknown>).umami;
});

describe("buildWhatsAppInquiryPayload", () => {
  it("price_mode=priced لسعر رقمي صالح", () => {
    const p = buildWhatsAppInquiryPayload(baseProduct, "product_card", "https://omrantoys.store/products");
    expect(p.price_mode).toBe("priced");
  });

  it("price_mode=inquiry عندما يكون السعر null أو غير صالح", () => {
    expect(buildWhatsAppInquiryPayload({ ...baseProduct, price: null }, "product_details", "x").price_mode).toBe("inquiry");
    expect(buildWhatsAppInquiryPayload({ ...baseProduct, price: Number.NaN }, "product_details", "x").price_mode).toBe("inquiry");
  });

  it("يحفظ CTA location", () => {
    expect(buildWhatsAppInquiryPayload(baseProduct, "product_card", "x").cta_location).toBe("product_card");
    expect(buildWhatsAppInquiryPayload(baseProduct, "product_details", "x").cta_location).toBe("product_details");
  });

  it("يحفظ product_id و product_name و category بعد تنظيفها", () => {
    const p = buildWhatsAppInquiryPayload({ ...baseProduct, category: "  ألعاب مطبخ  " }, "product_card", "x");
    expect(p.product_id).toBe("OT-00010");
    expect(p.product_name).toBe("مطبخ ألعاب للأطفال");
    expect(p.category).toBe("ألعاب مطبخ");
  });

  it("يستخدم SKU الحقيقي إن وُجد وإلا product_id", () => {
    expect(buildWhatsAppInquiryPayload({ ...baseProduct, sku: "SKU-9" }, "product_card", "x").sku).toBe("SKU-9");
    expect(buildWhatsAppInquiryPayload({ ...baseProduct, sku: null }, "product_card", "x").sku).toBe("OT-00010");
    expect(buildWhatsAppInquiryPayload({ ...baseProduct, sku: "   " }, "product_card", "x").sku).toBe("OT-00010");
  });

  it("يحفظ page_location", () => {
    const p = buildWhatsAppInquiryPayload(baseProduct, "product_card", "https://omrantoys.store/products?product=OT-00010");
    expect(p.page_location).toBe("https://omrantoys.store/products?product=OT-00010");
  });
});

describe("trackWhatsAppInquiry", () => {
  it("يطلق conversion + inquiry + legacy click بنفس سياق المنتج", () => {
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;

    trackWhatsAppInquiry(baseProduct, "product_details");

    expect(umami.track).toHaveBeenCalledTimes(3);

    const [conversionEvent, conversionPayload] = umami.track.mock.calls[0] as [string, Record<string, unknown>];
    expect(conversionEvent).toBe("whatsapp_conversion");
    expect(conversionPayload).toMatchObject({
      product_id: "OT-00010",
      sku: "OT-00010",
      product_name: "مطبخ ألعاب للأطفال",
      category: "ألعاب مطبخ",
      price_mode: "priced",
      cta_location: "product_details",
      conversion_stage: "whatsapp_click",
    });
    expect(typeof (conversionPayload as WhatsAppProductInquiryPayload).page_location).toBe("string");

    const [inquiryEvent, inquiryPayload] = umami.track.mock.calls[1] as [string, Record<string, unknown>];
    expect(inquiryEvent).toBe("whatsapp_product_inquiry");
    expect(inquiryPayload).toMatchObject({ product_id: "OT-00010", sku: "OT-00010" });

    const [legacyEvent, legacyPayload] = umami.track.mock.calls[2] as [string, Record<string, unknown>];
    expect(legacyEvent).toBe("whatsapp_click");
    expect(legacyPayload).toMatchObject({
      product: "مطبخ ألعاب للأطفال",
      id: "OT-00010",
      sku: "OT-00010",
      category: "ألعاب مطبخ",
      from: "details",
      price_mode: "priced",
    });
  });

  it("فشل التتبع لا يمنع فتح واتساب", () => {
    (window as unknown as { umami: unknown }).umami = {
      track: () => {
        throw new Error("boom");
      },
    };
    expect(() => trackWhatsAppInquiry({ ...baseProduct, price: null }, "product_card")).not.toThrow();
  });

  it("عدم وجود Umami لا يسبب خطأ", () => {
    expect(() => trackWhatsAppInquiry(baseProduct, "product_card")).not.toThrow();
  });
});
