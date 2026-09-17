# PR 7 - Live Admin data

## Scope

PR 7 makes the Admin operational path live-only. Products, inventory, employees, customers, content, analytics and audit reads are routed through the unified gateway contracts. Operational writes go to the live gateway and fail visibly if it is unavailable.

## Removed operational fallbacks

- Admin catalog no longer falls back to bundled CSV or product snapshots.
- Product, inventory, category, content and employee writes no longer create TSV change packets.
- `client/src/lib/admin/changePackets.ts` is removed.
- CSV exports for reports/customers/quality remain because they are read-only exports, not a persistence channel.

## Live domains

- Catalog: `action=catalog`
- Inventory: `action=inventory`
- Employees: `action=employees`
- Customers: `action=customers`
- Content: `action=content`
- Analytics: `action=whatsapp_metrics` or raw `analytics_events`
- Audit: `action=audit_log`
- Writes: action-specific POST through the unified gateway or the optional write override.

## Safety

Cloudflare Access remains mandatory for `/admin*`. RBAC remains enforced at the route/UI contract and must also be enforced by the gateway for mutations. No credentials or database secrets are added to the browser.

## Runtime status

The repository can verify contracts and fail-closed behavior. The external Make scenario must also be healthy for live operation; a full release smoke check records the actual gateway response separately.
