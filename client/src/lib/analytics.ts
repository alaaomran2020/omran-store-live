/**
 * Lightweight, fail-safe storefront analytics.
 * Umami remains optional; WhatsApp conversions are also persisted to the
 * operational Analytics_Events ledger through the unified Make gateway.
 */

import { MAKE_GATEWAY_URL } from "./makeGateway";

type UmamiWindow = Window & {
  umami?: { track?: (event: string, data?: Record<string, unknown>) => void };
};

export type ProductEvent =
  | "product_view"
  | "product_search"
  | "product_filter"
  | "whatsapp_click"
  | "whatsapp_product_inquiry"
  | "whatsapp_conversion"
  | "product_share";

export type WhatsAppProductInquiryPayload = {
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  price_mode: "priced" | "inquiry";
  page_location: string;
  cta_location: "product_card" | "product_details";
};

export function trackEvent(event: ProductEvent, data: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    (window as UmamiWindow).umami?.track?.(event, data);
  } catch {
    // Analytics is non-critical and must never break a customer action.
  }
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

function persistWhatsAppConversion(payload: WhatsAppProductInquiryPayload): void {
  if (typeof window === "undefined" || typeof fetch === "undefined") return;

  try {
    const pageUrl = new URL(payload.page_location || window.location.href, window.location.origin);
    const body = new URLSearchParams({
      event_id: `WA-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      event_at: new Date().toISOString(),
      product_id: payload.product_id,
      sku: payload.sku,
      product_name: payload.product_name,
      category: payload.category,
      price_mode: payload.price_mode,
      cta_location: payload.cta_location,
      page_location: payload.page_location,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      utm_source: pageUrl.searchParams.get("utm_source") || "",
      utm_medium: pageUrl.searchParams.get("utm_medium") || "",
      utm_campaign: pageUrl.searchParams.get("utm_campaign") || "",
    });

    void fetch(MAKE_GATEWAY_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    }).catch(() => undefined);
  } catch {
    // The conversion click must continue even if the operational ledger is unavailable.
  }
}

/**
 * A WhatsApp CTA click is the storefront's primary conversion event.
 * It is recorded in the first-party Analytics_Events ledger and, when enabled,
 * in Umami. This measures click-to-WhatsApp conversion, not a completed sale.
 */
export function trackWhatsAppInquiry(
  product: { id: string; name: string; category?: string; price: number | null; sku?: string | null },
  ctaLocation: WhatsAppProductInquiryPayload["cta_location"]
): void {
  const payload = buildWhatsAppInquiryPayload(product, ctaLocation);

  persistWhatsAppConversion(payload);
  trackEvent("whatsapp_conversion", {
    ...payload,
    conversion_stage: "whatsapp_click",
  });
  trackEvent("whatsapp_product_inquiry", payload as Record<string, unknown>);
  trackEvent("whatsapp_click", {
    product: payload.product_name,
    id: payload.product_id,
    sku: payload.sku,
    category: payload.category,
    from: ctaLocation === "product_card" ? "card" : "details",
    price_mode: payload.price_mode,
  });
}
