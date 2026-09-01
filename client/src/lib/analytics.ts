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
  | "product_share";

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
