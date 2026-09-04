# Omran n8n AI Agent Playbook v2

Production-linked automation for **شركة عمران التجارية / عمران تويز**.

## Production bindings

- Spreadsheet ID: `1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc`
- Intake: `إدخال المنتجات`
- Media: `الوسائط`
- Employees: `الموظفون`
- Audit: `سجل التدقيق`
- AI commands: `أوامر الذكاء الاصطناعي`
- Analytics: `أحداث التحليلات`
- Publish catalog: `كتالوج النشر الآلي`
- GitHub: `alaaomran2020/omran-store-live`
- Domain: `omrantoys.store`
- Timezone: `Africa/Cairo`
- Currency: `EGP`

## End-to-end flow

`Intake -> Validation -> Image Processing -> Admin Approval -> Publication Guard -> Catalog -> GitHub Catalog Sync -> Store Build -> Audit`

Failure path:

`Any Workflow Error -> Error Recovery -> سجل التدقيق -> Telegram alert -> retry/manual review`

Control plane:

`Agent Orchestrator -> reads الإعدادات + إدخال المنتجات -> routes actionable records -> writes operations audit`

## Strict publication gate

A product may enter the public catalog only when all are true:

`active=TRUE AND workflow_status=PUBLISHED AND qa_status=PASS`

Price and stock are intentionally allowed to be blank temporarily. In that case the storefront must show a WhatsApp inquiry CTA rather than inventing price or availability.

## Credentials

No secrets are committed. After import in n8n select/create credentials for:

1. Google Sheets OAuth2
2. Google Drive OAuth2
3. Telegram Bot (optional but recommended for approval/errors)
4. GitHub credential/token for catalog sync

Use n8n Credentials; never paste tokens into Code nodes or commit them to GitHub.

## Files

- `01-agent-orchestrator.json`: scans live intake and routes pending work.
- `02-admin-approval.json`: fail-closed approval gate and audit payload.
- `03-product-image-processing.json`: normalizes Drive image references and blocks missing/bad image records.
- `04-github-catalog-sync.json`: reads the approved live catalog and prepares deterministic JSON for `public/data/products.generated.json`.
- `05-workflow-error-recovery.json`: n8n Error Trigger -> safe audit/error notification.
- `manifest.json`: machine-readable production bindings and rules.

## Import order

Import `05` first, then `03`, `02`, `04`, and finally `01`.

The existing `automation/n8n/omran-toys-product-pipeline.json` remains intact. v2 is additive and uses the current Arabic production sheet names rather than the older English aliases in historical docs.
