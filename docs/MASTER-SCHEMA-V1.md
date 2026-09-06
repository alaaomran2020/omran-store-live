# Omran Trading — Master Schema v1

## Canonical operational database

Google Sheet: `قاعدة بيانات عمران تويز الرئيسية`
Spreadsheet ID: `1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc`
Timezone: `Africa/Cairo`
Locale: `ar_EG`

Canonical mapping is stored in the `Master_Schema_v1` tab.

| Canonical table | Actual sheet |
|---|---|
| Products | المنتجات الرئيسية |
| Inventory | المخزون |
| Price_History | سجل الأسعار |
| Product_Intake | إدخال المنتجات |
| QA | QA |
| Approvals | Approvals |
| Analytics | أحداث التحليلات |
| AI_Queue | أوامر الذكاء الاصطناعي |
| Media | الوسائط |
| Audit_Log | سجل التدقيق |

## Publication contract

A product is eligible for the public catalog only when all applicable publication controls are satisfied. The repository catalog must at minimum preserve:

- `active = TRUE`
- `workflow_status = PUBLISHED`
- `qa_status = PASS`

Missing price or quantity is allowed. The storefront must use WhatsApp inquiry instead of inventing commercial data.

## API-free operating model

This repository does not use Gemini API, Google Sheets API, service accounts, access tokens, or repository secrets for the Master Data Pipeline.

Google Drive and Google Sheets remain the operational workspace for human-managed product data. When approved catalog data is synchronized/exported into `public/catalog/products.csv`, GitHub Actions performs local validation only.

AI-generated copy may be prepared manually in ChatGPT or Google AI Studio and then reviewed before being written to the operational sheet. AI enrichment never grants publication approval.

## GitHub Actions integration

Workflow: `.github/workflows/master-data-pipeline.yml`
Script: `scripts/master-data-pipeline.mjs`

Execution flow:

`Approved/exported catalog file -> local schema validation -> single-product QA guard -> repository quality gates -> existing storefront build/deploy`

No API keys, credentials, service accounts, or secrets are required by this pipeline.

## Fail-closed rules

- Missing or malformed catalog file: fail.
- Duplicate product IDs: fail.
- No approved products: fail.
- Test product not approved or missing required identity/image data: fail.
- Prices and quantities are never fabricated.
- Human QA and approval remain the control plane.
