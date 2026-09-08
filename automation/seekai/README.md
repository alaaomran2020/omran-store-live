# Omran Toys AI Product Engine

Review-only product metadata tool. No storefront, database, Google Sheet, Telegram or POP UP writes. No automatic deployment or publishing.

## Safety contract
Every generated draft must remain `workflow_status=NEEDS_REVIEW`, `qa_status=PENDING`, `active=false`, and `publish=false`. Existing drafts are never overwritten. POP UP products are rejected. Verified source fields such as price, image, age and dimensions are preserved and the model is not allowed to invent them.

## Provider setup
Verify the API endpoint, exact model ID, pricing, credit expiry and key spending limits in your own SeekAI dashboard. Never commit API keys or put them in VITE_ environment variables or browser code. Use a dedicated restricted key. Do not send customer data, credentials or private business records to the provider.

Set `SEEKAI_API_KEY` privately in the terminal. Optional settings:

- `SEEKAI_MODEL` defaults to `glm-5.3-flash`.
- `SEEKAI_BASE_URL` defaults to `https://seekai.cc/v1/`.
- `SEEKAI_MAX_TOKENS` defaults to `4096`.
- `SEEKAI_TIMEOUT_MS` defaults to `90000` (90 seconds).

Do not run bulk jobs until provider billing and balance are understood. Disable automatic top-ups where possible and use provider-side key quotas as the hard spending limit.

## Daily workflow
Run the mocked safety tests first:

```bash
pnpm seekai:test
```

Generate review drafts:

```bash
pnpm seekai:batch
```

The batch is resumable. Existing valid review-only drafts are skipped instead of regenerated, so a timeout or provider failure does not force paid reruns for products that already succeeded. Failures are recorded and the runner continues with the remaining products. A local `batch-report.json` records created, skipped and failed items plus known token usage for successful responses.

Build one local review bundle after the batch:

```bash
pnpm seekai:review
```

This creates `seekai-batch-review.json` from the local draft files after enforcing the same review-only safety gate. The review bundle is for human QA only and performs no catalog, Sheet, storefront or publication changes.

## Single-product recovery
For a product that failed while the rest of the batch succeeded, run only that input through the engine and write to its missing draft path. Never overwrite an existing draft.

```bash
node automation/seekai/product-engine.mjs input.json draft.json
```

## Input and output
Input example:

```json
{"id":"OMR-DEMO-001","name":"عربية بالريموت","description":"لعبة تحكم عن بعد","category":"تحكم عن بعد","price":null}
```

Output is a new JSON file containing suggested metadata, preserved verified fields, provider usage and mandatory review status. The tool does not analyze images; image and dimension verification remain manual. Do not infer physical dimensions from pixel dimensions.

## Publication boundary
This tool stops at human review. Approval and publication must remain separate explicit steps through the existing approved publication gate. No script in this folder should directly change the Google Sheet, public catalog, storefront, deployment state or POP UP catalog.

Budget allocation remains a planning ceiling, not prepaid provider subaccounts. Actual usage must be measured against the provider dashboard; successful response token totals do not necessarily include failed or timed-out provider calls.
