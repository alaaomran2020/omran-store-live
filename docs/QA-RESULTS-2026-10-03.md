# QA RESULTS

**System:** `alaaomran2020/omran-store-live`  
**Branch:** `arena/01a10392-omran-store-live`  
**Candidate:** `e3fb222`  
**Date:** 2026-10-03 UTC  
**Environment:** local clean-build-equivalent checkout; Cloudflare Pages-compatible local preview for HTTP probes  
**Production changed during this QA run:** **No**<br>
**Subsequent deployment:** successful workflow 37154608891; see [`FINAL-PRODUCTION-REPORT-2026-10-03.md`](./FINAL-PRODUCTION-REPORT-2026-10-03.md)

## Automated gates

| Check | Result | Evidence |
|---|---|---|
| Dependency installation | PASS | `pnpm install --frozen-lockfile` completed with the committed lockfile |
| Integration audit | PASS | `node scripts/integration-audit.mjs` |
| Lint | PASS | `pnpm lint`; 0 warnings, 0 errors |
| TypeScript | PASS | `pnpm check`; `tsc --noEmit` |
| Automated tests | PASS | `pnpm test`; 54 files, 362 tests |
| Focused media tests | PASS | `HomeCategoryHighlights.test.tsx` and `ProductImage.test.tsx`; 2 files, 6 tests |
| Production build | PASS | `pnpm build`; Vite output, route shells, and 42-URL sitemap generated |
| High-severity audit gate | PASS | `pnpm audit --audit-level high`; no high/critical findings after targeted overrides |
| Full audit | RESIDUAL LOW | `pnpm audit` reports 1 low-severity development-tool advisory; no high/critical finding remains |
| Formatting/diff hygiene | PASS | `git diff --check`; working tree clean after the final commit |

## Media verification

- The build completed with the responsive product generator; generated product variants remain derived and ignored rather than tracked source data.
- The build output contained the expected product 320/640/960 WebP variants and category WebP derivatives.
- Six category source PNGs remain preserved. The committed category derivative set contains full, 320, and 640 WebP assets for each category.
- The focused component tests verify that only same-origin processed product WebP paths receive a responsive `srcSet`; remote, popup, SVG, and already-derived paths do not receive guessed variants.
- Local preview probes returned `200 image/webp` for a representative category derivative and preserved the generated security headers.

## Local Pages-compatible HTTP smoke probes

A local `wrangler pages dev dist/public` preview was checked before being stopped:

| URL | Expected | Result |
|---|---:|---:|
| `/` | 200 HTML | PASS |
| `/products` | 200 HTML | PASS |
| `/nope` | 404 branded shell | PASS |
| `/sitemap.xml` | 200 real XML | PASS |
| `/assets/*.js` | 200 JavaScript | PASS |
| `/categories/category-cars-approved-320.webp` | 200 WebP | PASS |

Observed headers included `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, and the expected XML/image content types.

## Catalog and commercial-data checks

- The local snapshot remains 29 approved toy products; POP UP remains 5 approved products.
- The workflow now transfers the validated catalog snapshot and its source/count/SHA-256 provenance from the validation job to the deploy job.
- No product record, price, image source, URL, or commercial field was edited as part of this candidate.
- Production was not fetched or modified as part of this QA run.

## Outstanding QA and release gates

1. Browser-level visual/focus/network QA across mobile, tablet, desktop, and large desktop remains outstanding in repository CI.
2. A real post-deployment verification is still required after an owner-approved merge: Pages hostname, custom domain, sitemap, representative product query, category/product media, 404 behavior, headers, and catalog count.
3. Cloudflare Access policy, DNS/custom-domain ownership, and the stale legacy GitHub Pages/CNAME claim require owner-side verification; no infrastructure change was made here.
4. The remaining low audit advisory should be reviewed in a later dependency-only change; it does not fail the high-severity release gate.

## QA decision

**PASS for controlled pull-request review; HOLD for Production deployment pending owner review, browser/device QA decision, and the separate Deploy & Verify gate.**
