/** تتبع أحداث خفيف عبر Umami إن كان مفعّلًا. */
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

export function trackEvent(
  event: ProductEvent,
  data: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  try {
    (window as UmamiWindow).umami?.track?.(event, data);
  } catch {
    // التتبع لا يجوز أن يكسر تفاعل المستخدم.
  }
}
