// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  addInquiryProduct, buildBulkInquiryUrl, clearInquiryCart, getInquiryItems,
  MAX_INQUIRY_ITEMS, removeInquiryProduct,
} from "./inquiryCart";

const item = { id: "OMR-RAW-001", name: "لعبة أطفال", category: "ألعاب تعليمية" };
afterEach(() => { clearInquiryCart(); window.localStorage.clear(); });

describe("WhatsApp inquiry basket", () => {
  it("stores a selected item once, removes it and never includes price", () => {
    clearInquiryCart();
    expect(addInquiryProduct(item)).toBe(true);
    expect(addInquiryProduct(item)).toBe(true);
    expect(getInquiryItems()).toHaveLength(1);
    const url = buildBulkInquiryUrl(getInquiryItems(), "201555570269")!;
    const message = decodeURIComponent(url);
    expect(url).toMatch(/^https:\/\/wa\.me\/201555570269\?text=/);
    expect(message).toContain("كتالوج عمران تويز (omrantoys.store)");
    expect(message).not.toContain("POP UP");
    expect(message).toContain("OMR-RAW-001");
    expect(message).toContain("لعبة أطفال");
    expect(message).not.toContain("850");
    removeInquiryProduct(item.id);
    expect(getInquiryItems()).toHaveLength(0);
  });


  it("sends multiple unique toy items to the approved store number without prices", () => {
    clearInquiryCart();
    const second = { id: "OMR-IG-HC-104", name: "مطبخ Home Chef", category: "أطقم المهن والتركيب" };
    expect(addInquiryProduct(item)).toBe(true);
    expect(addInquiryProduct(second)).toBe(true);
    const url = buildBulkInquiryUrl(getInquiryItems(), "201555570269")!;
    const message = new URL(url).searchParams.get("text")!;
    expect(message).toContain("1. لعبة أطفال — كود: OMR-RAW-001");
    expect(message).toContain("2. مطبخ Home Chef — كود: OMR-IG-HC-104");
    expect(message).toContain("عمران تويز");
    expect(message).not.toContain("1850");
  });

  it("limits the basket to 15 real distinct SKUs", () => {
    clearInquiryCart();
    for (let i = 0; i < MAX_INQUIRY_ITEMS; i++) {
      expect(addInquiryProduct({ ...item, id: `OMR-${i}` })).toBe(true);
    }
    expect(addInquiryProduct({ ...item, id: "OMR-EXTRA" })).toBe(false);
    expect(getInquiryItems()).toHaveLength(MAX_INQUIRY_ITEMS);
  });

  it("rejects an empty or invalid recipient", () => {
    expect(buildBulkInquiryUrl([], "201555570269")).toBeNull();
    expect(buildBulkInquiryUrl([item], "")).toBeNull();
  });
});
