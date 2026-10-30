import type { Product } from "@shared/products";

/**
 * Transitional catalog reset, 2026-10-30.
 * Legacy POP UP products are excluded from the public storefront and sitemap.
 * Original entries remain recoverable through Git history; new products must
 * be verified against Egypt System before re-publication.
 */
export const POPUP_PRODUCTS_SNAPSHOT: Product[] = [];
