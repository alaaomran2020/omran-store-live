# Egypt System → Omran: offline read-only review, not publishing

## Boundaries

- Egypt System `ESStores` on the independent office server remains the **only editable product and inventory master**.
- The workstation importer **reads only from an authorized, complete export folder**, never connects to SQL Server or sends commands to the office server. The separate office-PC export and Drive sync must be commissioned by its administrator; they are not active just because this script exists.
- The pipeline does **not** write to `public/catalog/products.csv`, generated site JSON, Cloudflare, GitHub or the live website. It never calls a deploy command.
- Private exports may contain prices, costs, supplier names or stock details; **do not put export folders inside Git, public assets, or a shareable web folder**. All outputs use explicit field allowlists and go to the ignored `automation/egypt-system/private-review/` by default.
- Customer-facing catalog stays **price by WhatsApp**. Cost, wholesale, retail prices and exact branch stock must never appear in a public export, page or structured data.

## Required authorized export (office PC)

Produce a `current/` directory under an approved private sync root, with:

1. `items.csv`: UTF-8 CSV columns `Item_Id,Item_Package_Id,Item_Name_AR,Barcode,Category_AR` (extra private columns permitted, never passed through). Each verified package corresponds to one item. `Barcode` must be exact and unique, whether international or company-printed.
2. `stock_by_branch.csv`: UTF-8 CSV columns `Item_Package_Id,Store_Id,OnHandQty` computed using the Egypt System ledger `ESStoreDbo.VwTransStockDetails`. No independently inferred stock signs.
3. `manifest.json`, **published last**, with this strict shape:

```json
{
  "schema_version": 1,
  "export_id": "office_20261106_1800",
  "source_database": "ESStores",
  "status": "COMPLETE",
  "snapshot_timestamp_utc": "2026-11-06T18:00:00Z",
  "counts": { "items": 1, "stock_by_branch": 1 },
  "checksums": {
    "items.csv": "<64 hexadecimal SHA-256 digits for exact file bytes>",
    "stock_by_branch.csv": "<64 hexadecimal SHA-256 digits for exact file bytes>"
  }
}
```

The importer rejects incomplete, mismatched, duplicate, future or over-24-hour-old exports. Never interpret zero export rows as zero actual inventory. Validate the private synced folder's sharing permissions before proceeding.

## Stage the review — never publish

From the developer workstation (not the office SQL server):

```powershell
node scripts/egypt-system/review-import.mjs stage --source "D:\Private-Egypt-Export"
```

The output is `automation/egypt-system/private-review/review-<export_id>.json`, **not** the storefront CSV. Each record is `NEEDS_REVIEW`; the queue contains item/package identity, name, exact barcode, category and issues, but no cost/wholesale/retail prices or quantity. Missing barcode, category, usable stock or an approved photo blocks advancement.

### Explicit approval record

Review item/package identity and barcode against Egypt System, validate the item's physical image against barcode and packaging, confirm category and stock, and have the owner approve. Copy `export_id` and `queue_digest` from the stage output into a **private** decisions file:

```json
{
  "export_id": "office_20261106_1800",
  "queue_digest": "<exact digest from reviewed queue>",
  "decisions": [{
    "key": "370:91",
    "decision": "APPROVE",
    "barcode_verified": true,
    "package_verified": true,
    "category_verified": true,
    "photo_verified": true,
    "public_image": "/products/processed/ramadan/ramadan-fanous-001.jpg",
    "approved_by": "<approved owner or reviewer>",
    "approved_at": "2026-11-06T18:15:00Z"
  }]
}
```

Image path is an **example**: it must be the reviewed image for that exact item, already approved in local `public/products/processed/`. Never reuse a different product image to pass the check. `HOLD`/`REJECT` decisions never generate a product proposal.

```powershell
node scripts/egypt-system/review-import.mjs approve --queue "automation/egypt-system/private-review/review-office_20261106_1800.json" --decisions "D:\Private-Egypt-Export\approvals.json"
```

The resulting `approved-preview-<export_id>.json` is **PRIVATE_PROPOSAL_NOT_PUBLISHED**, not a catalog file. Approval never makes a product public automatically. A separate manually reviewed pull request must check the approved preview against the existing catalog and original image provenance, verify privacy and duplicate identity, and amend `public/catalog/products.csv` only after owner confirmation. Normal CI, QA and the production change-control gate remain mandatory. Do **not** run `pnpm deploy` during this process.

## Remaining go-live blockers

- Authorize and test the read-only SQL export on the independent office PC; confirm source schema, actual barcodes, and accurate per-branch stock.
- Install/configure the private Google Drive for Desktop recovery mirror and SQL Server native `.bak` backup separately; verify recovery independently.
- Verify real exported column names and count/hash manifest; stage a small authentic sample; review real photos and stock; authorize the individual products.
- Add a separate controlled PR-based promotion step after review; no automated publish exists in this implementation.

### Local tests (synthetic data; no SQL credentials)

```powershell
node --test scripts/egypt-system/review-import.test.mjs
```
