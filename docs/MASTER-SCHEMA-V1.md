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

A product is eligible for the public catalog only when all conditions are true:

- `نشط = TRUE`
- `حالة سير العمل = PUBLISHED`
- `حالة الجودة = PASS`
- `بوابة النشر = PUBLIC`

Missing price or quantity is allowed. The storefront must use WhatsApp inquiry instead of inventing commercial data.

## Gemini write boundary

Gemini may write only the AI enrichment fields in `المنتجات الرئيسية`:

- `ai_product_name`
- `ai_short_description`
- `ai_full_description`
- `ai_category`
- `ai_age_group`
- `ai_seo_title`
- `ai_meta_description`
- `ai_alt_text`
- `ai_whatsapp_message`
- `ai_social_caption`
- `ai_review_notes`
- `ai_generated_at`

Gemini must not modify or invent prices, quantities, SKU, barcode, approval state, QA state, publication gate, supplier facts, or unverified product specifications.

## GitHub Actions integration

Workflow: `.github/workflows/master-data-pipeline.yml`
Script: `scripts/master-data-pipeline.mjs`

Execution flow:

`Google Sheets -> Gemini enrichment -> write AI columns -> publication validation -> public/catalog/products.csv -> existing storefront QA/deploy workflow`

Required GitHub repository secrets:

- `GEMINI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

The service-account email must have editor access to the master Google Sheet. No secret is committed to the repository.

Default Gemini model is configurable through `GEMINI_MODEL`. The initial workflow default is `gemini-3.8-flash` and can be changed without schema changes.

## Fail-closed rules

- Missing credentials: workflow fails before touching data.
- Gemini failure: no publication-state changes are made.
- No approved public products: catalog generation fails.
- AI enrichment never grants approval.
- Human/authorized approval remains a separate control plane through `QA` and `Approvals`.
