# GAP ANALYSIS

**System:** `alaaomran2020/omran-store-live`  
**Baseline:** `main` at `a0d1fa53c99bffef682b324d4fae520c13f1292b`  
**Audit date:** 2026-10-03 UTC

The analysis below preserves the current storefront and commercial data. It recommends small, testable changes rather than a replacement platform.

| Current | Problem / gap | Impact | Recommendation | Priority |
|---|---|---|---|---:|
| Live repo and Cloudflare Pages workflow are confirmed | A separate old repository still has `omrantoys.store` as a GitHub Pages CNAME and a `bad_authz` certificate state | Future operators can deploy or investigate the wrong source; ownership is ambiguous | Keep `omran-store-live` as the only code source. Resolve or remove the stale legacy Pages claim only through a separately approved GitHub/DNS/Cloudflare operation | P0 external |
| `main` deploys through a gated workflow | Scheduled runs rebuild from an external catalog feed, so the deployed commit alone does not identify the exact catalog payload | Rollback/provenance can be incomplete even when code SHA is known | Record the selected source and a catalog content hash in the deployment output/artifact; keep the commit-pinned CSV fallback | P1 |
| Live Make/Apps Script catalog plus bundled snapshot | External source can fail, time out, or change shape | Catalog can be stale or an operator may not know which source rendered | Keep fail-safe snapshot; expose source/fetched-at state to admin diagnostics and keep timeout bounded | P1 |
| 29 toy + 5 POP UP approved products | Product IDs/data are split between external source, CSV, and snapshots | Drift can cause missing images, stale descriptions, or mismatch between source and bundle | Add a deterministic source/snapshot reconciliation check; never delete or silently rewrite records | P1 |
| Product images have generated 320/640/960 WebP variants | `ProductImage` uses `sizes` but not `srcSet`; browsers generally request full source assets | Higher mobile transfer and slower product discovery | Wire same-origin generated variants into `srcSet`, test variant URL construction, retain original fallback behavior | P1 |
| Six homepage category cards use 1.9–2.2 MB PNGs | Approved media is much larger than the displayed card needs | ~12 MB of potential scroll-time transfer | Add derived WebP 320/640/full assets and use `<picture>`/`srcSet`; keep original approved PNGs as preserved source assets | P1 |
| Local build generates untracked image variants | Running a build changes working-tree status with generated files | Misleading diffs and accidental commits; poor reproducibility | Add explicit ignore rules for generated responsive product variants and document generation ownership | P1 |
| `package.json` scripts call `pnpm` from inside other scripts | `corepack pnpm build` fails in a shell without a pnpm shim even though the package manager is declared | Local build can fail before the actual Vite build | Call the Node image generator directly from `dev`/`build`, or ensure Corepack shim; prefer direct Node for nested scripts | P1 |
| `pnpm audit` reports 22 advisories, including 5 high `undici` advisories | Vulnerable transitive dev tooling is present in jsdom/Vitest and Wrangler/Miniflare | Security gate cannot be marked clean; toolchain risk | Patch compatible transitive `undici` versions via targeted pnpm overrides/update and rerun tests/build/audit | P1 |
| Static homepage metadata and runtime product metadata | Product title/JSON-LD/canonical are applied client-side | Weakness for non-JS crawlers and social unfurlers | Improve static catalog landing metadata and verify current indexing contract; do not replace Vite architecture solely for SSR | P2 |
| Sitemap has 42 clean canonical URLs | Product URLs are query-string dialog URLs | Less descriptive URLs and all product pages share a static HTML shell | Keep current stable URLs for backward compatibility; consider path-based static shells only after measuring SEO benefit and migration risk | P2 |
| Access/RBAC code is fail-closed | Cloudflare Access policy and trusted auth gateway are external and not verifiable from Git | Admin/account readiness can be overstated | Add an owner-side deployment verification checklist; do not add client passwords or fake sessions | P1 external |
| Automated tests cover 361 unit/component contracts | No browser-level mobile/tablet/desktop matrix runs in the repository workflow | Visual, focus, network, and real-device regressions can escape | Add a small production-like browser smoke suite or execute a documented manual matrix before each release | P1 |
| `client/index.html` always loads Ahrefs analytics | Third-party script runs on every page and adds a privacy/performance dependency | Extra request and external failure surface | Keep if commercially required; otherwise make it opt-in/configurable like the existing optional analytics plugin, after owner approval | P2 |
| `ProductImage` can fall back to raw GitHub `main` assets | Runtime image fallback depends on a branch outside the deployed artifact | A production image can vary from the deployed commit or fail if GitHub is unavailable | Prefer same-origin deployed assets first; retain a documented emergency fallback only if validated | P2 |
| `App.tsx` preserves many legacy admin aliases | Duplicate/legacy route declarations increase maintenance complexity | Low runtime risk, higher refactor risk | Consolidate route constants only after adding route coverage; no broad router rewrite | P2 |

## Recommended execution order

```text
1. Make build deterministic and clean
2. Patch dependency audit findings
3. Wire responsive product images
4. Serve optimized category derivatives
5. Add catalog provenance/reconciliation checks
6. Add browser-level QA
7. Re-evaluate SEO/static product shells with measured evidence
8. Resolve external legacy CNAME/Access configuration separately
```

## Risk-control rules for all recommendations

- Do not change product IDs, prices, names, descriptions, publication flags, images, or routes without a source-backed reason and tests.
- Do not delete the original approved media when adding derived performance assets.
- Do not move the deployment to another repository/provider.
- Do not add an application server, database, or replacement framework to solve an incremental gap.
- Each item should be a separate small commit with its own tests and rollback path.
