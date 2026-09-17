# Unified SQL Data Model v1

## Scope of PR 3

This PR defines the future canonical SQL contract only. It does **not** migrate production data, change the storefront data source, replace Google Sheets, introduce login/OTP, add RLS, add a backend, or connect the admin UI to SQL.

The schema is PostgreSQL 14+ compatible so it can be used later with a managed PostgreSQL provider without changing the domain model.

## Canonical domains

| Domain | SQL tables |
|---|---|
| Catalog | `categories`, `products`, `product_media` |
| Intake / QA | `product_intake`, `qa_reviews`, `approvals` |
| Inventory | `inventory`, `stock_movements` |
| Commercial history | `price_history`, `suppliers`, `purchase_orders`, `purchase_order_lines` |
| Staff | `employees` |
| Customers | `customers`, `customer_addresses`, `customer_preferences` |
| Observability | `analytics_events`, `audit_log` |
| Configuration | `settings` |

## Publication contract

The existing fail-closed publication gate remains unchanged:

```text
active = TRUE
AND workflow_status = PUBLISHED
AND qa_status = PASS
```

`public_products` is a database view that expresses this same contract. It is documentation/future integration infrastructure only in PR 3; the storefront still uses its existing production path.

## Identity model

`employees` and `customers` are separate domains. Their tables define persistent business records only.

PR 3 intentionally contains no password table, OTP table, session table, auth provider mapping, RLS policy or login flow. Authentication belongs to PR 5.

The employee role/status values are identical to the current RBAC contract:

- Roles: `OWNER`, `ADMIN`, `CATALOG_MANAGER`, `INVENTORY_STAFF`, `CONTENT_EDITOR`, `VIEWER`
- Statuses: `INVITED`, `ACTIVE`, `SUSPENDED`, `DISABLED`

Customer statuses remain `PENDING_PROFILE`, `ACTIVE`, `SUSPENDED`.

## Product mapping

The SQL `products` table preserves the current storefront and operational fields rather than replacing them with incompatible names:

- `product_id` ? current `id`
- `sku`
- `name`
- `price`
- category through normalized `category_id`, with `category_legacy` during migration
- `description`
- `image_url` / `image_source`
- `active`
- `sort_order`
- `product_prompt`
- `workflow_status`
- `qa_status`
- `source_drive_id`
- `processed_image`
- `review_reason`
- `legacy_row_index`

Unknown commercial facts remain nullable. The schema does not fabricate price, SKU, barcode, stock, supplier, age, brand or specifications.

## Inventory model

`inventory` stores current state per product. `stock_movements` is the append-only movement ledger. Current quantity can therefore be reconciled against movements later instead of silently overwriting history.

Unknown physical counts remain `NULL`, matching the existing operational rule that stock is not invented before a verified count.

## Price history

`price_history` stores `RETAIL`, `WHOLESALE` and `PURCHASE_COST` independently. Currency is constrained to EGP for the current Omran operating model.

## Audit and analytics

`audit_log` is for privileged administrative activity and is separate from `analytics_events`, which represents storefront/business events. Neither table is wired to production in PR 3.

Sensitive auth material must never be stored in `audit_log.metadata`. The existing application-side audit sanitizer remains authoritative until the future write path is implemented.

## Migration boundaries

PR 4 may import products, inventory, employees and customers into this schema only after field-level reconciliation and dry-run validation. Historical Sheets/TSV data must not be deleted as part of that migration.

PR 5 may add authentication/session/OTP storage and policies without changing the business primary keys defined here.

PR 6 may wire `analytics_events` and `audit_log` to real writes.

PR 7 may switch the Admin UI from manual TSV/change packets to live SQL-backed reads/writes after parity checks.
