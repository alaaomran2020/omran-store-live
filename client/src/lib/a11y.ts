/**
 * Shared accessibility primitives (WCAG 2.2 AA).
 *
 * Rules encoded here:
 * - Prefer semantic HTML and native controls; ARIA is never used to replace them.
 * - Modals keep focus inside and release focus in a deterministic order.
 * - Nothing that is `aria-hidden` stays reachable through the keyboard.
 */

/** Stable id of the single `<main>` landmark per page (used by the skip link). */
export const MAIN_CONTENT_ID = "main-content";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * `display`/`visibility` cannot be inspected reliably outside a real layout
 * engine, so we key off the attributes that actually decide this in the app:
 * `hidden`, `aria-hidden` ancestors and a negative tab index.
 */
export function isFocusableCandidate(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute("hidden")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  if (element.closest("[aria-hidden='true']")) return false;
  if (element.closest("[inert]")) return false;
  return true;
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isFocusableCandidate
  );
}

/**
 * Modal stack. The last surface pushed is the only one allowed to swallow
 * Tab/Escape, which is what keeps a lightbox nested inside a product dialog
 * from closing the whole dialog (and vice versa).
 */
const modalStack: HTMLElement[] = [];

export function registerModal(container: HTMLElement): void {
  if (!modalStack.includes(container)) modalStack.push(container);
}

export function unregisterModal(container: HTMLElement): void {
  const index = modalStack.lastIndexOf(container);
  if (index >= 0) modalStack.splice(index, 1);
}

export function isTopModal(container: HTMLElement): boolean {
  return modalStack[modalStack.length - 1] === container;
}

export function focusMainContent(): boolean {
  const main = document.getElementById(MAIN_CONTENT_ID);
  if (!main) return false;
  main.focus();
  if (document.activeElement !== main) {
    main.setAttribute("tabindex", "-1");
    main.focus();
  }
  return true;
}

/**
 * Returns focus to the element that opened a modal surface. Falls back to a
 * caller-provided target (for example the product card) when the original
 * trigger is gone — Back/Forward navigation and re-filtered lists both remove it.
 */
export function restoreFocusTo(preferred: HTMLElement | null, fallback?: HTMLElement | null): void {
  if (preferred?.isConnected) {
    preferred.focus();
    return;
  }
  if (fallback?.isConnected) {
    fallback.focus();
    return;
  }
  focusMainContent();
}

/** First keyboard stop inside a product card, used when restoring focus after close. */
export function productCardTrigger(productId: string | null | undefined): HTMLElement | null {
  if (!productId) return null;
  const card = document.querySelector<HTMLElement>(`[data-product-id="${CSS.escape(productId)}"]`);
  if (!card) return null;
  return getFocusableElements(card)[0] ?? null;
}
