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
 * Helper: build and fire whatsapp_product_inquiry event with correct payload.
 * المحاولة لا ترمي أبدًا — الفشل لا يمنع فتح واتساب (مستدعى من onClick قبل الانتقال).
 */
export function trackWhatsAppInquiry(
  product: { id: string; name: string; category?: string; price: number | null; sku?: string | null },
  ctaLocation: WhatsAppProductInquiryPayload["cta_location"]
): void {
  const priceMode = product.price !== null && Number.isFinite(product.price) ? "priced" : "inquiry";
  const sku = (product.sku?.trim() || product.id || "").trim();
  const payload: WhatsAppProductInquiryPayload & Record<string, unknown> = {
    product_id: product.id,
    sku: sku || product.id,
    product_name: product.name,
    category: (product.category || "").trim(),
    price_mode: priceMode,
    page_location: typeof window !== "undefined" ? window.location.href : "",
    cta_location: ctaLocation,
  };
  // نرسل الحدث الجديد المطلوب إنتاجيًا
  trackEvent("whatsapp_product_inquiry", payload as Record<string, unknown>);
  // نحتفظ بالحدث القديم للتوافق مع لوحات Umami الحالية
  trackEvent("whatsapp_click", {
    product: product.name,
    id: product.id,
    from: ctaLocation === "product_card" ? "card" : "details",
    price_mode: priceMode,
  });
}
