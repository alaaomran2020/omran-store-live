import type { Product } from "@/lib/productsClient";
import { isPopUpProduct, type ProductCatalog } from "@/lib/productCatalog";

export const CART_STORAGE_KEY = "omran-store-cart-v1";
export const CART_UPDATED_EVENT = "omran:cart-updated";

export type CartItem = {
  productId: string;
  name: string;
  image: string | null;
  sku: string | null;
  category: string;
  catalog: ProductCatalog;
  quantity: number;
};

type CartProductInput = Pick<Product, "id" | "name" | "image"> &
  Partial<Pick<Product, "sku" | "category">>;

function normalizeItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CartItem>;
  const productId = String(item.productId ?? "").trim();
  const name = String(item.name ?? "").trim();
  if (!productId || !name) return null;

  const category = String(item.category ?? "").trim();
  const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const catalog: ProductCatalog =
    item.catalog === "popup" || item.catalog === "toys"
      ? item.catalog
      : isPopUpProduct({ category } as Pick<Product, "category">)
        ? "popup"
        : "toys";

  return {
    productId,
    name,
    image: typeof item.image === "string" && item.image.trim() ? item.image : null,
    sku: typeof item.sku === "string" && item.sku.trim() ? item.sku.trim() : null,
    category,
    catalog,
    quantity,
  };
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeItem).filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): CartItem[] {
  if (typeof window === "undefined") return items;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: items }));
  return items;
}

export function addProductToCart(product: CartProductInput): CartItem[] {
  if (typeof window === "undefined") return [];

  const items = readCart();
  const existing = items.find(item => item.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    const category = product.category?.trim() ?? "";
    items.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      sku: product.sku?.trim() || null,
      category,
      catalog: isPopUpProduct({ category } as Pick<Product, "category">) ? "popup" : "toys",
      quantity: 1,
    });
  }

  return saveCart(items);
}

export function setCartItemQuantity(productId: string, quantity: number): CartItem[] {
  const nextQuantity = Math.floor(Number(quantity));
  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) return removeCartItem(productId);

  const items = readCart();
  const item = items.find(entry => entry.productId === productId);
  if (!item) return items;
  item.quantity = nextQuantity;
  return saveCart(items);
}

export function removeCartItem(productId: string): CartItem[] {
  return saveCart(readCart().filter(item => item.productId !== productId));
}

export function clearCart(catalog?: ProductCatalog): CartItem[] {
  if (!catalog) return saveCart([]);
  return saveCart(readCart().filter(item => item.catalog !== catalog));
}

export function cartQuantity(items: CartItem[] = readCart()): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartItemsForCatalog(items: CartItem[], catalog: ProductCatalog): CartItem[] {
  return items.filter(item => item.catalog === catalog);
}

export function buildCartWhatsAppMessage(items: CartItem[], catalog: ProductCatalog): string {
  const selected = cartItemsForCatalog(items, catalog);
  const title = catalog === "popup" ? "POP UP - Gifts & Balloons" : "عمران تويز";
  const lines = selected.map((item, index) => {
    const code = item.sku || item.productId;
    return `${index + 1}. ${item.name}\n   الكمية: ${item.quantity}\n   الكود: ${code}`;
  });

  return [
    `مرحبًا، عاوز أستفسر عن الطلب ده من ${title}:`,
    "",
    ...lines,
    "",
    "ممكن تأكيد السعر والتوافر والكميات؟",
  ].join("\n");
}
