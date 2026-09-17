# PR 6 - Live analytics and audit log

## Scope

This PR turns the existing first-party observability path into a live, explicit contract without adding a new backend, paid provider, API key, or database runtime.

The existing Make gateway remains the operational boundary. It may return SQL-shaped rows from the canonical `analytics_events` and `audit_log` contracts, or the legacy aggregate payloads during transition.

## Analytics

- Storefront events now identify the write action as `analytics_event` while preserving the existing event fields.
- WhatsApp metrics can be built directly from real `analytics_events` rows when the gateway returns them.
- Aggregation is deterministic: total, today, last 7 days, 14-day trend, top products and top categories.
- No revenue, orders, conversion rate or other unsupported business facts are estimated.

## Audit

- Admin audit writes explicitly identify the action as `admin_audit`.
- `sendBeacon` remains preferred, with a keepalive `fetch` fallback if the beacon is unavailable or rejected by the browser.
- Audit reads support canonical SQL-shaped `audit_log` rows and the previous `events` payload.
- Sensitive metadata remains sanitized by `shared/audit.ts`; OTP codes, tokens, cookies and secrets are never persisted intentionally.

## Boundaries

- No change to Cloudflare Access.
- No new backend/Worker/runtime.
- No paid analytics provider or token.
- No Admin TSV removal in this PR; that is PR 7.
- No OTP delivery provider; auth delivery remains fail-closed until a trusted channel is configured.
