# OMRAN — Egypt System canonical intake and Google Drive recovery contract (2026-10-31)

## Owner decision and scope
- New product intake and physical stocktake start **2026-10-31** on the office's **Egypt System**.
- **Egypt System / ESStores SQL Server** is the sole *editable, authoritative* product, barcode, package, price, inventory, and transaction ledger.
- **Google Drive** is the **single current off-site recovery mirror**, not a second independently editable master.
- The storefront is a **read-only published projection** of explicitly QA-approved inventory. Until an audited importer is live, the currently approved seasonal products are a **temporary legacy exception**.
- Customer-facing policy is **price and stock by WhatsApp**; wholesale/cost prices must never enter the public repo/site/sitemap/JSON-LD.
- Neither historical Google Sheet nor old repository CSV may be used to automatically recreate products in Egypt System.
- No writes to the office SQL database by this migration. Never install software directly on the existing office SQL server as part of the storefront changes.

## Immediate public catalog transition
- Old toys and miscellaneous items: `active=FALSE` in `public/catalog/products.csv` (archived in Git).
- Temporarily retain: rows in `فوانيس رمضان` plus clearly seasonal textiles (مفارش، رانر، ستائر، خداديات، كسوة). Seasonal hanging decor excluded unless re-approved.
- Legacy POP UP product snapshot retired (all five) until approved re-intake; original Git revision remains recoverable.
- Rebuild static snapshot + sitemap + HTML product shells from the same approved source. Verify forbidden IDs absent from initial HTML, rendered UI, and sitemap.
- DO NOT import old product photos or warehouse quantities back as new authoritative records.

## One authoritative record identity
Use `EgyptSystem.Item_Id` as item identity, `Item_Package_Id` for selling unit, `Store_Id` for location.
- Exactly one canonical entry for each verified `Item_Id + Item_Package_Id` pair.
- Barcode identity from `ESStoreDbo.Item_Barcodes` is a verified alternate key; reject ambiguous/duplicate barcodes.
- Stock key: `Item_Package_Id + Store_Id`; don't aggregate branch stock unless explicitly requested.
- Do not match items to legacy web IDs on name similarity alone. A candidate stays REVIEW, not published.
- New web product ID should derive from verified Egypt System key, not guessed names or time stamps.
- Do not overwrite or reuse historical product IDs for a different SKU or pack.
- Photos and supplemental attributes are linked by the verified Egypt item and package identifier (with visible barcode) and stored separately in Drive.
- Staff records item once in Egypt System. Photo workflow links to it; no independent Google Sheet manual product entry.

## Intake SOP for 31 October
1. Assign the physical product to an intake station and take barcode photo.
2. Scan barcode; check for exact existing Egypt item and package. If existing, update/match that record rather than creating a duplicate.
3. Record Arabic name, unit/package, barcode, supplier and purchase price in Egypt System (permissions controlled).
4. Record branch/location, counted quantity and any movements according to Egypt System stock workflows.
5. Photograph front, rear, packaging/barcode and details; label photo folders with verified Egypt identifiers.
6. Staff QA verifies photo↔barcode↔item↔package and product attributes, then flags the product for public publishing. Price remains private.
7. Independent review of daily exceptions: duplicates, missing package, unverified barcode, zero/missing stock, image mismatch.

## Automated backup & restore design (NOT YET ACTIVE)
Run on an authorized **office PC** that already has read access to Egypt System. Do not connect storefront, Google Apps Script, or a public Google Sheet to SQL Server.
- An authorized, read-only SQL export produces three **atomically replaced** files in ONE Drive for Desktop synchronized folder:
  `current/items.csv`, `current/stock_by_branch.csv`, `current/manifest.json`.
  Optional `current/product_media_manifest.csv` is generated from verified photo links.
- `manifest.json` includes schema_version, export_id, source_database, snapshot_timestamp_utc, counts, SHA-256 checksums, status=COMPLETE.
  Write data to temporary filenames, verify row counts/checksums, then replace current files and publish manifest LAST. Never present a partially completed snapshot as latest.
- Stock is read from **`ESStoreDbo.VwTransStockDetails`** per `docs/EGYPT-SYSTEM-INVENTORY-CONTRACT.md`; keep `Item_Package_Id` and `Store_Id` unchanged. Pending/manual adjustments should not be inferred.
- Recommended interval: 15 minutes for verified read-only exports; monitor latest manifest age and back up missed intervals after reconnection. Requires installation and scheduling on the office PC; code alone cannot enable this.
- Nightly **native SQL Server `.bak`** full database backup (with the database's actual recovery model and approved procedures), independently copied to `recovery/sql/` on Drive, verified with `RESTORE VERIFYONLY` and periodic **test restore to separate instance**. Read-only export CSV **cannot restore** complete Egypt System users, transactions or database.
- Preserve previous backup generations in `recovery/` and Drive file version history. "One current" means one authoritative CURRENT snapshot; immutable recovery points are allowed.
- Use Google Drive for Desktop OAuth folder sync on authorized office PC, not a paid third-party API. Ensure offline SQL backup is retained even when Drive is unavailable.
- Status alert if sync late, archive stale, duplicate ids, missing columns, invalid checksum; never overwrite last-good current on failure.
- Egypt System may remain on its existing independent office server. Mini PC / AYRA are not dependencies.

## Publishing gate (future implementation, not live yet)
`ESStores -> verified read-only extract -> Drive current -> controlled import & QA -> versioned public snapshot -> GitHub/Cloudflare Pages`.
- Default: NOT PUBLISHED. Only after confirmed image and item identity, owner-approved status `PUBLISHED + PASS`.
- Never pull back changes from the public website into Egypt System.
- Do not expose cost, retail, wholesale, supplier info, staff, or full stock figures in public output.
- Existing runtime still uses build-time `public/catalog/products.csv`. Continuous Egypt System -> Cloudflare product sync is NOT implemented by this PR.
- Future importer must be idempotent, protect confirmed identifiers, leave manual approval intact, handle empty export and zero stock separately, and preserve the last-good published catalog if an export fails.

## Recovery playbook
1. Identify the recovery timestamp and latest completed, checksum-valid `manifest.json` or verified `.bak`.
2. For a catastrophic SQL failure, restore the **native `.bak`** through authorized Egypt System/SQL Server administrator **into a separate test database first**. Check all transactions, barcodes, package units, branch stock, login/licensing, and the age of the backup before planned production switch.
3. For accidental catalog/site changes, re-run verified extract and regenerate the public projection; do not treat old archived Google Sheets as a source.
4. Retain and validate one current snapshot plus recovery history. Never overwrite existing company SQL data from a CSV export without vendor-approved controlled import.

## Evidence / pending setup
- Existing SQL inventory query: `scripts/egypt-system/export-inventory.sql`; current UI snapshot remains `AWAITING_SQL_EXPORT`.
- Existing master Google Sheet has legacy product records; archive copy was created 2026-10-30 in the dedicated recovery folder (owner Google Drive).
- **Remaining:** verify office-PC SQL access and database edition, SQL `.bak` scheduler, Windows Drive for Desktop signed-in sync root, live 15-minute export and checksum verification, private access and restore rehearsal. This migration doesn't claim any of these are already running.
