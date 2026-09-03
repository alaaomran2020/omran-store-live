/**
 * تتبّع أحداث خفيف جدًا.
 *
 * الموقع يحقن وسم Umami اختياريًا وقت البناء (`vitePluginOptionalAnalytics` في
 * vite.config.ts) عندما تكون `VITE_ANALYTICS_ENDPOINT` و`VITE_ANALYTICS_WEBSITE_ID`
 * مضبوطتين. هذه الدالة تستدعي ذلك الوسم إن وُجد فقط — بلا أي مكتبة جديدة، وبلا
 * أي خدمة خارجية، ولا تفشل أبدًا إن كان التتبّع معطّلًا أو محجوبًا.
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

export function trackEvent(
  event: ProductEvent,
  data: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  try {
    (window as UmamiWindow).umami?.track?.(event, data);
  } catch {
    // التتبّع مسألة ثانوية: لا يجوز أن يكسر تفاعل المستخدم أبدًا.
  }
}

/**
 * Pure builder لحمولة حدث whatsapp_product_inquiry — قابل للاختبار بلا DOM.
 *
 * القواعد (Stage 15):
 *   - sku: الـSKU الحقيقي إن وُجد، وإلا product_id (لا اختلاق SKU تجاري).
 *   - price_mode: "priced" فقط لسعر رقمي صالح، وإلا "inquiry".
 *   - cta_location: product_card | product_details (موقع الزر المصدر).
 */
export function buildWhatsAppInquiryPayload(
  product: { id: string; name: string; category?: string; price: number | null; sku?: string | null },
  ctaLocation: WhatsAppProductInquiryPayload["cta_location"],
  pageLocation: string = typeof window !== "undefined" ? window.location.href : ""
): WhatsAppProductInquiryPayload {
  const priceMode =
    product.price !== null && Number.isFinite(product.price) ? "priced" : "inquiry";
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
 * يبني حمولة whatsapp_product_inquiry ويطلقها (وكذلك الحدث القديم للتوافق).
 * المحاولة لا ترمي أبدًا — فشل التتبع لا يمنع فتح واتساب (يُستدعى من onClick قبل الانتقال).
 */
export function trackWhatsAppInquiry(
  product: { id: string; name: string; category?: string; price: number | null; sku?: string | null },
  ctaLocation: WhatsAppProductInquiryPayload["cta_location"]
): void {
  const payload = buildWhatsAppInquiryPayload(product, ctaLocation);
  // نرسل الحدث الجديد المطلوب إنتاجيًا
  trackEvent("whatsapp_product_inquiry", payload as Record<string, unknown>);
  // نحتفظ بالحدث القديم للتوافق مع لوحات Umami الحالية
  trackEvent("whatsapp_click", {
    product: payload.product_name,
    id: payload.product_id,
    from: ctaLocation === "product_card" ? "card" : "details",
    price_mode: payload.price_mode,
  });
}
