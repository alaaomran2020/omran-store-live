import { useSyncExternalStore } from "react";
import type { Product } from "@shared/products";
import { whatsappNumber } from "./productFormat";

export type InquiryItem = Pick<Product, "id" | "name" | "category">;
export const MAX_INQUIRY_ITEMS = 15;
const STORAGE_KEY = "omran-toys-inquiry-list-v1";
let items: InquiryItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function ensureLoaded() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(value)) {
      const seen = new Set<string>();
      items = value
        .filter((item): item is InquiryItem =>
          typeof item === "object" && item !== null &&
          typeof item.id === "string" && Boolean(item.id.trim()) &&
          typeof item.name === "string" && Boolean(item.name.trim()) &&
          typeof item.category === "string")
        .filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
        .slice(0, MAX_INQUIRY_ITEMS);
    }
  } catch {
    // Storage is optional; private browsing must not break product cards.
  }
}

function publish(next: InquiryItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Continue working in memory when storage is blocked.
  }
  notify();
}

export function getInquiryItems(): readonly InquiryItem[] {
  ensureLoaded();
  return items;
}

export function subscribeInquiryCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInquiryItems(): readonly InquiryItem[] {
  return useSyncExternalStore(subscribeInquiryCart, getInquiryItems, () => []);
}

export function addInquiryProduct(product: InquiryItem): boolean {
  ensureLoaded();
  if (!product.id.trim() || !product.name.trim()) return false;
  if (items.some(item => item.id === product.id)) return true;
  if (items.length >= MAX_INQUIRY_ITEMS) return false;
  publish([...items, { id: product.id, name: product.name, category: product.category }]);
  return true;
}

export function removeInquiryProduct(id: string) {
  ensureLoaded();
  publish(items.filter(item => item.id !== id));
}

export function clearInquiryCart() {
  ensureLoaded();
  publish([]);
}

export function buildBulkInquiryUrl(
  selected: readonly InquiryItem[],
  number: string = whatsappNumber()
): string | null {
  const cleanNumber = number.replace(/\D/g, "");
  if (!cleanNumber || selected.length === 0) return null;
  const lines = [
    "السلام عليكم، أريد الاستفسار عن أسعار وتوفر الأصناف التالية (جملة أو قطاعي):",
    ...selected.slice(0, MAX_INQUIRY_ITEMS).map((item, index) =>
      `${index + 1}. ${item.name.slice(0, 60)} — كود: ${item.id}`
    ),
    "",
    "ممكن الأسعار والكميات المتاحة وحد طلب الجملة إن وجد؟",
  ];
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}
