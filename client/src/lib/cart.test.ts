// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { addProductToCart, CART_STORAGE_KEY } from "./cart";

describe("local cart", () => {
  beforeEach(() => window.localStorage.clear());

  it("يضيف المنتج ويزيد كميته عند الضغط مرة أخرى", () => {
    const product = { id: "POP-1", name: "بالون", image: "/balloon.webp" };

    expect(addProductToCart(product)[0]).toMatchObject({ productId: "POP-1", quantity: 1 });
    expect(addProductToCart(product)[0]).toMatchObject({ productId: "POP-1", quantity: 2 });
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });
});
