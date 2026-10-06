# Recovery Map — Omran Store

**Status:** Controlled / read-first
**Evidence snapshot:** 2026-10-06 UTC

## Recovery authority

Recovery depends on the canonical GitHub repository and its documented build, test, and deployment process—not on any AI service or GitLab copy.

- **Canonical source:** GitHub [`alaaomran2020/omran-store-live`](https://github.com/alaaomran2020/omran-store-live), protected branch `main`.
- **Build/test instructions:** [`README.md`](../README.md), `package.json`, and the relevant validation jobs in `.github/workflows/`.
- **Production deployment path:** [`.github/workflows/deploy-storefront.yml`](../.github/workflows/deploy-storefront.yml), which validates and builds before publishing to Cloudflare Pages project `omrantoys-live-app`.
- **Production runtime/domain:** Cloudflare Pages / `https://omrantoys.store`.
- **AI and GitLab:** optional assistance/copy systems; neither is needed to restore or deploy the Store.

A recovery operator must be authorized, use protected repository processes, preserve product and media integrity, and obtain explicit human approval before any production deployment or protected change.

## Dependency outage playbook

| Unavailable system | Recovery action | Must not do |
|---|---|---|
| **ChatGPT** | Continue from GitHub `main`, the repository README, and this documentation. An authorized human or another approved tool can follow the documented build/test process. | Do not treat ChatGPT output or stored conversation state as the only copy of code, data, or decisions. Do not add a replacement AI runtime dependency. |
| **Arena** | An authorized maintainer may use ordinary Git/GitHub access to inspect and work from the canonical repository, following the same branch, review, test, and approval rules. Preserve any unpushed work before switching tools. | Do not promote a local worktree, GitLab copy, or another branch to canonical. Do not bypass branch protection or deploy to compensate for the outage. |
| **Gemini** | No production recovery action is required. Continue using GitHub and the documented process; AI assistance is optional. | Do not wait on Gemini as a build, product-data, or deployment prerequisite. |
| **AlphaCode** | No production recovery action is required. Continue using GitHub and the documented process; AI assistance is optional. | Do not wait on AlphaCode as a build, product-data, or deployment prerequisite. |
| **GitLab** | Continue from GitHub `main`. GitLab repositories are mirrors/duplicates by governance and are not part of the production deployment path. Restore/synchronize a GitLab copy only if separately approved and after verifying its identity. | Do not promote GitLab to canonical, automatically reconcile divergent history, delete a repository, or modify the declared group mirror. |

If an AI system is unavailable, no Store runtime or product-source action is needed. If GitHub itself is unavailable, stop production changes and follow an owner-approved GitHub recovery procedure; do not silently promote a GitLab copy.

## Documented build and test recovery

From a clean checkout made by an authorized operator:

```bash
git clone https://github.com/alaaomran2020/omran-store-live.git
cd omran-store-live
git checkout main
pnpm install --frozen-lockfile
node scripts/integration-audit.mjs
node scripts/catalog-dependency-gate.mjs
pnpm lint
pnpm check
pnpm test
pnpm build
```

Review the working-tree diff after checks because build tooling may generate assets. Do not accept or deploy changed product data, product IDs/slugs/URLs, media references, or other generated content without the relevant approval and integrity review. These commands validate a checkout; running a build is not production approval.

## Production deployment recovery

1. Confirm the canonical GitHub `main`, repository ownership, reviewed change, and required human approval.
2. Run the governed GitHub Actions validation/deployment process in `.github/workflows/deploy-storefront.yml` using its authorized trigger and existing safeguards.
3. Confirm the Pages deployment and its production verification steps in GitHub Actions before reporting recovery complete.
4. Stop if Cloudflare access, production-domain ownership, credentials, or repository identity is ambiguous. Route provider/DNS issues to the authorized infrastructure owner; do not alter DNS or bypass the workflow.

The workflow currently defines qualifying `main` push, scheduled, and manual triggers. Pull requests validate only; the production deploy job is skipped for pull-request events. This recovery map does not change those triggers and does not authorize a manual dispatch or deployment for a documentation-only change.

## Recovery completion record

Report the repository and `main` commit used, workflow run URL and result (if a deployment was approved), validation results, integrity checks, and any unresolved provider limitation. Do not include secrets or private data in the report. After reporting, **STOP and wait for approval** before the next phase.
