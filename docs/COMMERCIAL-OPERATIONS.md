# Commercial Product Operations — Omran Trading Company

## Source of truth

The shared operational database is **Omran Trading Master Database** on Google Sheets.

- `Product_Intake`: employee capture queue. Every new product/image starts here.
- `Daily_Operations`: employee daily work log and blockers.
- `Products_Master`: reviewed product catalog and publication state.
- `Categories`: approved category vocabulary.
- `Price_History`: price history; do not overwrite historical purchase cost in the catalog.
- `Inventory`: stock state.

## Employee daily workflow

1. Receive or photograph the product image from Camera / WhatsApp / Telegram / Facebook / Instagram / Upload / Sync.
2. Record product name, barcode/SKU when available, source reference, category and confirmed prices in `Product_Intake`.
3. Keep `price_verified`, `image_verified`, and `identity_verified` false until actually checked.
4. Run duplicate review. Mark `CLEAR`, `POSSIBLE_DUPLICATE`, or `DUPLICATE`.
5. Content moves `RAW -> DRAFTED -> READY_FOR_QA` only after confirmed product identity and usable image.
6. QA starts as `NEEDS_REVIEW`. Only a reviewer may set `PASS`.
7. Approved data is reconciled into `Products_Master`.
8. Public publication remains fail-closed and requires `active=TRUE`, `workflow_status=PUBLISHED`, `qa_status=PASS` and a verified same-product image.
9. Log the employee task and blockers in `Daily_Operations`.

## Mandatory rules

- Never invent price, stock, SKU, barcode, age, brand, supplier, specifications, packaging contents or product identity.
- A social/chat image is not sufficient proof by itself if the product identity is ambiguous.
- Any uncertain image/product match remains `NEEDS_REVIEW`.
- Purchase cost history belongs in `Price_History`; `Products_Master` is the product catalog and current commercial state.
- Duplicates must not be published as separate products unless they are verified variants.

## Employee shift checklist

**Start:** open `Product_Intake`, `Daily_Operations`, and approved `Categories`.

**During shift:** capture each product once, prefer barcode/SKU as the matching key, attach source reference, confirm retail/wholesale price only from an approved source, and flag ambiguity immediately.

**End of shift:** no untracked images, every intake row has an employee name and source, blockers are recorded, reviewed rows have reviewer name/time, and only PASS/PUBLISHED products are eligible for the storefront.

## Storefront intake page

`/admin/product-intake` is a capture assistant for mobile/desktop. Because the production architecture is static-only, browser drafts are local to the current device. The shared Google Sheet remains the operational source of truth. Export the intake CSV from the page and paste/import it into `Product_Intake`, or enter the row directly in the shared sheet.
