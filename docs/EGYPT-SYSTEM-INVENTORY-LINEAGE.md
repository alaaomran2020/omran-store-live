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