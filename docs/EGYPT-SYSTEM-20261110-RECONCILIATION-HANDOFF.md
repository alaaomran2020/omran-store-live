# Egypt System — September review, fresh export, and six-product reconciliation

Status on 2026-11-10: historical backup downloaded and inspected, but NOT restored into SQL Server; no fresh inventory export; no Egypt System product identities verified; NO catalog publication.

## Verified files and boundaries

- Historical copy: Google Drive Daily_Backup file ESStores_20260924_15_41_37.bak.
- File size: 17,344,000 bytes; downloaded SHA-256: ece57a0889b665c0c921a1415e25224b86db274ef19c79219787b02c37f5fdc8.
- Native SQL Server TAPE header is present. This is NOT a successful RESTORE VERIFYONLY.
- Connected HP Z620 has no SQL Server engine, no SQLCMD, and no Docker engine as checked on 2026-11-10. Do not install a database service on the office server or overwrite the live ESStores database.
- Both Google Drive recovery folders 00_CURRENT and 01_NEW_ITEMS_EXPORTS are empty at inspection.
- Existing six intake records and descriptions: docs/product-intake/2026-11-10-six-products/products.pending.json (PR #188). All are REVIEW/NEEDS_REVIEW and inactive.

## 1. September backup — separate instance required

Execute by an authorized SQL Server administrator on a separate isolated SQL Server instance or VM, NEVER on the live office ESStores server.

1. Copy backup outside Git and validate its SHA-256 shown above.
2. Use SQL Server Management Studio, pointed to the isolated instance, to run backup metadata checks:
   RESTORE HEADERONLY FROM DISK = N'<PRIVATE_PATH_TO_BAK>';
   RESTORE FILELISTONLY FROM DISK = N'<PRIVATE_PATH_TO_BAK>';
   RESTORE VERIFYONLY FROM DISK = N'<PRIVATE_PATH_TO_BAK>';
3. After confirming actual logical data and log names, restore as a NEW database named ESStores_20260924_REVIEW with WITH MOVE entries for EACH logical file to unique separate review-only disk paths. Do not use WITH REPLACE or write to the production database files.
4. Set that NEW database read-only:
   ALTER DATABASE [ESStores_20260924_REVIEW] SET READ_ONLY WITH NO_WAIT;
5. Verify sys.databases.is_read_only = 1 for the review database, then use a restricted SELECT-only account for research.
6. Run scripts/egypt-system/legacy-sandbox-search.sql on the review database and export the result to a private UTF-8 CSV with headers Item_Id,Item_Package_Id,Item_Name_AR. These are historical candidates, NOT verified current products or inventory.

Existing historical notes mention a 46-piece kitchen candidate, while PHOTO-02 has 47 PCS printed on its box. This is a material mismatch; never equate them by name alone.

## 2. CURRENT export from the authorized office PC

Only the Egypt System/ESStores office workstation, with authorized SQL READ access, may produce current inventory records. Its server is not reachable through Google Drive.

Run scripts/egypt-system/office-readonly-schema.sql first to inspect actual names in Items, Item_Packages and Item_Barcodes. Do not guess the barcode or package schema. An office-side read-only export must contain:

- current/items.csv, encoded UTF-8, with Item_Id,Item_Package_Id,Item_Name_AR,Barcode,Category_AR. One verified sales package per row; barcode should be preserved exactly, not generated.
- current/stock_by_branch.csv, encoded UTF-8, with Item_Package_Id,Store_Id,OnHandQty from ESStoreDbo.VwTransStockDetails. Exact quantities remain private.
- current/manifest.json written LAST with schema_version 1, source_database ESStores, status COMPLETE, unique export_id, snapshot_timestamp_utc, counts and SHA256 checksums of both CSV files.

Refer to docs/EGYPT-SYSTEM-READ-ONLY-REVIEW.md for the exact manifest format and fail-closed validation. The export must be current (less than 24 hours old). Store in the private authorized Google Drive recovery mirror, not public website assets or Git.

## 3. Match the six photos without making duplicates

On the HP Z620 in the project directory, after the private office export is safely available locally, run:

    node scripts/egypt-system/review-import.mjs stage --source "D:\Private-Egypt-Export"

Then run the reconciliation using the actual generated private queue path:

    node scripts/egypt-system/reconcile-six.mjs --queue "automation/egypt-system/private-review/review-<export_id>.json"

When a historical CSV is actually available from the isolated review DB, add:

    --legacy "D:\Private-Egypt-Export\september-legacy-candidates.csv"

The comparison writes ONLY to automation/egypt-system/private-review, which is excluded from Git. It never makes a product public, never changes SQL Server, and leaves all six blocked pending exact barcode, package and real photo QA. Historical and current name-only matches are marked as suggestions. Different printed piece counts are explicitly flagged.

Before any site catalog PR, obtain actual barcode photos, inspect stock/package identity and possible duplicates, confirm category, approve the original or edited image (AI may alter printed packaging text), derive immutable public IDs only from confirmed Item_Id+Item_Package_Id, and obtain the owner's publication approval. Never expose wholesale, purchase or retail prices or actual branch stock in public JSON.

## 4. Test evidence

Narrow offline tests (synthetic samples; no SQL credentials, no live DB): node --test scripts/egypt-system/review-import.test.mjs scripts/egypt-system/reconcile-six.test.mjs

Status: six tests passed, including rejection of a 46-piece old candidate as a verified 47-piece kitchen, invalid manifest/checksum, duplicate barcodes, tampered queue, stale export, and unapproved catalog intake.

## Blockers

- An isolated SQL Server instance is not provisioned, so historical restore and query are NOT performed.
- A fresh authoritative office-PC export does NOT exist in the verified Drive recovery folders.
- Exact barcodes and package identifiers for all six photographed items are unavailable; no authoritative duplicate verdict can yet be reported.
- The six photos are in a separate chat ZIP and require image QA / transfer before use in production.

### Update (2026-11-11): verified originals safely recovered

All six original source JPEG files were recovered from the owner's private ChatGPT file library and matched byte-for-byte (SHA-256) against `products.pending.json`. A review-only ZIP is now saved in the private Google Drive `03_PRODUCT_EXPORTS_QA/02_QA_RESULTS` directory. This resolves **original-photo recovery only**, not packaging/label QA, public-asset approval, Egypt System barcode/package matching or website publication. No new public catalog entries have been created.

Do not merge or publish any product entries until these facts are verified.
