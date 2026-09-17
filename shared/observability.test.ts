import { describe, expect, it } from "vitest";
import { aggregateWhatsAppMetrics, mapAnalyticsEventRow } from "./observability";

describe("live observability", () => {
  it("maps SQL analytics rows", () => {
    expect(mapAnalyticsEventRow({
      event_id: "EV-1",
      occurred_at: "2026-09-18T10:00:00Z",
      event_name: "product_whatsapp_click",
      product_id: "OMR-1",
      metadata: { product_name: "Toy", category: "Toys" },
    })).toMatchObject({ eventId: "EV-1", eventName: "product_whatsapp_click", productId: "OMR-1" });
  });

  it("aggregates WhatsApp metrics from real event rows without estimates", () => {
    const events = [
      mapAnalyticsEventRow({ event_id: "1", occurred_at: "2026-09-18T08:00:00Z", event_name: "product_whatsapp_click", product_id: "P1", product_name: "One", category: "A" })!,
      mapAnalyticsEventRow({ event_id: "2", occurred_at: "2026-09-17T08:00:00Z", event_name: "product_whatsapp_click", product_id: "P1", product_name: "One", category: "A" })!,
      mapAnalyticsEventRow({ event_id: "3", occurred_at: "2026-09-10T08:00:00Z", event_name: "product_view", product_id: "P2" })!,
    ];
    const result = aggregateWhatsAppMetrics(events, new Date("2026-09-18T12:00:00Z"));
    expect(result.total).toBe(2);
    expect(result.today).toBe(1);
    expect(result.last7).toBe(2);
    expect(result.topProducts[0]).toMatchObject({ key: "P1", count: 2 });
    expect(result.topCategories[0]).toMatchObject({ key: "A", count: 2 });
    expect(result.trend).toHaveLength(14);
  });
});
