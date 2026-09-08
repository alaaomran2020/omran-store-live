/**
 * Lightweight, fail-safe storefront analytics.
 * Umami remains optional. Canonical storefront funnel events are also persisted
 * to the first-party Analytics_Events ledger through the unified Make gateway.
 */

import { MAKE_GATEWAY_URL } from "./makeGateway";

type UmamiWindow = Window & {
  umami?: { track?: (event: string, data?: Record<string, unknown>) => void };
};

export type ProductEvent =
  | "product_view"
  | "search"
  | "category_view"
  | "whatsapp_click"
  | "product_whatsapp_click"
  | "product_search"
  | "product_filter"
  | "product_age_filter"
  | "whatsapp_product_inquiry"
  | "whatsapp_conversion"
  | "product_share"
  | "cart_add"
  | "cart_remove"
  | "cart_quantity_change"
  | "cart_open"
  | "cart_whatsapp_submit";

export type WhatsAppProductInquiryPayload = {
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  price_mode: "priced" | "inquiry";
  page_location: string;
  cta_location: "product_card" | "product_details";
};

type PersistedEventName =
  | "product_view"
  | "search"
  | "category_view"
  | "whatsapp_click"
  | "product_whatsapp_click"
  | "cart_add"
  | "cart_remove"
  | "cart_quantity_change"
  | "cart_open"
  | "cart_whatsapp_submit";

const persistedEventAliases: Partial<Record<ProductEvent, PersistedEventName>> = {
  product_view: "product_view",
  search: "search",
  product_search: "search",
  category_view: "category_view",
  product_filter: "category_view",
  whatsapp_click: "whatsapp_click",
  product_whatsapp_click: "product_whatsapp_click",
  cart_add: "cart_add",
  cart_remove: "cart_remove",
  cart_quantity_change: "cart_quantity_change",
  cart_open: "cart_open",
  cart_whatsapp_submit: "cart_whatsapp_submit",
};

function trackUmamiOnly(event: string, data: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    (window as UmamiWindow).umami?.track?.(event, data);
  } catch {
    // Analytics is non-critical and must never break a customer action.
  }
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function createEventId(eventName: PersistedEventName): string {
  let suffix = "";
  try {
    suffix = globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() || "";
  } catch {
    suffix = "";
  }
  if (!suffix) suffix = Math.random().toString(16).slice(2, 10).toUpperCase();
  const prefix = eventName === "product_whatsapp_click" ? "PWA" : "EV";
  return `${prefix}-${Date.now()}-${suffix}`;
}

function persistStorefrontEvent(
  eventName: PersistedEventName,
  data: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined" || typeof fetch === "undefined") return;

  try {
    const pageLocation = stringValue(data.page_location).trim() || window.location.href;
    const pageUrl = new URL(pageLocation, window.location.origin);

    const body = new URLSearchParams({
      event_id: createEventId(eventName),
      event_at: new Date().toISOString(),
      event_name: eventName,
      product_id: stringValue(data.product_id || data.id).trim(),
      sku: stringValue(data.sku).trim(),
      product_name: stringValue(data.product_name || data.product).trim(),
      category: stringValue(data.category).trim(),
      price_mode: stringValue(data.price_mode).trim(),
      cta_location: stringValue(data.cta_location).trim(),
      page_location: pageLocation,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      utm_source: pageUrl.searchParams.get("utm_source") || "",
      utm_medium: pageUrl.searchParams.get("utm_medium") || "",
      utm_campaign: pageUrl.searchParams.get("utm_campaign") || "",
    });

    for (const [key, value] of Object.entries(data)) {
      if (body.has(key)) continue;
      const normalized = stringValue(value).trim();
      if (normalized) body.set(key, normalized);
    }

    void fetch(MAKE_GATEWAY_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    }).catch(() => undefined);
  } catch {
    // First-party analytics must never block navigation, search or WhatsApp.
  }
}

export function trackEvent(event: ProductEvent, data: Record<string, unknown> = {}): void {
  trackUmamiOnly(event, data);
  const persistedEvent = persistedEventAliases[event];
  if (persistedEvent) persistStorefrontEvent(persistedEvent, data);
}

export function buildWhatsAppInquiryPayload(
  product: { id: string; name: string; category?: string; price: number | null; sku?: string | null },
  ctaLocation: WhatsAppProductInquiryPayload["cta_location"],
  pageLocation: string = typeof window !== "undefined" ? window.location.href : ""
): WhatsAppProductInquiryPayload {
  const priceMode = product.price !== null && Number.isFinite(product.price) ? "priced" : "inquiry";
  const sku = (product.sku?.trim() || product.id || "").trim() || product.id;
  return {
    product_id: product.id,
    sku,
    product_name: product.name,
    category: (product.category || "").trim(),
    price_mode: priceMode,
    page_location: pageLocation,
    cta_location: ctaLocation,
  };
}

/**
 * A product WhatsApp CTA is persisted exactly once in the first-party ledger
 * as `product_whatsapp_click`. Legacy Umami aliases remain for continuity but
 * do not create extra Google Sheets rows.
 */
export function trackWhatsAppInquiry(
  product: { id: string; name: string; category?: string; price: number | null; sku?: string | null },
  ctaLocation: WhatsAppProductInquiryPayload["cta_location"]
): void {
  const payload = buildWhatsAppInquiryPayload(product, ctaLocation);

  persistStorefrontEvent("product_whatsapp_click", payload as unknown as Record<string, unknown>);

  trackUmamiOnly("whatsapp_conversion", {
    ...payload,
    conversion_stage: "whatsapp_click",
  });
  trackUmamiOnly("whatsapp_product_inquiry", payload as unknown as Record<string, unknown>);
  trackUmamiOnly("whatsapp_click", {
    product: payload.product_name,
    id: payload.product_id,
    sku: payload.sku,
    category: payload.category,
    from: ctaLocation === "product_card" ? "card" : "details",
    price_mode: payload.price_mode,
  });
}
