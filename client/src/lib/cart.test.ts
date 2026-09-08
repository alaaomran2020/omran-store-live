// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  addProductToCart,
  buildCartWhatsAppMessage,
  cartItemsForCatalog,
  cartQuantity,
  CART_STORAGE_KEY,
  clearCart,
  removeCartItem,
  setCartItemQuantity,
} from "./cart";

describe("local cart", () => {
  beforeEach(() => window.localStorage.clear());

  it("يضيف المنتج ويزيد كميته عند الضغط مرة أخرى", () => {
    const product = { id: "TOY-1", name: "عربية ريموت", image: "/car.webp", category: "تحكم عن بعد" };

    expect(addProductToCart(product)[0]).toMatchObject({ productId: "TOY-1", quantity: 1, catalog: "toys" });
    expect(addProductToCart(product)[0]).toMatchObject({ productId: "TOY-1", quantity: 2, catalog: "toys" });
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("يفصل منتجات POP UP عن لعب الأطفال", () => {
    let items = addProductToCart({ id: "TOY-2", name: "مطبخ أطفال", image: null, category: "ألعاب مطبخ" });
    items = addProductToCart({ id: "POP-2", name: "بالون عيد ميلاد", image: null, category: "بالونات" });

    expect(cartItemsForCatalog(items, "toys").map(item => item.productId)).toEqual(["TOY-2"]);
    expect(cartItemsForCatalog(items, "popup").map(item => item.productId)).toEqual(["POP-2"]);
  });

  it("يحدث الكمية ويحذف المنتج عند النزول للصفر", () => {
    addProductToCart({ id: "TOY-3", name: "كرة", image: null, category: "ألعاب رياضية" });
    expect(setCartItemQuantity("TOY-3", 4)[0].quantity).toBe(4);
    expect(cartQuantity()).toBe(4);
    expect(setCartItemQuantity("TOY-3", 0)).toHaveLength(0);
  });

  it("يمسح كتالوج واحد بدون التأثير على الكتالوج الآخر", () => {
    addProductToCart({ id: "TOY-4", name: "بيانو", image: null, category: "ألعاب موسيقية" });
    addProductToCart({ id: "POP-4", name: "هدية", image: null, category: "هدايا" });

    const next = clearCart("popup");
    expect(next).toHaveLength(1);
    expect(next[0].productId).toBe("TOY-4");
    expect(removeCartItem("TOY-4")).toHaveLength(0);
  });

  it("يبني رسالة واتساب للكتالوج المطلوب فقط", () => {
    let items = addProductToCart({ id: "TOY-5", name: "عربية", image: null, category: "تحكم عن بعد", sku: "OMR-5" });
    items = addProductToCart({ id: "POP-5", name: "بالون", image: null, category: "بالونات", sku: "POP-5" });

    const toysMessage = buildCartWhatsAppMessage(items, "toys");
    expect(toysMessage).toContain("عمران تويز");
    expect(toysMessage).toContain("عربية");
    expect(toysMessage).not.toContain("بالون");
  });
});
