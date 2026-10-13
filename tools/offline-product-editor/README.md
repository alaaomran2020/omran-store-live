# OMRAN TOYS | Offline CSV Product Editor

Standalone Arabic-RTL one-file product drafting tool: open index.html directly in Chrome/Edge.
No account, internet, APIs, database, server, or extra subscription required.

## Usage
1. Download a local copy of the production catalog file (public/catalog/products.csv).
2. Choose "فتح ملف CSV" or "البدء من الصفر" for new draft proposals.
3. Add/edit products in the Arabic form; original source file remains unchanged.
4. Select images locally to preview and match their filenames. No images are uploaded.
5. Export proposals CSV, full review candidate, change report and image manifest.
6. Save exported files before closing the page (drafts live only in memory).

## Critical safeguards
- Tool is kept under tools/, not public/ or client/. Never bundle it into the public storefront.
- Each added or edited product is exported with active=FALSE, workflow_status=REVIEW, qa_status=NEEDS_REVIEW.
- Unchanged imported rows are preserved in the full candidate, including source image links.
- Editing an existing published product forces its candidate row inactive. DO NOT copy the full candidate into production: it may hide currently published products.
- Proposal files must stay outside the public site. The actual approved change must be prepared separately, reviewed and tested in a dedicated pull request.
- Stock quantity is not present in the existing 17-column production catalog, so no phantom field is introduced.
- No external API, no persistent browser storage of sensitive information, no automatic publish.
- Verified age or safety certifications must be based on trustworthy supplier evidence, never guessed from a photo.

## Tests
From repository root, run:
    node --test tools/offline-product-editor/editor.test.cjs

This is not a remote administrator dashboard. Production Cloudflare Pages, GitHub catalog and DNS remain untouched by the tool itself.
