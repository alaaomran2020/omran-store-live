import type { Product } from "@/lib/productsClient";

export const CART_STORAGE_KEY = "omran-store-cart-v1";

export type CartItem = {
  productId: string;
  name: string;
  image: string | null;
  quantity: number;
};

export function addProductToCart(product: Pick<Product, "id" | "name" | "image">): CartItem[] {
  if (typeof window === "undefined") return [];

  let items: CartItem[] = [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (Array.isArray(stored)) items = stored;
  } catch {
    items = [];
  }

  const existing = items.find(item => item.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ productId: product.id, name: product.name, image: product.image, quantity: 1 });
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("omran:cart-updated", { detail: items }));
  return items;
}
