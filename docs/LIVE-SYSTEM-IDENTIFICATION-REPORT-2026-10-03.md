# LIVE SYSTEM IDENTIFICATION REPORT

**Company:** Omran Trading / Omran Toys  
**Discovery date:** 2026-10-03 (UTC)  
**Phase:** 1 — Discovery & live system identification  
**Decision:** **PRIMARY LIVE REPOSITORY CONFIRMED; proceed to Phase 2 audit.**

> No application code, product data, DNS, Cloudflare settings, or production settings were changed during discovery. This report is the only Phase 1 artifact created.

## Required identification

| Field | Confirmed value |
|---|---|
| **PRIMARY LIVE REPOSITORY** | `alaaomran2020/omran-store-live` |
| **LIVE BRANCH** | `main` |
| **DEPLOYMENT PROVIDER** | Cloudflare Pages |
| **CLOUDFLARE PAGES PROJECT** | `omrantoys-live-app` |
| **PRODUCTION DOMAIN** | `https://omrantoys.store` (with `www.omrantoys.store` documented as an associated hostname) |
| **LAST PRODUCTION COMMIT** | `a0d1fa53c99bffef682b324d4fae520c13f1292b` |
| **COMMIT DATE** | 2026-10-03 19:13:13 +0300 / 16:13:13 UTC |
| **FRAMEWORK** | React 19 + TypeScript, client-rendered Vite storefront |
| **BUILD SYSTEM** | Vite 7, Tailwind CSS 4 via Vite plugin, pnpm 11 lockfile |
| **DEPLOYMENT METHOD** | GitHub Actions validates the checkout, generates the approved catalog snapshot, runs audit/lint/typecheck/tests/build and bundle guards, then runs `wrangler pages deploy dist/public --project-name=omrantoys-live-app --branch=main`. |
| **PRODUCTION BRANCH RULE** | Pushes to `main` on storefront paths and scheduled/manual runs can deploy; pull requests validate only and do not deploy. |

## Proven production mapping

```text
alaaomran2020/omran-store-live
        │
        └── main
              │
              └── commit a0d1fa53c99bffef682b324d4fae520c13f1292b
                    │
                    └── .github/workflows/deploy-storefront.yml
                          │
                          ├── Vite build → dist/public
                          ├── Cloudflare Pages project: omrantoys-live-app
                          └── Pages production/custom domain → omrantoys.store
```

## Evidence

### 1. Repository and branch evidence

- The checked-out remote is `https://github.com/alaaomran2020/omran-store-live.git`.
- The working checkout is based on `main` commit `a0d1fa5...`; `origin/main` points to the same commit.
- The repository README identifies this repository as the production storefront and documents the Cloudflare Pages project `omrantoys-live-app`.
- `docs/CURRENT-ARCHITECTURE.md` records the production repository, `main` branch, Cloudflare Pages, the Pages project, and the domain.
- `package.json` contains the production deploy command targeting `omrantoys-live-app`.

### 2. Deployment evidence

The repository contains `.github/workflows/deploy-storefront.yml`. Its production job explicitly:

1. checks out `main`/the event ref;
2. selects the live Apps Script catalog with the repository CSV fallback;
3. generates the approved public product snapshot;
4. runs the integration audit, lint, TypeScript check, tests, and Vite build;
5. validates that approved product IDs and same-origin images are bundled; and
6. deploys `dist/public` to Cloudflare Pages project `omrantoys-live-app` on branch `main`.

GitHub Actions run evidence retrieved for this discovery:

- Run `37145353545` — scheduled production run at 2026-10-03 18:44:45 UTC.
- Head branch: `main`.
- Head SHA: `a0d1fa53c99bffef682b324d4fae520c13f1292b`.
- `Validate storefront integration`: **success**.
- `Deploy storefront production`: **success**.
- The deployment job reported successful completion for catalog selection, build, Cloudflare credential check, Cloudflare Pages deployment, sitemap verification, and deployment reporting.
- The preceding push run `37136047655` for the same SHA also completed successfully.

A production deployment record is not exposed through the GitHub Deployments API because the workflow deploys through Wrangler rather than creating a GitHub Deployment object. The workflow and successful job steps are therefore the authoritative repository-side deployment evidence.

### 3. Live content evidence

The following independently fetched endpoints returned the same current storefront content:

- `https://omrantoys.store/`
- `https://omrantoys-live-app.pages.dev/`

Both expose the current repository's distinctive content and assets, including:

- the title `عمران تويز | لعب أطفال وهدايا - شركة عمران التجارية`;
- the hero copy beginning `لعب تفرّحهم.`;
- `/categories/category-cars-640.webp`;
- product `OMR-RAW-001` / `محلول فقاعات صابون`; and
- `ساعة الأطفال الرقمية`.

