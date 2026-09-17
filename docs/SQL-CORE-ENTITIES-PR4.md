# PR 4 - SQL Core Entities Integration

## Scope

This PR connects products, inventory, employees and customers to the unified SQL model from PR 3 at the application contract and gateway-adapter layer.

It does not migrate production data, switch the production datastore, add login/OTP, add analytics writes, remove TSV/Sheets fallbacks, or convert the full Admin UI to SQL-backed live reads/writes.

## Integration boundary

- `shared/sqlCoreEntities.ts` is the canonical adapter boundary between PostgreSQL-shaped rows and existing application models.
- SQL rows use names from `database/001_unified_schema.sql` such as `product_id`, `inventory_status`, `employee_id`, and `customer_id`.
- Existing UI-facing contracts remain stable.

## Products

The Admin catalog gateway can consume both the existing `{ values: [...] }` payload and a SQL-shaped `{ products: [...] }` payload. Publication fields are preserved; the adapter does not bypass `active + PUBLISHED + PASS`.

## Inventory

`readInventory()` defines the SQL-compatible inventory read contract. Unknown `on_hand_qty` remains `null`; available quantity is derived only when physical stock is known.

The Inventory page is intentionally not switched to the new read in PR 4. Full live Admin wiring remains PR 7.

## Employees and customers

Gateway reads normalize SQL snake_case rows while remaining compatible with the existing camelCase gateway payloads. Employee role/status values are validated against the central RBAC constants. Unknown values are rejected fail-closed.

## Out of scope

- Login, OTP, sessions, auth provider mapping and RLS: PR 5.
- Real analytics/audit persistence: PR 6.
- Replacing Admin TSV/change packets and wiring every page directly to SQL: PR 7.
