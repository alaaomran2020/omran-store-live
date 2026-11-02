# OMRAN legacy products API — privacy retirement (review only)

**Status:** code prepared on isolated branch; **NOT DEPLOYED**. Owner approval required before changing Cloudflare routes or production.

## Evidence verified on 2026-11-02

- `https://omrantoys.store/api/products` returned a JSON object with 9 products.
- All 9 records contained a **numeric** `price` field (its purchase/wholesale/retail meaning is not documented, so do not assume).
- One product description explicitly mentioned a **wholesale** price; its amount is intentionally omitted from this report.
- Internal fields such as `productPrompt`, `imageSource`, `rowIndex` were also exposed.
- `/edge-api/products` returned the same unsafe 9-product structure.
- `www` URLs redirect to the apex hostname.
- The current React storefront uses a build-time repository snapshot with null public prices and WhatsApp enquiries; it does **not** fetch those legacy API routes.
- Cloudflare zone Worker routes currently include both `omrantoys.store/api/*` and `omrantoys.store/edge-api/products`, with `www` equivalents, all bound to `omran-store-live-edge`. These take precedence over Pages Functions until explicitly bypassed.

## Prepared code

- `functions/api/products.js`: HTTP 410 and `no-store` response, no product content.
- `functions/edge-api/products.js`: same response for the second alias.
- `client/src/lib/publicProductsLegacyApi.test.ts`: regression checks for both aliases.

These files are **not sufficient on their own to fix the live routes** because `omran-store-live-edge` executes first.

## Required nonproduction verification

1. Run `pnpm test -- client/src/lib/publicProductsLegacyApi.test.ts`.
2. Run `pnpm exec wrangler pages functions build functions --outfile=tmp/products-functions-check.mjs`.
3. Run the full `pnpm lint && pnpm check && pnpm test && pnpm build` gates.
4. Preview both Pages paths and confirm 410 + `Cache-Control: no-store`; neither response may contain product, price or operational fields.
5. Verify storefront category and product pages, Ramadan products, and the WhatsApp enquiry links still work.
6. Check that no active, approved external client depends on the old API routes.

## Cloudflare route change — **NOT AUTHORIZED BY THIS PR**

After separately approving and publishing the Pages Functions to the intended origin, add **no-Worker** exclusion routes for these exact patterns:

| Route pattern | Worker |
|---|---|
| `omrantoys.store/api/products*` | None |
| `www.omrantoys.store/api/products*` | None |
| `omrantoys.store/edge-api/products*` | None |
| `www.omrantoys.store/edge-api/products*` | None |

Cloudflare selects the most-specific matching route; `*...` catches query strings too. The exclusions override existing broader `/api/*` or `/edge-api/products` routes for those paths and send requests to the underlying Pages origin. **Do not remove or rewrite other API routes.**

Before enabling these exclusions, confirm the custom domain really resolves to the Pages project and the Pages Functions have been deployed. Otherwise there is a risk of unexpected 404/other response.

After route change, test GET/HEAD on apex + www and both aliases with and without query strings; confirm 410, empty financial content, and WhatsApp operation. Review Cloudflare caching and purge historic copies of affected API responses. Re-check from an independent client.

## Rollback

A safe rollback is to a revised, verified, fail-closed route/Worker that does not expose pricing. **Do not simply remove the exclusion and reactivate the insecure legacy Worker response.** If the Pages origin has problems, keep the API unavailable (410/403) while fixing the storefront separately.

No deletion, merge, Worker deployment, route update, production release, or cache purge is performed by this branch.