These markers are present in the checked-out `client/` and `public/` source, including `client/index.html`, `client/src/components/HomeHero.tsx`, `client/src/lib/publicProductsSnapshot.ts`, and the public catalog/assets. The `cdn-cgi/trace` response from `omrantoys.store` also confirms that the production request is being served through Cloudflare.

This is stronger than a repository README claim: the Pages hostname and the custom domain expose the same current storefront content, while the older competing repository documented below contains a different catalog-only application and is not the source of the observed live content.

## Repository discovery and classification

The GitHub account currently exposes the following repositories relevant to the search terms `Omran`, `Omran Trading`, `Omran Toys`, `Store`, `Toys`, and `Ecommerce`:

| Repository | Classification | Discovery evidence / reason |
|---|---|---|
| `alaaomran2020/omran-store-live` | **LIVE** | Current production content matches the custom domain and Pages hostname; `main` has successful Cloudflare Pages deployment workflow runs. |
| `alaaomran2020/omran-store` | **ARCHIVE / CONFLICTING LEGACY PRODUCTION CANDIDATE** | Public Pages site is configured with CNAME `omrantoys.store`, source `main`, and the GitHub Pages certificate reports `bad_authz`; its README describes a different Next.js catalog-only application with 12 demo records and a Vercel/Pages/Workers history. It is not the observed current storefront source, but its stale domain claim is a production-ownership risk. |
| `alaaomran2020/omrantoys-store` | **DEVELOPMENT** | Older Vite/Cloudflare/Supabase/worker-shaped application with no confirmed production domain or current deployment to `omrantoys-live-app`. |
| `alaaomran2020/omran-toys` | **ARCHIVE** | Older Next.js application; GitHub Pages is `errored`, homepage is the repository GitHub Pages URL, and last activity predates the current live repository. |
| `alaaomran2020/omran-platform-v1` | **DEVELOPMENT** | Prototype Vite application with a Vercel homepage and no confirmed `omrantoys.store` production mapping. |
| `alaaomran2020/omran-toys-automation` | **DEVELOPMENT / OPERATIONS** | Telegram + AI product automation repository with Docker/Cloudflare configuration; not a storefront deployment source. |
| `alaaomran2020/omran-video-studio` | **DEVELOPMENT / TOOLING** | Go-based video studio with CI; no storefront/domain evidence. |
| `alaaomran2020/digital-execution-store` | **UNKNOWN / UNRELATED** | Digital products storefront; no Omran Toys production evidence. |
| `alaaomran2020/omran` | **UNKNOWN / PLATFORM** | General monorepo with `apps`, `packages`, and `services`; no confirmed storefront deployment/domain mapping. |
| `alaaomran2020/WebPilot-OS` | **UNKNOWN / TOOLING** | General Omran-named tooling repository; no confirmed storefront deployment/domain mapping. |
| `alaaomran2020/alaa-portfolio` | **UNRELATED / ARCHIVE** | Portfolio site, not the toys storefront. |
| `alaaomran2020/OMRAN6294` | **UNKNOWN** | Omran-named repository with no confirmed storefront/deployment evidence. |

No separate product-data repository was found. The operational catalog source referenced by the live workflow is an external public Apps Script/Google Sheet feed, with a commit-pinned CSV fallback in this repository. The approved public snapshot and same-origin processed images are bundled into the production build.

## Conflicting evidence and risk boundary

A stale competing production claim exists and must not be ignored:

- `alaaomran2020/omran-store` has a root `CNAME` containing `omrantoys.store`.
- GitHub Pages API reports that repository's Pages source as `main`, with CNAME `omrantoys.store` and certificate state `bad_authz`.
- Its README states that the domain previously pointed to Vercel while Pages was also configured, and describes a different application/data model.
- Current production content instead matches `omran-store-live` and the Cloudflare Pages project `omrantoys-live-app`.

**Interpretation:** the primary live repository is confirmed by current content plus successful deployment evidence. The old GitHub Pages/Vercel configuration is classified as stale/conflicting infrastructure, not as a second current storefront source. No DNS, Cloudflare, GitHub Pages, or legacy repository settings were changed because resolving or deleting that stale claim requires an explicit ownership/configuration operation outside Phase 1.

## Phase 1 gate

- [x] One primary live repository confirmed.
- [x] Live branch identified as `main`.
- [x] Build and deployment path identified.
- [x] Production domain mapped to the Cloudflare Pages-hosted storefront.
- [x] Related repositories classified.
- [x] Data source and repository fallback identified.
- [x] No production, DNS, Cloudflare, or product data changes made.

**Gate result:** `LIVE REPO CONFIRMED → PHASE 2 AUDIT MAY START`.

**Operational caution:** do not make changes to `alaaomran2020/omran-store`, GitHub Pages, DNS, or Cloudflare domain configuration as part of storefront development unless the stale ownership conflict is separately approved and verified.
