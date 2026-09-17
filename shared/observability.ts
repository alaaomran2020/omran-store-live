export type AnalyticsEventRecord = {
  eventId: string;
  occurredAt: string;
  eventName: string;
  productId: string | null;
  productName: string | null;
  category: string | null;
  pageLocation: string | null;
  metadata: Record<string, unknown>;
};

export type WhatsAppMetrics = {
  total: number;
  today: number;
  last7: number;
  trend: { date: string; label: string; count: number }[];
  topProducts: { key: string; label: string; count: number }[];
  topCategories: { key: string; label: string; count: number }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mapAnalyticsEventRow(value: unknown): AnalyticsEventRecord | null {
  if (!isRecord(value)) return null;
  const eventId = nullableString(value.event_id ?? value.eventId);
  const occurredAt = nullableString(value.occurred_at ?? value.event_at ?? value.occurredAt);
  const eventName = nullableString(value.event_name ?? value.eventName);
  if (!eventId || !occurredAt || !eventName) return null;
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  return {
    eventId,
    occurredAt,
    eventName,
    productId: nullableString(value.product_id ?? value.productId ?? metadata.product_id),
    productName: nullableString(value.product_name ?? value.productName ?? metadata.product_name),
    category: nullableString(value.category ?? value.category_name ?? metadata.category),
    pageLocation: nullableString(value.page_location ?? value.pageLocation),
    metadata,
  };
}

function dayKey(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function increment(map: Map<string, { label: string; count: number }>, key: string | null, label: string | null): void {
  if (!key) return;
  const current = map.get(key);
  map.set(key, { label: label || key, count: (current?.count ?? 0) + 1 });
}

export function aggregateWhatsAppMetrics(
  events: readonly AnalyticsEventRecord[],
  now: Date = new Date()
): WhatsAppMetrics {
  const today = now.toISOString().slice(0, 10);
  const start7 = new Date(now);
  start7.setUTCDate(start7.getUTCDate() - 6);
  start7.setUTCHours(0, 0, 0, 0);
  const start14 = new Date(now);
  start14.setUTCDate(start14.getUTCDate() - 13);
  start14.setUTCHours(0, 0, 0, 0);

  const whatsapp = events.filter(event =>
    event.eventName === "product_whatsapp_click" || event.eventName === "whatsapp_click"
  );
  const byDay = new Map<string, number>();
  const products = new Map<string, { label: string; count: number }>();
  const categories = new Map<string, { label: string; count: number }>();
  let todayCount = 0;
  let last7 = 0;

  for (const event of whatsapp) {
    const dateKey = dayKey(event.occurredAt);
    if (!dateKey) continue;
    const occurred = new Date(event.occurredAt);
    if (dateKey === today) todayCount += 1;
    if (occurred >= start7 && occurred <= now) last7 += 1;
    if (occurred >= start14 && occurred <= now) byDay.set(dateKey, (byDay.get(dateKey) ?? 0) + 1);
    increment(products, event.productId, event.productName);
    increment(categories, event.category, event.category);
  }

  const trend: { date: string; label: string; count: number }[] = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    trend.push({ date: key, label: key, count: byDay.get(key) ?? 0 });
  }

  const rank = (map: Map<string, { label: string; count: number }>) =>
    [...map.entries()]
      .map(([key, value]) => ({ key, label: value.label, count: value.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 10);

  return {
    total: whatsapp.length,
    today: todayCount,
    last7,
    trend,
    topProducts: rank(products),
    topCategories: rank(categories),
  };
}
