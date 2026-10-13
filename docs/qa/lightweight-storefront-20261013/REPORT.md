# Lightweight storefront — 13 October 2026

The home page previously loaded a fixed 1.9 MB watch promotion even when the newest catalog product was different. A large hero image, full-size category tiles, seasonal banner and age browsing appeared before the products. The homepage also eagerly imported the full catalog route and product-detail dialog.

## Change
- Compact text hero with a direct catalog button and WhatsApp inquiry.
- Six smaller category links with visible Arabic labels.
- Eight recent products, using each product's declared responsive image. The previous separate oversized promotion is replaced by regular product cards, reducing nine total product presentations to eight.
- Seasonal banner and age browsing remain available after the products. Ramadan, POP UP, wholesale, branches and contact information remain accessible.
- Catalog route and home product details load on demand. Inquiry URLs and product data keep their existing implementation.
- No CSV/product data changes, no new dependencies, no admin/database features, no production deployment.

## Measured locally
Same Chromium executable, new browser context at each width, 900 px viewport height, Vite production preview, baseline commit a46f1b00b1e55aff78b19a9adadbcc38bc12e92e. Resource measurements were recorded at network-idle before scrolling. They are local encoded resource sizes, not field Core Web Vitals, an INP measurement, or a Lighthouse score.

| Width | Initial resources before → after | Products section top before → after |
|---|---|---|
| 320 | 2,665,759 → 446,413 bytes | 2847 → 1212 px |
| 390 | 2,696,871 → 446,413 bytes | 2980 → 1115 px |
| 768 | 2,676,563 → 729,875 bytes | 2909 → 893 px |
| 1440 | 2,761,847 → 729,875 bytes | 1888 → 763 px |

At 390 px this is 83.4% fewer initial resource bytes. Initial compressed JavaScript drops from 139,083 to 120,376 bytes (13.5%). No horizontal page overflow or uncaught browser errors at the tested widths.

## Validation
- `pnpm lint`, `pnpm check`, `pnpm build`: pass.
- `pnpm test`: 56 files, 370 tests pass, including two new homepage regressions for correct catalog imagery and deferred detail interaction.
- `node scripts/catalog-dependency-gate.mjs`: pass.
- `node scripts/integration-audit.mjs`: pass.
- Browser flow evidence and screenshots accompany this report when generated. Checks cover the changed sections, search, deferred details, WhatsApp URL construction and Ramadan navigation. WhatsApp messages are never sent by QA.

## Release / rollback
Review through a draft PR. Existing storefront CI runs on the PR; production remains gated by the repository's manual workflow and production environment approval. If approved and later rolled back, revert this UI commit and follow the existing release process; there is no data migration.
