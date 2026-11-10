# Intake: 6 toy products photographed at Omran

Created 2026-11-10 on isolated review branch.

**Status: DRAFT / NOT PUBLISHED.** This folder is a review and reconciliation package, not a new public source of truth. Do not edit `public/catalog/products.csv`, the generated public snapshots, or Egypt System without authoritative SQL item and package IDs.

The six source photos were uploaded in the ChatGPT conversation. The separately delivered photo ZIP contains 6 original source photos and 6 AI studio **candidate** images, all as WebP. **Images have not been transferred into this repository**, because the COS image-saving tool could not access the ChatGPT page on the remote computer. Update asset paths after upload, review logos/text for generative drift, and prefer originals for verification.

Items: PHOTO-01 curly doll; PHOTO-02 47 PCS miniature kitchen; PHOTO-03 RC racing car; PHOTO-04 pink toy safe; PHOTO-05 blue camo gel-bead toy marked 14+; PHOTO-06 Air Batter plane launcher.

## Mandatory checks before publication

1. Scan each real product's barcode and look up existing `EgyptSystem.Item_Id` and `Item_Package_Id`, separately for each selling package; verify exact match to photograph and category. Check for existing records to avoid duplicate items.
2. Register/update only through the authorized Egypt System workstation/approved workflow; the website is read-only mirror, not authority.
3. Verify exact retail product photos, text, count, age labels, package contents, color, safety notes, sales unit; price/wholesale/cost and warehouse stock must stay private.
4. Retrieve an audited read-only current inventory export to `00_CURRENT` and confirm `Store_Id` and active product identities. At time of inspection, folder was empty and `public/data/egypt-system-inventory.json` showed `AWAITING_SQL_EXPORT`.
5. Once identifiers, uniqueness and visual QA pass, derive the immutable web product ID from verified Egypt System identity; then and only then add to the public catalog, generate local snapshots, run tests, and seek publication approval.

**Publication gate:** `active=TRUE + workflow_status=PUBLISHED + qa_status=PASS`. The current records intentionally remain `REVIEW/NEEDS_REVIEW` and have no public ID.

The material and descriptions are based on the *visible photos/packaging* only; product capabilities not physically verified are explicitly qualified. No prices, stock quantities, SKU, barcodes, Egypt System IDs, or other unsupported facts have been invented.
