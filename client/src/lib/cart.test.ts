// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  addProductToCart,
  buildCartWhatsAppUrl,
  cartItemCount,
  CART_STORAGE_KEY,
  removeCartItem,
  setCartItemQuantity,
} from "./cart";

const product = {
  id: "POP-1",
  sku: "POP-BAL-1",
  name: "بالون",
  image: "/balloon.webp",
  category: "بالونات",
};

describe("local cart", () => {
  beforeEach(() => window.localStorage.clear());

  it("يضيف المنتج ويزيد كميته عند تكرار نفس الاختيارات", () => {
    expect(addProductToCart(product, { اللون: "أحمر" })[0]).toMatchObject({ productId: "POP-1", quantity: 1 });
    expect(addProductToCart(product, { اللون: "أحمر" })[0]).toMatchObject({ productId: "POP-1", quantity: 2 });
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("يفصل نفس المنتج إلى سطرين عند اختلاف الاختيارات", () => {
    const items = addProductToCart(product, { اللون: "أحمر" });
    const next = addProductToCart(product, { اللون: "أزرق" });
    expect(items).toHaveLength(1);
    expect(next).toHaveLength(2);
    expect(next.map(item => item.selections.اللون)).toEqual(["أحمر", "أزرق"]);
  });

  it("يعدّل الكمية ويحذف السطر ويحسب إجمالي القطع", () => {
    const [item] = addProductToCart(product);
    const updated = setCartItemQuantity(item.lineId, 4);
    expect(updated[0].quantity).toBe(4);
    expect(cartItemCount(updated)).toBe(4);
    expect(removeCartItem(item.lineId)).toHaveLength(0);
  });

  it("يبني ملخص واتساب بدون اختراع سعر أو توفر", () => {
    const items = addProductToCart(product, { اللون: "أحمر" });
    const url = buildCartWhatsAppUrl(items, "201555570269");
    expect(url).toContain("https://wa.me/201555570269?text=");
    const decoded = decodeURIComponent(url ?? "");
    expect(decoded).toContain("الكمية: 1");
    expect(decoded).toContain("اللون: أحمر");
    expect(decoded).toContain("أكد السعر والتوفر");
  });
});
