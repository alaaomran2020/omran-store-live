/**
 * Lightweight, fail-safe storefront analytics.
 * Umami remains optional; tracking must never block the customer journey.
 */

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

/**
 * A WhatsApp CTA click is the storefront's primary conversion event.
 * It is recorded three ways:
 * - whatsapp_conversion: canonical funnel conversion
 * - whatsapp_product_inquiry: detailed product inquiry event
 * - whatsapp_click: legacy compatibility for existing dashboards
 * This measures click-to-WhatsApp conversion, not a completed sale inside WhatsApp.
 */
export function trackWhatsAppInquiry(
  product: { id: string; name: string; category?: string; price: number | null; sku?: string | null },
  ctaLocation: WhatsAppProductInquiryPayload["cta_location"]
): void {
  const payload = buildWhatsAppInquiryPayload(product, ctaLocation);

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
