# Omran Toys AI Product Engine

Review-only pilot. No storefront, database, Google Sheet, Telegram or POP UP writes. No automatic deployment or publishing.

## Provider setup
Verify the API endpoint, exact model ID, pricing, credit expiry and key spending limits in your own SeekAI dashboard. The endpoint is configurable and has not been authenticated against the user's account. Never commit API keys or put them in VITE_ environment variables or browser code. Use a dedicated restricted key. Do not send customer data, credentials or private business records to the provider.

Set SEEKAI_API_KEY, SEEKAI_MODEL and optionally SEEKAI_BASE_URL in a private terminal environment. The default base URL is https://seekai.cc/v1/ and must be verified before paid use. Start with a single synthetic product and a maximum $1 pilot allowance. Disable automatic top-ups. Do not run bulk jobs until actual billed usage is reconciled with the dashboard.

## Run
node --test automation/seekai/product-engine.test.mjs
node automation/seekai/product-engine.mjs input.json draft.json

Input example: {"id":"OMR-DEMO-001","name":"عربية بالريموت","description":"لعبة تحكم عن بعد","category":"تحكم عن بعد","price":null}

Output is a new JSON file containing suggested metadata, preserved verified fields, provider usage and a mandatory review status. Existing output files are never overwritten. Only use synthetic or approved public product information during the pilot. The script does not analyze images; image and dimension verification remain manual. Do not infer physical dimensions from pixel dimensions.

## Next integration gates
1. Confirm provider identity, model capabilities, prices and balance.
2. Run local mocked tests and one approved paid request; record actual cost.
3. Review a small batch against the existing catalog and resolve factual errors.
4. Map fields to the current Google Sheet schema after reading the live schema. Keep all writes disabled until explicit approval.
5. Integrate the existing Telegram intake and approval workflow without replacing it. Publish only through the existing approved publication gate.
6. Keep POP UP in a separate pipeline with its own catalog and credentials where appropriate.

Budget allocation is a planning ceiling, not prepaid provider subaccounts: $70 catalog, $40 intake, $30 engineering, $30 marketing, $30 reserve. Actual usage must be measured; the script itself does not enforce a monetary ceiling because provider-specific pricing and billing APIs are unverified. Use the provider's hard key quota before enabling paid execution.
