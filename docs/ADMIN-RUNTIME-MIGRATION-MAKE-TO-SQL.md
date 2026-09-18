# Admin Runtime Migration — Make → SQL / Same-Origin Runtime

## Target architecture

`Admin UI → /api/admin → SQL contracts → inventory / employees / customers / audit_log`

Writes:

`Admin UI → VITE_ADMIN_ACTIONS_URL → permission check → SQL mutation → append-only audit_log`

No VPS, no paid API keys, no paid token balance, no new external SaaS dependency.

## Current route audit

| Route | Current data contract | Runtime status | Fallback | Priority |
|---|---|---|---|---|
| `/admin` | catalog + customers + employee directory + audit + WhatsApp | mixed | catalog snapshots / honest empty states | P0 |
| `/admin/inventory` | `InventoryRecord` + catalog | contract ready; same-origin runtime pending | catalog availability | P0 |
| `/admin/customers` | `CustomerRecord[]` | contract ready; runtime pending | none / honest empty | P0 |
| `/admin/users` | `EmployeeRecord[]` | contract ready; runtime pending | owner allowlist for identity only | P0 |
| `/admin/audit-log` | `AuditRecord[]` | contract ready; persistent read/write runtime pending | none / honest empty | P0 |
| `/admin/reports` | admin catalog derived metrics | works from catalog/fallback | bundled CSV/snapshots | P1 |

## SQL readiness

Canonical schema already contains:

- `inventory`
- `employees`
- `customers`
- `audit_log`

Application normalizers already exist in `shared/sqlCoreEntities.ts` for inventory, employees, and customers. Audit has a stable UI/read contract in `adminGateway.ts`.

## Migration phases

### Phase 1 — Decouple Admin from Make

- Admin reads default to same-origin `/api/admin`.
- `VITE_ADMIN_READS_BASE_URL` may override the runtime base.
- Admin write runtime uses `VITE_ADMIN_ACTIONS_URL`.
- Legacy `VITE_ADMIN_ACTIONS_WEBHOOK_URL` remains only as temporary compatibility.
- Storefront Make flow remains untouched.

### Phase 2 — Implement read actions

The runtime must support these actions with JSON responses matching current contracts:

- `catalog`
- `inventory`
- `employees`
- `customers`
- `audit_log`
- `whatsapp_metrics`

404/501 must remain equivalent to `not_configured`; invalid payloads must never be converted to fake data.

### Phase 3 — Implement protected writes

Required actions:

- `inventory_update`
- `user_create`
- `user_update`
- `audit_append`
- existing product/content actions as required

Every write must verify the authenticated Admin identity and server-side permission before SQL mutation.

### Phase 4 — Persistence and E2E

- Egypt System verified movements update canonical inventory.
- Employee changes persist to `employees`.
- Customer account state persists to `customers`.
- Every sensitive mutation appends to `audit_log`.
- `/admin` and route-specific pages are validated against live reads.

## Exit criteria from Make for Admin

Admin can be considered Make-free when:

1. `git grep` finds no `MAKE_GATEWAY_URL` imports under `client/src/admin` or `client/src/lib/admin`.
2. All P0 read actions return live same-origin SQL-backed data.
3. All sensitive writes are server-authorized and append audit rows.
4. No page relies on Make-specific wording or assumptions.
5. Production E2E tests pass for inventory, employees, customers, and audit log.

Storefront Make removal is a separate migration and must not be conflated with Admin runtime completion.