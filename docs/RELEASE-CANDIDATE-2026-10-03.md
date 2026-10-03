# RELEASE CANDIDATE

**System:** Omran Trading / Omran Toys storefront  
**Repository:** `alaaomran2020/omran-store-live`  
**Branch:** `arena/01a10392-omran-store-live`  
**Candidate head:** `e3fb222` (`1ddebceac11ee824aed307547eb41195b18e14e0` code candidate plus release documentation)  
**Baseline:** `main` at `a0d1fa53c99bffef682b324d4fae520c13f1292b`  
**Candidate date:** 2026-10-03 UTC  
**Production status:** **DEPLOYED AND VERIFIED BY WORKFLOW 37154608891**

## Purpose

This is the Phase 3 controlled-development release candidate for the confirmed existing storefront. It is not a replacement project and it does not authorize direct Production, DNS, Cloudflare, catalog, price, URL, or commercial-data changes.

## Included controlled changes

1. **Build hygiene** — `dev` and `build` invoke the responsive-image generator directly with Node; generated product derivatives are explicitly ignored.
2. **Dependency gate** — targeted pnpm workspace overrides pin the vulnerable transitive `undici` paths used by jsdom and Miniflare/Wrangler to compatible patched versions.
3. **Responsive product media** — local processed WebP product sources expose same-origin 320/640/960 `srcSet` candidates, with the original declared source and fallback behavior preserved.
4. **Homepage category media** — six approved PNG originals remain unchanged; committed full/320/640 WebP derivatives are used by the category cards with responsive `srcSet` and `sizes`.
5. **Catalog provenance** — the validation workflow records the selected source, approved count, commit, and snapshot SHA-256 in a short-lived artifact; the deploy job restores that exact validated snapshot rather than refetching the external source.

## Preservation statement

- No approved product records, prices, names, descriptions, publication fields, URLs, or commercial data were deleted or rewritten.
- The baseline remains 29 approved toy products and 5 approved POP UP products.
- Approved category PNG sources and approved product source media remain present; derived WebP files are additive delivery assets.
- The existing React/Vite, Cloudflare Pages, WhatsApp-first, fail-closed account/auth, POP UP, and external-catalog-with-fallback architecture remains in place.

## Candidate commits

| Commit | Purpose |
|---|---|
| `c51fee3` | Build script hygiene, generated-derivative ignore rules, and targeted dependency overrides/lockfile update |
| `e164fb8` | Product/category responsive media delivery and component regression tests |
| `1ddebce` | Validated catalog artifact handoff between workflow validation and deployment |
| `e3fb222` | Updated current-state, gap-analysis, and target-architecture documents |

## Candidate decision

**GO for the controlled merge and deployment gate; deployment completed successfully.**

The pull-request workflow validated the exact branch, PR #141 was merged, and Production was deployed only by the confirmed `main` → Cloudflare Pages workflow. The post-deploy workflow verified the Pages sitemap and live endpoint fetches verified the custom domain, product query, safe unknown-product fallback, 404, robots, sitemap, and derived media markers.

Browser/device QA remains a residual release risk, and the stale legacy GitHub Pages/CNAME claim plus Cloudflare Access/DNS ownership checks remain separate external operations. They were not changed by this candidate.
