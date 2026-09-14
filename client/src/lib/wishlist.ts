/**
 * قائمة المفضلة على الجهاز (وليس مصادقة).
 *
 * المعرّفات فقط تُحفظ محليًا حتى لا تنكشف بيانات منتج خاصة؛ المزامنة عبر
 * الأجهزة ستأتي مع حساب العميل الخادمي (لا توكنات في localStorage).
 */

const STORAGE_KEY = "omran.wishlist.ids.v1";

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, 500);
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, 500)));
  } catch {
    // التخزين المحلي غير متاح — المفضلة ميزة اختيارية لا تكسر الصفحة.
  }
}

export function getWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  return readStorage();
}

export function isInWishlist(productId: string): boolean {
  return getWishlistIds().includes(productId);
}

export function toggleWishlist(productId: string): boolean {
  const ids = readStorage();
  const exists = ids.includes(productId);
  const next = exists ? ids.filter(id => id !== productId) : [productId, ...ids];
  writeStorage(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("omran:wishlist-changed", { detail: next }));
  }
  return !exists;
}

export function removeFromWishlist(productId: string): void {
  writeStorage(readStorage().filter(id => id !== productId));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("omran:wishlist-changed"));
  }
}

export function clearWishlist(): void {
  writeStorage([]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("omran:wishlist-changed"));
  }
}

/** اشتراك خفيف بالتغييرات (تبويبات متعددة + تحديثات الصفحة). */
export function subscribeWishlist(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("omran:wishlist-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("omran:wishlist-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
