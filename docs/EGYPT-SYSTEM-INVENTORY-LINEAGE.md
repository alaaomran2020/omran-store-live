# Egypt System → SQL → Admin Inventory

## Qty lineage — CLOSED

Recovered directly from the original `ESStores.mdf` SQL definitions:

- `VwTransactions.Qty` selects `ESStoreDbo.Trans_Details.Qty` directly.
- `RptTransactions.Qty` selects `ESStoreDbo.Trans_Details.Qty` directly.
- `VwTransInStockDetails.Qty` uses `ESStoreDbo.Trans_Details.Qty` for the normal transaction branch.
- `CalcQty` is selected as a separate column.
- `Content` is selected as a separate column.
- `Color_Id` is selected from `Trans_Details.Color_Id`.
- `RptItemCard` consumes `RptTransactions.Qty` directly for its IN/OUT rules.

Therefore the proven path is:

`Trans_Details.Qty → VwTransactions/RptTransactions.Qty → RptItemCard → stock direction`

No evidence supports `Qty + CalcQty`, `Qty * Content`, or another derived quantity for this consumer.

## Direction rules

- `1,3,23,31` → IN.
- `2,4,22,32` → OUT.
- `5,6,101` → use the sign of `Qty`.

## First real canonical product candidate

The Egypt System report `عمران.pdf` contains a real purchase movement for `سبورة بروجيكتور` on 2026-05-14, movement no. 16, quantity 2, unit purchase cost 310.

The Omran master database contains the same imported product as:

- canonical product_id: `POP-PDF-0316098ECE`
- name: `سبورة بروجيكتور`
- source: `عمران.pdf`
- source date: `2026-05-14`
- recorded quantity in price history: `2`
- unit cost: `310`
- total: `620`

This establishes a real Egypt-System-report → canonical-product identity candidate without inventing a product.

## Final production gate

The available offline `ESStores.mdf` snapshot predates the 2026 report transaction. It therefore cannot provide the exact 2026 `Trans_Details.Detail_Id`, `Item_Package_Id`, and `Store_Id` for that movement.

For this reason the bridge remains fail-closed. A row may be marked `VERIFIED` only when the runtime extractor supplies:

1. `source_transaction_id`,
2. `source_detail_id`,
3. `store_id`,
4. the canonical product mapping,
5. `qty_source = TRANS_DETAILS_QTY`,
6. a non-zero `qty`.

Until those exact identifiers are obtained from the live Egypt System database/export, the movement must not alter canonical inventory.
## Final Acceptance Gate — First Real SKU

The first canonical candidate is `POP-PDF-0316098ECE` / `سبورة بروجيكتور`.

Production E2E acceptance requires all three commands to pass on live exports:

1. `pnpm egypt:verify:first-sku -- <export.csv> <verified.json>`
   - exact business match only,
   - requires Header_Id, Detail_Id, Item_Id, Item_Package_Id, Store_Id,
   - produces `lineage_status=VERIFIED` only for `TRANS_DETAILS_QTY`.
2. `pnpm egypt:sql:first-sku -- <verified.json> <stage.sql>`
   - generates a single fail-closed staging INSERT,
   - refuses unverified or non-Trans_Details quantity sources,
   - never executes SQL itself.
3. `pnpm egypt:accept:first-sku -- <verified.json> <admin-inventory.json>`
   - confirms the same canonical product appears in the Admin inventory contract,
   - refuses missing/invalid/insufficient on-hand quantity.

The system must not be declared 100% End-to-End until these three gates pass against a current Egypt System export and the resulting live Admin inventory response.