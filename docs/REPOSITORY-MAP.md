# Repository Map — Omran Store

**Status:** Controlled / read-first / no production deploy
**Evidence snapshot:** 2026-10-06 UTC
**Purpose:** Record the verified repository, deployment, mirror, automation, and data boundaries. This document is not authorization to deploy, merge, change infrastructure, or delete repositories.

## Canonical repository

| Role | Repository | Evidence at snapshot |
|---|---|---|
| **Canonical production source** | [GitHub `alaaomran2020/omran-store-live`](https://github.com/alaaomran2020/omran-store-live), branch `main` | GitHub reports `main` at `da9e6d08e02b98da674d2cd13b2609aaa32043c0`; the branch is protected. The checked-out `origin` points to this repository. |
| **Production catalog source** | `public/catalog/products.csv` in the canonical repository | `README.md` and `.github/workflows/deploy-storefront.yml` identify this repository file as the catalog source used for the build. |

The GitHub repository and its protected `main` branch are the only canonical source for the Store. Product data, source code, product identifiers, URLs, and media references do not acquire a different authority merely because a copy is newer or is available elsewhere.

## Production runtime and deployment relationship

| Role | Value |
|---|---|
| **Hosting/runtime** | Cloudflare Pages (static storefront) |
| **Pages project** | `omrantoys-live-app` — [Pages hostname](https://omrantoys-live-app.pages.dev) |
| **Production domain** | [`https://omrantoys.store`](https://omrantoys.store); `www.omrantoys.store` is also documented as an associated hostname in the existing architecture record. |
| **Deployment authority** | GitHub Actions workflow [`.github/workflows/deploy-storefront.yml`](https://github.com/alaaomran2020/omran-store-live/blob/main/.github/workflows/deploy-storefront.yml) |

The workflow validates the checkout, builds the site, checks catalog/media integrity, and then runs Wrangler against Pages project `omrantoys-live-app` on branch `main`. Pull requests run validation only; the deploy job is skipped for pull-request events. The existing workflow also has qualifying push-to-`main`, scheduled, and manual triggers. `package.json` also contains a local `pnpm deploy` command that invokes Wrangler directly; its presence is not authorization to use it. The controlled production path evidenced by the successful run is GitHub Actions, and this governance change does not change triggers or invoke a deployment.

GitHub Actions run [37388833294](https://github.com/alaaomran2020/omran-store-live/actions/runs/37388833294) completed successfully on `main` at `da9e6d0…`; both validation and production-deploy jobs succeeded, including the Cloudflare Pages deployment and Pages sitemap verification steps. The workflow and this run establish the repository-side deployment path. The existing [`LIVE-SYSTEM-IDENTIFICATION-REPORT-2026-10-03.md`](./LIVE-SYSTEM-IDENTIFICATION-REPORT-2026-10-03.md) records the production-domain mapping and its prior live-site checks.

**Verification boundary:** the production host resolved to Cloudflare addresses during this inspection. A direct HTTPS request from this sandbox did not complete because of an outbound TLS error, and no Cloudflare dashboard/API credentials were used. Accordingly, the Cloudflare project/domain mapping is supported here by the checked-in deployment workflow, successful GitHub Actions evidence, and the existing identification report—not by a fresh Cloudflare dashboard inspection.

Cloudflare Pages is the production runtime and delivery layer; it is not the source repository or the authority for product records.

## GitLab repositories — copies, not production authority

**Explicit rule: GitLab copies are not Production Source of Truth.** They must not silently become canonical, control production deployment, or override GitHub `main`.

| Declared role | GitLab project | Project ID | Inspection and status |
|---|---|---:|---|
| **Mirror** | [`omran-toys-company-group/omran-store-live`](https://gitlab.com/omran-toys-company-group/omran-store-live) | `87219545` | Listed as the mirror in the supplied repository inventory. Unauthenticated inspection returned `404 Project Not Found` from the GitLab API and redirected the project page to sign-in. Its existence, visibility, and current revision could not be independently verified in this inspection. It remains a *declared mirror*, not a canonical source. Do not modify it as part of this work. |
| **Duplicate / removal candidate** | [`adreanolomran/omran-store-live`](https://gitlab.com/adreanolomran/omran-store-live) | `87219408` | Public GitLab API metadata confirms this project and its `main` branch. At inspection, GitLab `main` was `4b8f05924b48c07412d75117bc644a6daa4523b1`, older than GitHub `main` at `da9e6d08e02b98da674d2cd13b2609aaa32043c0`; the public pipelines endpoint returned an empty list. Classified as a duplicate/removal candidate only. **Do not delete, modify, or otherwise act on it without explicit human approval.** |

The second project’s public `main` includes a GitHub-originated merge commit, but that does not make GitLab authoritative. The current GitHub `main` and its successful Pages workflow are the evidence for the active production source and deployment path. The first project is not publicly inspectable from this environment, so no claim is made about its hidden settings or pipelines.

## AI and automation repositories/systems

- The canonical repository contains auxiliary automation under `automation/` and CI/CD under `.github/workflows/`. These are implementation tools; only the specifically governed GitHub Actions deployment workflow is the repository-side production deploy path.
- [`alaaomran2020/omran-toys-automation`](https://github.com/alaaomran2020/omran-toys-automation) is a separate public Telegram/AI product-automation repository. It is classified as development/operations, not as the Store’s canonical source or production deployment authority.
- ChatGPT, Arena, Gemini, AlphaCode, and any other AI agents/services are execution or assistance systems. They may inspect or perform approved work, but they do not own canonical source, production data, or production approval.
- AI service availability is not a Store runtime or recovery dependency. No AI runtime dependency is authorized by this map.

## Private data repositories

No separate private data repository was independently identified or authorized as a Store source of truth in this inspection. The production catalog source is the repository-controlled CSV above. This map does not designate a new home for private operational records or credentials. Private data, if held elsewhere under an owner-approved boundary, must remain access-controlled and must not be copied into this public repository or promoted to product authority without explicit review.

## Legacy and alternate repositories

The following GitHub projects are not production authority for this Store. The classifications below follow the existing repository discovery report; they do not authorize deletion or configuration changes.

| Repository | Boundary |
|---|---|
| [`alaaomran2020/omran-store`](https://github.com/alaaomran2020/omran-store) | Legacy/alternate project with a previously documented stale or conflicting production-domain claim. Treat as an ownership risk, not as a live Store source. |
| [`alaaomran2020/omrantoys-store`](https://github.com/alaaomran2020/omrantoys-store) | Older development project; no confirmed current production mapping to `omrantoys-live-app`. |
| [`alaaomran2020/omran-toys`](https://github.com/alaaomran2020/omran-toys) | Older project; no confirmed current production mapping. |
| [`alaaomran2020/omran-platform-v1`](https://github.com/alaaomran2020/omran-platform-v1) | Prototype/development project; no confirmed current production mapping. |

The existing [`LIVE-SYSTEM-IDENTIFICATION-REPORT-2026-10-03.md`](./LIVE-SYSTEM-IDENTIFICATION-REPORT-2026-10-03.md) contains the broader discovery context. A legacy repository, a mirror, or a project with a domain claim must never be promoted or removed by inference.

## Stop condition

If repository identity, ownership, product source, or production deployment authority is ambiguous, **STOP**. Preserve all copies and production settings; request explicit human verification before the next action.
