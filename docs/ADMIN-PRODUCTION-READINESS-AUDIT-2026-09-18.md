# Admin Production Readiness Audit — 2026-09-18

## Baseline

- Repository: `omran-store-live`
- Baseline `main`: `841bba3`
- Audit branch: `feat/admin-runtime-sql-migration`
- Egypt System branch reviewed separately: `feat/egypt-system-sql-admin-inventory-clean`

## Verification gates

- TypeScript: PASS
- Lint: PASS — 0 warnings / 0 errors
- Vitest: PASS — 52/52 files, 358/358 tests
- Production build: PASS — 1750 modules
- Admin Make code dependency scan: PASS — no `MAKE_GATEWAY_URL` under `client/src/admin` or `client/src/lib/admin`

## Route audit

| Route | Entry | Data source | Current readiness |
|---|---|---|---|
| `/admin` | `DashboardPage` | catalog + customers + employees + audit + WhatsApp | Route correct; runtime mixed/not yet live |
| `/admin/dashboard` | `DashboardPage` | same as `/admin` | Correct |
| `/admin/inventory` | `InventoryPage` | catalog on main; live `readInventory()` supplied by Egypt System PR | Runtime dependency pending |
| `/admin/customers` | `readCustomers()` | Admin Runtime `/api/admin?action=customers` | Contract ready; endpoint pending |
| `/admin/users` | `readEmployees()` | Admin Runtime `/api/admin?action=employees` | Contract ready; endpoint pending |
| `/admin/audit-log` | `readAuditLog()` | Admin Runtime `/api/admin?action=audit_log` | Contract ready; persistence endpoint pending |
| `/admin/reports` | admin catalog derived metrics | Admin Runtime catalog, then bundled CSV/snapshots | Operational with fallback |

## Dashboard finding

`/admin` is confirmed to be the real main Dashboard entry. It does not route to Product Intake. Product Intake remains isolated at `/admin/product-intake`.

## SQL contract readiness

The canonical schema contains:

- `inventory`
- `employees`
- `customers`
- `audit_log`

Application contracts/normalizers exist for inventory, employees, and customers in `shared/sqlCoreEntities.ts`. Audit read/write contracts are explicit in the Admin gateway/client.

## Make migration status

Admin-specific Make coupling has been removed from source code on the audit branch:

- Admin operational reads default to same-origin `/api/admin`.
- Admin catalog live read uses the same Admin Runtime contract.
- Admin audit write uses `postAdminAction("audit_append")`.
- `VITE_ADMIN_READS_BASE_URL` and `VITE_ADMIN_ACTIONS_URL` define runtime endpoints.
- Legacy `VITE_ADMIN_ACTIONS_WEBHOOK_URL` remains compatibility-only and should be removed after production cutover.

The storefront Make integration is intentionally unchanged and outside this migration.

## Critical production blockers

### P0 — Same-origin Admin Runtime implementation

The repository currently defines the browser contracts but does not contain a deployed `/api/admin` implementation backed by SQL. Until this exists, operational reads return `not_configured`.

This is especially important for `employees`: without a live employee directory, non-owner Access identities can fall back to VIEWER behavior.

### P0 — Egypt System live acceptance

The Egypt System branch is code-complete but still requires tomorrow's office-machine live export to capture real 2026 operational IDs and pass the final `/admin/inventory` acceptance check.

### P0 — Audit persistence

`audit_append` is now routed to Admin Runtime, but a real append-only SQL action must exist before audit persistence is production-live.

### P1 — Customers and employees live reads

Contracts are complete; SQL-backed read actions must be implemented and protected by Cloudflare Access/session identity.

### P1 — Reports

Reports remain catalog-derived only. This is correct and honest, but they are not yet a full operational/financial reporting system.

## Readiness estimate

Current deployed `main` operational readiness: **84%**.

Code staged across the two reviewed feature branches: **91% implementation readiness**.

The difference to 100% is primarily runtime/data-plane work, not UI or TypeScript work:

1. live `/api/admin` SQL reads,
2. protected Admin writes,
3. append-only audit persistence,
4. Egypt System first real SKU live acceptance,
5. production smoke test after both PRs are merged and deployed.

## Merge order

Recommended order:

1. Merge `feat/egypt-system-sql-admin-inventory-clean` only after live SKU acceptance or explicitly accept its fail-closed staging as pre-runtime code.
2. Implement/deploy `/api/admin` same-origin SQL runtime.
3. Merge `feat/admin-runtime-sql-migration` after runtime smoke tests prove employees/customers/audit/catalog reads.
4. Run Admin E2E + production smoke.
5. Retire the legacy Egypt branch only after the clean branch is merged and verified.