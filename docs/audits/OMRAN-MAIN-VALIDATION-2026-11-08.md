# OMRAN main validation — 8 November 2026

## Scope and baseline

Follow-up to merged audit PR [#183](https://github.com/alaaomran2020/omran-store-live/pull/183) and its failed post-merge rerun.

- Verified main baseline: `71075393caf3526b700efaae8db3f9f5c778702f`.
- Execution: isolated Windows worktree; existing working files were preserved.
- Dependencies installed from the existing lockfile and local pnpm cache with `pnpm.cmd install --frozen-lockfile --offline`.
- No production deploy, live UI change, product/catalog change, logo change, workflow change, or external operational action was performed.

## Why the screenshot showed a failure

[Original attempt 1](https://github.com/alaaomran2020/omran-store-live/actions/runs/41155811573/attempts/1) completed successfully on 31 October. The `Validate storefront integration` job succeeded; the production deployment job was skipped.

[Attempt 2](https://github.com/alaaomran2020/omran-store-live/actions/runs/41155811573/attempts/2) failed at checkout after #183 was merged on 8 November. Its checkout requested `refs/pull/183/merge`, which GitHub no longer served. Package installation, tests and build were skipped in that attempt. This was not evidence of a failing application test or deployment failure.

Do not repeatedly rerun that closed PR's historical event expecting its temporary merge ref to return. A new validation of main is a separate run.

## Additional confirmed tooling defect

The local catalog dependency gate incorrectly reported its own forbidden-string assertions and `scripts/integration-audit.mjs` as production dependencies on Windows.

Two path-handling problems caused allow-list mismatches:

1. `new URL(import.meta.url).pathname` is a URL pathname, not a decoded native filesystem path.
2. Collected Windows paths used backslashes, while the explicit integration-audit allow-list entry used forward slashes.

The fix uses `fileURLToPath` and normalizes repository-relative paths to forward slashes for matching and diagnostics. The scanned surfaces, forbidden patterns and existing allow-list scope are unchanged.

Regression coverage runs the actual gate in a disposable fixture whose path contains spaces. It verifies both a clean result with assertion files present and rejection of a real forbidden endpoint in executable storefront code. Both tests failed before the fix on this Windows machine and passed afterward.

## Verification results

| Check | Result |
| --- | --- |
| Frozen offline dependency install | PASS; pnpm 11.19.0 |
| `pnpm.cmd lint` | PASS: zero errors; one existing unused `url` warning in Products.tsx:169 |
| `pnpm.cmd check` | PASS |
| Catalog gate regression tests | PASS: 2 tests |
| Full Vitest suite, Node 22.23.4, four workers | PASS: 60 files / 393 tests |
| `pnpm.cmd build`, local Node 26.13.0 | PASS: 56 approved product shells / 64 sitemap URLs |
| `node scripts/verify-static-assets.mjs` | PASS: 96 HTML shells, 2 referenced hashed assets, 64 sitemap URLs |
| `node scripts/integration-audit.mjs` | PASS |
| `node scripts/catalog-dependency-gate.mjs` after fix | PASS: 223 executable files scanned |
| `node --test scripts/product-intake-security.test.mjs` | PASS: 8 tests using mocked operational dependencies |
| `git diff --check` | PASS |

Full-suite command on Node 22:

```text
node node_modules/vitest/vitest.mjs run --maxWorkers=4
```

The Node executable in this command was Node 22.23.4, matching the CI major version. No package or lockfile changes were needed.

### Failed attempts and limits

- The machine's default Node 26 run had 11 failures: ten storage-related failures in wishlist/inquiry tests and a lazy-dialog wait timeout.
- A default-parallelism Node 22 run resolved the storage failures but still had one lazy-dialog timeout (392 passed / 1 failed).
- The complete Node 22 suite with four workers passed all 393 tests. This indicates scheduling sensitivity in the existing lazy-dialog test; its timeout was not increased and the test was not skipped.
- Build and lint/typecheck used the installed local toolchain. The build passed on Node 26; this is not a claim of reproducing the entire Ubuntu/Node 22 GitHub runner.
- The standalone Wrangler Pages Functions compilation step was not rerun locally. Its original pre-merge CI step passed.
- Browser/mobile screenshots, live Core Web Vitals and actual Search Console indexing remain outside this verification. The open limitations in the audit are not marked completed by a successful build.

## Validation without deployment

The existing [Smart Search Validation workflow](https://github.com/alaaomran2020/omran-store-live/actions/workflows/smart-search-validation.yml) supports manual execution on main and contains lint, typecheck, tests, build and static-asset checks without a deployment job. It was inspected, not dispatched in this follow-up.

The existing Deploy Storefront workflow can deploy when manually dispatched. It was deliberately not dispatched. Neither workflow is changed by this fix.

A fresh PR runs the normal PR validation against the new change. Approval of validation is not permission to merge or deploy.

## Review and rollback

The proposed change contains only the catalog gate path fix, its regression tests and this verification note. Generated media/build files are local outputs and excluded from the PR. Runtime catalog rules, data, branding and store behavior are preserved.

Rollback is a revert of this isolated tooling change. It restores the previous Windows false-positive behavior without requiring any store data recovery.

The broader audit improvements and Prompt 09 creative work remain separate follow-ups; this PR does not implement them.
