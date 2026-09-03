# Omran Trading Master Database

**Status:** Production source of truth  
**Migration date:** 2026-09-03  
**Company:** شركة عمران التجارية  
**Store brand:** Omran Toys  
**Currency:** EGP

## Production Google Sheet

- Spreadsheet ID: `1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc`
- Spreadsheet title: `Omran Trading Master Database`
- Master product sheet: `Products_Master`
- Public compatibility sheet: `products`
- Public compatibility sheet GID: `57015348`
- Previous database backup: `OMRAN TOYS Products — Backup 2026-09-03`

The public CSV URL already configured in `.env.production` and `wrangler.toml` remains unchanged. The `products` tab is now a compatibility view derived from `Products_Master`, so Cloudflare Worker and the storefront continue using the same production endpoint while `Products_Master` becomes the editable source of truth.

## Publication gate

A product is PUBLIC only when all conditions are true:

```text
active = TRUE
workflow_status = PUBLISHED
qa_status = PASS
```

Anything else is fail-closed and must not reach the public product API.

## Database layers

- `Dashboard` — operational KPIs and database rules.
- `Products_Master` — canonical product master data.
- `products` — backward-compatible public view consumed by the current Worker/storefront.
- `Inventory` — stock, reserved quantity, available-to-sell, thresholds and status.
- `Stock_Movements` — append-only inventory movement ledger.
- `Suppliers` — supplier master.
- `Categories` — normalized product categories.
- `Purchase_Orders` — purchase order headers.
- `Purchase_Order_Lines` — purchase order line items.
- `Price_History` — product price change history.
- `Settings` — non-secret database configuration.
- `Data_Dictionary` — field definitions and ownership rules.

## Production compatibility

The current Cloudflare Worker reads `PRODUCTS_SHEET_URL` from `wrangler.toml`. That URL still targets GID `57015348` (`products`). Because that sheet is derived from `Products_Master`, no production URL rotation is required and existing consumers remain compatible.

## Data governance

1. Do not invent price, stock, SKU, barcode, supplier, age or specifications.
2. Unknown data stays blank or `NEEDS_REVIEW`.
3. `product_id` is immutable and unique.
4. SKU and barcode must be unique when populated.
5. Inventory movements must be recorded in `Stock_Movements`.
6. Purchases must be recorded in `Purchase_Orders` / `Purchase_Order_Lines`.
7. Never expose secrets or credentials in the spreadsheet.
8. Do not bypass the publication gate in API, Worker or storefront code.

## Current migration result

At migration time the database contains 30 products:

- 3 products: `PUBLIC` / `READY`
- 27 products: `BLOCKED` / `REVIEW`
- Inventory quantities are intentionally unknown until verified physical counts are entered.

This document is the repository-side contract for the production master database.
