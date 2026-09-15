# Omran Toys — Analytics Audit Checklist

Date: 2026-09-15
Scope: production storefront `omran-store-live`
Primary conversion: WhatsApp inquiry

## P0 — Measurement integrity

- [x] Cloudflare Web Analytics active on production domain (verified from production dashboard supplied by owner: visits/page views are being recorded).
- [x] First-party storefront event transport exists and is fail-safe.
- [x] Event IDs are generated per persisted event.
- [x] Event timestamp is captured.
- [x] Page location is captured.
- [x] Referrer is captured.
- [x] `utm_source`, `utm_medium`, `utm_campaign` are captured.
- [x] Product ID, SKU, product name and category can be captured.
- [x] Product views are instrumented.
- [x] Search is instrumented.
- [x] Category views are instrumented.
- [x] Generic WhatsApp CTA clicks are instrumented.
- [x] Product WhatsApp inquiries are persisted once as `product_whatsapp_click`.
- [x] Analytics failures do not block customer navigation or WhatsApp.
- [ ] Production gateway: verify a real `product_whatsapp_click` row reaches `Analytics_Events` after deployment/test click.
- [ ] Production gateway: enable/read `action=whatsapp_metrics` and validate its JSON contract.
- [ ] Verify duplicate rate for product WhatsApp events is effectively zero using `event_id`.

## P0 — Admin reporting

- [x] `/admin/whatsapp` has an honest empty/not-configured state instead of invented metrics.
- [x] UI contract exists for total clicks, today, last 7 days, 14-day trend, top products and top categories.
- [ ] Make gateway must expose `whatsapp_metrics` read action.
- [ ] After gateway activation, validate dashboard totals against raw `Analytics_Events` rows.
- [ ] Add source/campaign aggregation once the gateway read contract exposes UTM dimensions.

## P1 — Funnel

Canonical funnel:

`visit -> category_view/search -> product_view -> product_whatsapp_click`

Required KPI definitions:

- Visits: Cloudflare Web Analytics Visits.
- Product interest rate: unique/qualified product views ÷ visits.
- WhatsApp CTR: product WhatsApp clicks ÷ product views.
- Visit-to-WhatsApp rate: product WhatsApp clicks ÷ visits.
- Top converting product/category: rank by WhatsApp clicks; when denominator is available, also show CTR.
- Campaign performance: group by UTM source/medium/campaign.

Do not label WhatsApp clicks as orders, sales or revenue.

## P1 — Campaign attribution standard

Every external campaign link should use:

- `utm_source`: `facebook`, `instagram`, `google`, `whatsapp`, etc.
- `utm_medium`: `social`, `paid_social`, `cpc`, `organic`, etc.
- `utm_campaign`: stable lowercase campaign slug.

Example:

`/products?utm_source=facebook&utm_medium=social&utm_campaign=opening_sayed_elbadawy`

Never put customer phone numbers, names or other PII in UTM values.

## Privacy guardrails

- No message content.
- No WhatsApp conversation content.
- No customer phone number in storefront analytics events.
- No fabricated order/revenue metrics.
- Keep analytics non-blocking.

## Release gate

Analytics P0 is complete only when all of these are true:

1. A controlled production product inquiry produces exactly one `product_whatsapp_click` ledger row.
2. The row contains event ID, timestamp, product/SKU/category, page location, referrer and available UTM values.
3. `whatsapp_metrics` returns live aggregates.
4. `/admin/whatsapp` displays the same totals as the raw ledger for the validation window.
5. Storefront navigation and WhatsApp continue to work when analytics transport is unavailable.
