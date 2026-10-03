# GAP ANALYSIS

**System:** `alaaomran2020/omran-store-live`  
**Baseline:** `main` at `a0d1fa53c99bffef682b324d4fae520c13f1292b`  
**Audit date:** 2026-10-03 UTC

The analysis below preserves the current storefront and commercial data. It recommends small, testable changes rather than a replacement platform.

| Current | Problem / gap | Impact | Recommendation | Priority |
|---|---|---|---|---:|
| Live repo and Cloudflare Pages workflow are confirmed | A separate old repository still has `omrantoys.store` as a GitHub Pages CNAME and a `bad_authz` certificate state | Future operators can deploy or investigate the wrong source; ownership is ambiguous | Keep `omran-store-live` as the only code source. Resolve or remove the stale legacy Pages claim only through a separately approved GitHub/DNS/Cloudflare operation | P0 external |
| `main` deploys through a gated workflow | The validation and deploy jobs previously refetched the external catalog independently | Rollback/provenance could differ even when code SHA was known | **Implemented:** validation records source, count, commit, and SHA-256 in an artifact; deploy restores that exact snapshot while retaining the commit-pinned CSV fallback | P1 resolved |
| Live Make/Apps Script catalog plus bundled snapshot | External source can fail, time out, or change shape | Catalog can be stale or an operator may not know which source rendered | Keep fail-safe snapshot; expose source/fetched-at state to admin diagnostics and keep timeout bounded | P1 |
| 29 toy + 5 POP UP approved products | Product IDs/data are split between external source, CSV, and snapshots | Drift can cause missing images, stale descriptions, or mismatch between source and bundle | **Partially implemented:** deterministic non-empty/unique/image/build guards and validated snapshot artifact; add deeper source-to-CSV reconciliation only with approved data contract | P1 |
| Product images have generated 320/640/960 WebP variants | Previously `ProductImage` used `sizes` without `srcSet` | Higher mobile transfer and slower product discovery | **Implemented:** same-origin generated variants are wired into `srcSet`, tested, and retain original fallback behavior | P1 resolved |
| Six homepage category cards use 1.9–2.2 MB PNGs | Approved media is much larger than the displayed card needs | ~12 MB of potential scroll-time transfer | **Implemented:** committed derived WebP 320/640/full assets and responsive `srcSet`; approved PNG originals remain preserved | P1 resolved |
| Local build generates untracked image variants | Running a build changes working-tree status with generated files | Misleading diffs and accidental commits; poor reproducibility | **Implemented:** explicit ignore rules document generated responsive product ownership | P1 resolved |
| `package.json` scripts call `pnpm` from inside other scripts | `corepack pnpm build` could fail in a shell without a pnpm shim | Local build can fail before the actual Vite build | **Implemented:** `dev`/`build` invoke the image generator directly with Node | P1 resolved |
| `pnpm audit` reports 22 advisories, including 5 high `undici` advisories | Vulnerable transitive dev tooling was present in jsdom/Vitest and Wrangler/Miniflare | Security gate could not be marked clean; toolchain risk | **Implemented:** targeted workspace overrides remove high findings; `pnpm audit --audit-level high` passes, with one low advisory remaining for review | P1 resolved/high gate |
| Static homepage metadata and runtime product metadata | Product title/JSON-LD/canonical are applied client-side | Weakness for non-JS crawlers and social unfurlers | Improve static catalog landing metadata and verify current indexing contract; do not replace Vite architecture solely for SSR | P2 |
| Sitemap has 42 clean canonical URLs | Product URLs are query-string dialog URLs | Less descriptive URLs and all product pages share a static HTML shell | Keep current stable URLs for backward compatibility; consider path-based static shells only after measuring SEO benefit and migration risk | P2 |
| Access/RBAC code is fail-closed | Cloudflare Access policy and trusted auth gateway are external and not verifiable from Git | Admin/account readiness can be overstated | Add an owner-side deployment verification checklist; do not add client passwords or fake sessions | P1 external |
| Automated tests cover 362 unit/component contracts | No browser-level mobile/tablet/desktop matrix runs in the repository workflow | Visual, focus, network, and real-device regressions can escape | Add a small production-like browser smoke suite or execute a documented manual matrix before each release | P1 |
| `client/index.html` always loads Ahrefs analytics | Third-party script runs on every page and adds a privacy/performance dependency | Extra request and external failure surface | Keep if commercially required; otherwise make it opt-in/configurable like the existing optional analytics plugin, after owner approval | P2 |
| `ProductImage` can fall back to raw GitHub `main` assets | Runtime image fallback depends on a branch outside the deployed artifact | A production image can vary from the deployed commit or fail if GitHub is unavailable | Prefer same-origin deployed assets first; retain a documented emergency fallback only if validated | P2 |
| `App.tsx` preserves many legacy admin aliases | Duplicate/legacy route declarations increase maintenance complexity | Low runtime risk, higher refactor risk | Consolidate route constants only after adding route coverage; no broad router rewrite | P2 |

## Recommended execution order

```text
1. Make build deterministic and clean — completed in controlled commits
2. Patch dependency audit findings — high-severity gate completed; one low remains
3. Wire responsive product images — completed with component tests
4. Serve optimized category derivatives — completed while preserving PNG originals
5. Add catalog provenance/reconciliation checks — provenance artifact completed; deeper reconciliation remains
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
