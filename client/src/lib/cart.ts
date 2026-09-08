import type { Product } from "@/lib/productsClient";
import { whatsappNumber } from "@/lib/productFormat";
import { trackEvent } from "@/lib/analytics";

export const CART_STORAGE_KEY = "omran-store-cart-v1";
export const CART_UPDATED_EVENT = "omran:cart-updated";
export const CART_OPEN_EVENT = "omran:cart-open";

export type CartSelections = Record<string, string>;

export type CartItem = {
  /** Stable line id; allows the same product with different options to coexist. */
  lineId: string;
  productId: string;
  sku: string | null;
  name: string;
  image: string | null;
  category: string;
  quantity: number;
  selections: CartSelections;
};

function normalizeSelections(selections: CartSelections | undefined): CartSelections {
  return Object.fromEntries(
    Object.entries(selections ?? {})
      .map(([key, value]) => [key.trim(), value.trim()] as const)
      .filter(([key, value]) => Boolean(key && value))
      .sort(([a], [b]) => a.localeCompare(b, "ar"))
  );
}

function makeLineId(productId: string, selections: CartSelections): string {
  const suffix = Object.entries(selections)
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
  return suffix ? `${productId}::${suffix}` : productId;
}

function sanitizeQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.min(99, Math.floor(quantity)));
}

function normalizeStoredItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CartItem>;
  if (!item.productId || !item.name) return null;
  const selections = normalizeSelections(item.selections);
  return {
    lineId: item.lineId || makeLineId(item.productId, selections),
    productId: item.productId,
    sku: typeof item.sku === "string" && item.sku.trim() ? item.sku.trim() : null,
    name: item.name,
    image: typeof item.image === "string" && item.image.trim() ? item.image : null,
    category: typeof item.category === "string" ? item.category : "",
    quantity: sanitizeQuantity(item.quantity),
    selections,
  };
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeStoredItem).filter((item): item is CartItem => Boolean(item));
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): CartItem[] {
  if (typeof window === "undefined") return items;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: items }));
  return items;
}

export function openCartDrawer(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT));
}

export function addProductToCart(
  product: Pick<Product, "id" | "sku" | "name" | "image" | "category">,
  selections: CartSelections = {}
): CartItem[] {
  if (typeof window === "undefined") return [];
  const normalizedSelections = normalizeSelections(selections);
  const lineId = makeLineId(product.id, normalizedSelections);
  const items = readCart();
  const existing = items.find(item => item.lineId === lineId);

  if (existing) {
    existing.quantity = sanitizeQuantity(existing.quantity + 1);
  } else {
    items.push({
      lineId,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      image: product.image,
      category: product.category,
      quantity: 1,
      selections: normalizedSelections,
    });
  }

  const next = writeCart(items);
  trackEvent("cart_add", {
    product_id: product.id,
    sku: product.sku ?? "",
    product_name: product.name,
    category: product.category,
    quantity: existing?.quantity ?? 1,
    selections: JSON.stringify(normalizedSelections),
    cart_items: cartItemCount(next),
  });
  return next;
}

export function setCartItemQuantity(lineId: string, quantity: number): CartItem[] {
  const items = readCart();
  const item = items.find(candidate => candidate.lineId === lineId);
  if (!item) return items;
  const previousQuantity = item.quantity;
  item.quantity = sanitizeQuantity(quantity);
  const next = writeCart(items);
  if (item.quantity !== previousQuantity) {
    trackEvent("cart_quantity_change", {
      product_id: item.productId,
      sku: item.sku ?? "",
      product_name: item.name,
      category: item.category,
      from_quantity: previousQuantity,
      quantity: item.quantity,
      cart_items: cartItemCount(next),
    });
  }
  return next;
}

export function removeCartItem(lineId: string): CartItem[] {
  const items = readCart();
  const item = items.find(candidate => candidate.lineId === lineId);
  const next = writeCart(items.filter(candidate => candidate.lineId !== lineId));
  if (item) {
    trackEvent("cart_remove", {
      product_id: item.productId,
      sku: item.sku ?? "",
      product_name: item.name,
      category: item.category,
      quantity: item.quantity,
      cart_items: cartItemCount(next),
    });
  }
  return next;
}

export function clearCart(): CartItem[] {
  return writeCart([]);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function buildCartWhatsAppUrl(items: CartItem[], number = whatsappNumber()): string | null {
  const cleanNumber = number.replace(/[^\d]/g, "");
  if (!cleanNumber || items.length === 0) return null;

  const lines = [
    "مرحبًا، أريد تأكيد السعر والتوفر للطلب التالي:",
    "",
    ...items.map((item, index) => {
      const selectionText = Object.entries(item.selections)
        .map(([name, value]) => `${name}: ${value}`)
        .join("، ");
      const code = item.sku || item.productId;
      return `${index + 1}) ${item.name} × ${item.quantity}\nالكود: ${code}${selectionText ? `\n${selectionText}` : ""}`;
    }),
    "",
    `إجمالي القطع: ${cartItemCount(items)}`,
    "من فضلك أكد السعر والتوفر قبل تأكيد الطلب.",
  ];

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}
