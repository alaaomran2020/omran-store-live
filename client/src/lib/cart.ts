import type { Product } from "@/lib/productsClient";
import { whatsappNumber } from "@/lib/productFormat";

export const CART_STORAGE_KEY = "omran-store-cart-v1";
export const CART_UPDATED_EVENT = "omran:cart-updated";

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

  return writeCart(items);
}

export function setCartItemQuantity(lineId: string, quantity: number): CartItem[] {
  const items = readCart();
  const item = items.find(candidate => candidate.lineId === lineId);
  if (!item) return items;
  item.quantity = sanitizeQuantity(quantity);
  return writeCart(items);
}

export function removeCartItem(lineId: string): CartItem[] {
  return writeCart(readCart().filter(item => item.lineId !== lineId));
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
    "أهلاً بيك 👋",
    "حابب أجهز طلب من شركة عمران التجارية وأتأكد من السعر والتوفر:",
    "",
    ...items.flatMap((item, index) => {
      const selectionText = Object.entries(item.selections)
        .map(([name, value]) => `${name}: ${value}`)
        .join(" · ");
      return [
        `${index + 1}) ${item.name}`,
        `الكمية: ${item.quantity}`,
        item.sku ? `SKU: ${item.sku}` : `كود المنتج: ${item.productId}`,
        selectionText ? `الاختيارات: ${selectionText}` : null,
        item.category ? `التصنيف: ${item.category}` : null,
        "",
      ].filter((line): line is string => Boolean(line));
    }),
    `إجمالي القطع: ${cartItemCount(items)}`,
    "من فضلك أكد السعر والتوفر قبل تأكيد الطلب.",
  ];

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}
