# Omran Toys MoneyPrinterTurbo Worker

This automation is intentionally **review-first**. It accepts only approved catalog products and never publishes to Instagram, TikTok, YouTube, or any other social platform.

## Flow

`Approved Product → Content Draft → Human Approval → MoneyPrinterTurbo Render → MP4 Draft`

A second human review is expected before any future publishing integration.

## 1) Build Omran Content Factory drafts

Default source: `automation/product-metadata.json`.

```bash
python automation/moneyprinter/content_factory.py \
  --input automation/product-metadata.json \
  --output automation/moneyprinter/out/drafts
```

Only products with `active=true`, `workflow_status=PUBLISHED`, and (when present) `qa_status=PASS` are accepted.

The factory draft contains:

- product identity and source evidence
- source product image reference
- Egyptian Arabic Reel/Short script
- 9:16 portrait defaults
- four-scene review storyboard: hook → product → details → CTA
- MoneyPrinterTurbo payload (`video_subject`, `video_script`, `video_terms`, `video_aspect`)
- `status=DRAFT_REVIEW_REQUIRED`
- `social_publish_allowed=false`

## 2) Human approval

Approval is a separate artifact; editing the content JSON alone cannot grant render permission.

```bash
python automation/moneyprinter/pipeline.py \
  --root automation/moneyprinter/out \
  approve automation/moneyprinter/out/drafts/PRODUCT_ID.json \
  --by "Alaa Omran"
```

To reject:

```bash
python automation/moneyprinter/pipeline.py \
  --root automation/moneyprinter/out \
  reject automation/moneyprinter/out/drafts/PRODUCT_ID.json \
  --by "Alaa Omran" \
  --reason "needs script changes"
```

Approval files are saved to `automation/moneyprinter/out/approvals/` and always contain `social_publish_allowed=false`.

## 3) MoneyPrinterTurbo render

Configure a local/private MoneyPrinterTurbo API endpoint. The default is:

```text
http://127.0.0.1:8080/api/v1
```

Environment variables:

```bash
MONEYPRINTER_API_BASE=http://127.0.0.1:8080/api/v1
MONEYPRINTER_API_KEY=
```

Then render an already-approved draft:

```bash
python automation/moneyprinter/pipeline.py \
  --root automation/moneyprinter/out \
  render automation/moneyprinter/out/drafts/PRODUCT_ID.json
```

The adapter submits to `POST /videos`, polls `GET /tasks/{task_id}`, and saves the returned video under:

`automation/moneyprinter/out/mp4-drafts/PRODUCT_ID.mp4`

The render state is persisted under `automation/moneyprinter/out/renders/`.

## Safety properties

- No social publishing endpoint is called.
- Render is blocked without a separate human approval artifact.
- Rejected drafts cannot render.
- `NEEDS_REVIEW`, inactive, or failed-QA products cannot enter the content factory.
- POP UP data must not be mixed into Omran Toys drafts.
- Provider credits may only be spent during the explicit `render` command after approval.
