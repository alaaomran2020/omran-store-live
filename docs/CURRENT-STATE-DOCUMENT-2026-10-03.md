# CURRENT STATE DOCUMENT

**System:** Omran Trading / Omran Toys storefront  
**Audit date:** 2026-10-03 UTC  
**Discovery report:** [`LIVE-SYSTEM-IDENTIFICATION-REPORT-2026-10-03.md`](./LIVE-SYSTEM-IDENTIFICATION-REPORT-2026-10-03.md)  
**Audit scope:** current live repository and publicly observed production storefront; no product, DNS, Cloudflare, or legacy-repository changes.

## Executive state

The confirmed live system is a static, client-rendered React storefront built with Vite and deployed to Cloudflare Pages. It is not a new replacement application. The current production path is:

```text
omran-store-live/main
  → GitHub Actions validation
  → Vite build (dist/public)
  → Cloudflare Pages: omrantoys-live-app
  → https://omrantoys.store
```

The live storefront is healthy at the repository/deployment level:

- `node scripts/integration-audit.mjs`: **PASS**
- `pnpm lint`: **PASS** — 0 warnings, 0 errors
- `pnpm check`: **PASS** — TypeScript clean
- `pnpm test`: **PASS** — 54 files, 362 tests
- `pnpm build`: **PASS** — Vite production build, generated route shells and 42-URL sitemap
- Latest observed production workflow `37145353545`: **success** for `main` commit `a0d1fa53c99bffef682b324d4fae520c13f1292b`
- Controlled branch verification at `1ddebceac11ee824aed307547eb41195b18e14e0`: lint, typecheck, tests, build, integration audit, responsive media bundle checks, and `pnpm audit --audit-level high` all **PASS**.

The controlled branch is a release candidate for the completed code-safety and media changes, not a production deployment. One low-severity development-tool advisory remains in `pnpm audit` and browser/device QA is still outstanding. The production domain also has a stale competing GitHub Pages/CNAME claim documented in the Phase 1 report; it is not changed here.

## 1. Current architecture

### Runtime

- React 19 + TypeScript.
- Vite 7 build and dev server.
- Tailwind CSS 4 through `@tailwindcss/vite`.
- Wouter client-side routing.
- TanStack Query for catalog refresh state.
- Static Cloudflare Pages assets only; no production API server, VPS, Worker runtime, Docker runtime, MySQL, or tunnel.
- `dist/public` is the deploy directory.
- Vite build plugins emit `_headers`, SPA route shells, `404.html`, `_redirects`, and a generated sitemap.

### Main application boundaries

| Boundary | Current implementation | State |
|---|---|---|
| Public storefront | `client/src/pages/Storefront.tsx` and home components | KEEP |
| Product catalog | `Products.tsx`, `productsClient.ts`, shared publication guard | KEEP / IMPROVE |
| Product details | Query-string product state and `ProductDetailsDialog` | KEEP / IMPROVE |
| POP UP catalog | Separate `/popup` and `/popup/videos` paths and snapshot | KEEP |
| Customer account | `/account/*`, external same-origin auth gateway contract | IMPROVE / currently fail-closed |
| Admin | `/admin/*`, Cloudflare Access identity and in-app RBAC | KEEP / externally verify |
| Analytics/conversion | Make gateway and WhatsApp events | KEEP / monitor external dependency |
| Data operations | Google Sheet/Apps Script, commit-pinned CSV fallback, approved snapshot | KEEP |
| Hosting | Cloudflare Pages `omrantoys-live-app` | KEEP |

### Route inventory

Public routes:

- `/`
- `/products`
- `/popup`
- `/popup/videos`
- `/rewards`
- `/vip`
- `/vip/terms`
- `/vip/privacy`

Operational/customer routes:

- `/account`, `/account/login`, `/account/profile`, `/account/addresses`, `/account/wishlist`, `/account/vip`, `/account/settings`
- `/admin`, `/admin/dashboard`, `/admin/products`, `/admin/products/:id`, `/admin/categories`, `/admin/inventory`, `/admin/content`, `/admin/whatsapp`, `/admin/quality`, `/admin/reports`, `/admin/customers`, `/admin/users`, `/admin/audit-log`, `/admin/settings`, `/admin/product-intake`, `/admin/vip-operations`, plus preserved legacy admin aliases.

Fallback behavior:

- A built `404.html` shell exists for unknown Cloudflare Pages paths.
- The client-side `NotFound` page is marked noindex/follow.
- Known client routes receive explicit HTML shells in the production build.

## 2. Current repository structure

Important directories:

```text
client/
  index.html                 static document head and homepage metadata
  src/App.tsx                route ownership
  src/pages/                 public, account, and operations pages
  src/components/            storefront UI and shared presentation
  src/lib/                   catalog, SEO, analytics, auth, and UI utilities
  src/admin/                 admin shell, RBAC pages, and change packets
shared/                      product, taxonomy, sitemap, auth, audit, and policy contracts
public/catalog/              commit-pinned CSV fallback
public/data/                 generated inventory/catalog data
public/products/             approved product media
public/categories/           category media
scripts/                     snapshot, images, sitemap, integration, and data utilities
.github/workflows/            validation, security, and Cloudflare Pages deployment
```

The repository contains a large amount of historical automation and operational documentation. That material is not part of the shipped browser bundle unless imported by the application.

## 3. Current data structure and Data Preservation Map

### Catalog records

- Current fallback snapshot: **29 approved toy products** in `client/src/lib/publicProductsSnapshot.ts`.
- Current POP UP snapshot: **5 approved POP UP products** in `client/src/lib/popupProductsSnapshot.ts`.
- Commit-pinned CSV fallback: **29 data rows** in `public/catalog/products.csv`.
- Production fetch observed through the public site: 29 toy products and 5 POP UP products in the generated sitemap.
- Public publication gate is fail-closed: `active === true` AND `workflow_status === PUBLISHED` AND `qa_status === PASS`.
- Product IDs, names, descriptions, prices, image declarations, and publication fields are preserved as source data; no product data was changed in this audit.

| Existing data | Source | Used by | Dependencies | Risk |
|---|---|---|---|---|
| Approved toy catalog | External Apps Script/Google Sheet feed at deployment/runtime, then `public/catalog/products.csv` fallback | `scripts/generate-public-products-snapshot.ts`, `productsClient.ts`, `/products`, sitemap | publication guard, CSV parser, image bundle guard | External feed can be unavailable or change between deployments; fallback is safe but can be stale. |
| Approved snapshot | `client/src/lib/publicProductsSnapshot.ts` | initial render, live-catalog fallback, sitemap, product JSON-LD | `shared/products.ts`, local image assets | Snapshot is last-known-good, but content changes require a controlled commit/deploy. |
| POP UP catalog | `client/src/lib/popupProductsSnapshot.ts` | `/popup`, POP UP sitemap entries, popup product dialogs | `shared/productCatalog.ts` | Separate catalog must not be mixed with toys. |
| CSV catalog | `public/catalog/products.csv` | CI fallback, admin fallback, operational audit | pinned raw GitHub URL in workflow | Can lag the live Sheet; currently protected by commit-pinned fallback. |
| Product media | `public/products/processed/` and `public/products/popup/` | product cards, gallery, dialogs, bundle guard | local asset paths and generated variants | Processed WebP sources now expose same-origin 320/640/960 `srcSet` candidates; approved originals and declared fallbacks remain intact. |
| Category media | `public/categories/` | homepage category cards and hero | approved PNG sources plus derived WebP references | Six approved PNGs remain preserved; homepage cards now use committed full/320/640 WebP derivatives and responsive `srcSet`. |
| Brand/company content | `shared/openingProfile.ts`, `shared/site.ts`, `shared/storeContent.ts`, `client/index.html` | homepage, header/footer, JSON-LD, opening consistency gate | Vite build consistency plugin | Duplicate content surfaces can drift if changed outside the canonical profile. |
| WhatsApp conversion | `VITE_WHATSAPP_NUMBER` / production env and `productFormat.ts` | hero, cards, details, footer | `analytics.ts`, Make gateway | External WhatsApp/Make availability is outside the static app. |
| Conversion analytics | `client/src/lib/analytics.ts` and `MAKE_GATEWAY_URL` | product views, searches, WhatsApp events | public Make hook, Google Sheets scenario | External endpoint failure must never block conversion; observability is external. |
| Customer auth | `VITE_AUTH_API_BASE` contract, default `/api/auth` | `/account/*` | trusted gateway not present in this static repository | UI fails closed; account sign-in cannot be considered production-ready without the gateway. |
| Admin identity | Cloudflare Access at `/cdn-cgi/access/*` | `/admin/*` | external Cloudflare Access policy | Repository cannot prove the external policy is configured correctly; requires owner-side verification. |
| Domain/deployment | Cloudflare Pages and DNS/Access configuration | all production paths | external Cloudflare account and stale legacy Pages claim | Do not modify without separate ownership approval. |

## 4. Current UX

### Homepage

- RTL Arabic layout with skip link, announcement bar, branded header, hero, category cards, age browsing, latest products, trust/support content, POP UP separation, and footer.
- Primary conversion is WhatsApp inquiry, not card payment or checkout.
- Product and category links preserve query-string discovery paths.
- Current observed production content matches the checked-out live repository.

### Navigation and discovery

- Desktop navigation exposes products, categories, B2B, POP UP, branches, and search.
- Mobile navigation and product search are implemented with tested keyboard/focus behavior.
- Product discovery supports search, category, age, brand, tags, availability, catalog sort, and incremental rendering (24 cards initially).
- The live catalog is attempted after the bundled snapshot; an upstream failure retains a usable catalog.

### Product details and conversion

- Product detail state is URL-addressable with `?product=<id>`.
- Details are rendered in an accessible dialog with focus management and related products.
- Cards expose product ID/SKU, availability state, image/media indicators, details, and WhatsApp inquiry.
- There is intentionally no cart/payment flow in the current storefront; this is a WhatsApp-first catalog contract, not a broken checkout.

### Mobile/desktop observations

- CSS includes responsive grid/layout rules, mobile-safe controls, RTL support, reduced-motion styles, and WCAG-focused focus/contrast tokens.
- Automated component/accessibility coverage is strong.
- A fresh real-device/browser matrix was not run in this audit because the repository does not include a Playwright/Cypress browser QA workflow; this remains a Phase 4 gap.

## 5. Current UI and brand

- Brand tokens are centralized in `client/src/index.css` and `design-system.css`.
- Palette: navy/blue/cream, yellow accent, and darkened WhatsApp green for AA contrast.
- Alexandria is loaded from Google Fonts with `display=swap`.
- Product cards, category cards, dialogs, filters, buttons, footer, and admin primitives use consistent radius, spacing, and focus conventions.
- Accessibility audit history documents skip-link, focus-trap, contrast, modal, and reduced-motion fixes; current tests enforce many of those contracts.

## 6. Current SEO

### Present and working

- Static homepage title, description, canonical, Open Graph, Twitter metadata, Organization, WebSite, and LocalBusiness JSON-LD in `client/index.html`.
- Runtime metadata helper for public pages and product selections.
- Product metadata includes canonical query URL, product image, description, breadcrumbs, and Product JSON-LD without invented offer/rating/review data.
- `public/robots.txt` blocks admin/private paths and references the sitemap.
- Build-generated sitemap contains 42 URLs: 8 static public paths, 29 toy products, and 5 POP UP products.
- Unknown product query is treated as a noindex/follow soft-404; unknown pathname receives the NotFound view.
- Production `robots.txt` and `sitemap.xml` were fetched successfully during this audit.

### Limitation

The storefront is client-rendered. Product-specific metadata and Product JSON-LD are applied after JavaScript executes. The static HTML shell is not a server-rendered per-product document, so non-JavaScript crawlers and link unfurlers receive weaker product-specific metadata. A full SSR/SSG rebuild would be high-risk and is not recommended as the next change; improve the current static architecture incrementally.

## 7. Current performance

Observed local production build metrics:

- `dist/` size after the build: approximately 25 MB including public media.
- Main application JavaScript: approximately 454 KB raw / 137 KB gzip.
- Main CSS: approximately 197 KB raw / 30 KB gzip.
- Product images are lazy-loaded and processed local WebP candidates now expose generated 320/640/960 `srcSet` variants while retaining the declared source fallback.
- Six approved homepage category PNGs remain preserved as source assets, while committed full/320/640 WebP derivatives reduce the category-card delivery set from approximately 12 MB of PNG sources to approximately 1.4 MB of WebP derivatives.
- Hashed JS assets receive immutable caching through the generated `_headers`; HTML remains revalidated by Cloudflare Assets.
- Vite build has no source maps in shipped output.

## 8. Current deployment and environment

- GitHub Actions validates PRs and deploys only non-PR `main`/scheduled/manual runs.
- The validation job chooses the live Apps Script feed when its expected header is present and otherwise uses a commit-pinned raw CSV fallback.
- The validation job records the selected catalog source, approved count, snapshot SHA-256, and commit in a short-lived artifact; the deploy job restores that exact validated snapshot instead of refetching the external feed.
- The workflow runs the integration audit, lint, typecheck, tests, build, image/catalog bundle guards, provenance capture, Cloudflare credential check, Pages deploy, and sitemap probes.
- `.env.production` contains only public runtime contact/subscriber values; secrets are expected in GitHub/Cloudflare configuration, not in browser environment files.
- Static security headers are generated into the Pages output.
- Cloudflare Access, custom-domain binding, DNS, and external Make/Google configurations cannot be completely verified from this repository alone.

## 9. Technical debt

1. The remaining image-performance gap is coverage for remote/popup/legacy assets that do not have generated variants; those paths intentionally retain declared fallbacks.
2. Generated responsive product files are now explicitly ignored; a clean build still owns them as ephemeral output rather than source data.
3. `pnpm audit --audit-level high` is green after targeted `undici` overrides; one low-severity development-tool advisory remains for later dependency review.
4. Approved PNG category sources remain large but are preserved; homepage delivery now uses approximately 1.4 MB of derived WebP assets.
5. Product SEO depends on client-side metadata mutation rather than pre-rendered product documents.
6. `App.tsx` contains preserved legacy admin aliases and duplicated explicit operational route entries; this is low-risk refactor debt, not a production blocker.
7. Validation and deployment now share a catalog snapshot artifact with source, count, commit, and SHA-256 provenance.
8. Existing historical documents contain stale deployment dates/commit claims; the new dated reports are the current audit reference.
9. Browser-level responsive/performance regression tests are missing from CI.
10. The stale `omran-store` GitHub Pages CNAME/certificate claim remains external infrastructure debt.

## 10. Critical issues and current classification

| Area | Classification | Priority | Current decision |
|---|---|---:|---|
| Live repository/deployment identity | KEEP | P0 | Confirmed in Phase 1; do not switch repositories. |
| Product publication guard and fallback snapshot | KEEP | P0 | Preserve; no product deletion or replacement. |
| Cloudflare Pages deployment gate | KEEP | P0 | Preserve required checks and main-only production deployment. |
| Catalog runtime resilience | IMPROVE | P1 | Validation/deploy provenance is now captured; expose source/age to operations in a later owner-approved diagnostics change. |
| Product responsive media | IMPROVED | P1 | Same-origin generated variants are wired into `ProductImage` with tests; continue browser measurement. |
| Category media transfer size | IMPROVED | P1 | Derived WebP/responsive assets are delivered without deleting approved originals. |
| Dependency audit | IMPROVED | P1 | High-severity gate is green with targeted overrides; review the remaining low advisory later. |
| Local build reproducibility | IMPROVED | P1 | Build/dev call the image generator directly and generated product derivatives are ignored. |
| Product SEO rendering | IMPROVE | P2 | Improve within static architecture; do not rebuild the system as Next.js/SSR. |
| Admin Access policy | MISSING evidence | P1 external | Verify in Cloudflare dashboard; no code-side password workaround. |
| Customer auth gateway | MISSING | P2 external | Keep fail-closed until trusted gateway is deployed. |
| Browser/device QA | MISSING | P1 QA | Add or run real mobile/tablet/desktop verification before production release. |
| Legacy GitHub Pages CNAME | REMOVE/resolve externally | P1 external | Do not touch in this branch without explicit ownership approval. |
| Cart/payment | REMOVE from scope | — | Current approved commercial model is WhatsApp inquiry; do not invent checkout. |

## Audit gate

- Live repository confirmed: **YES**
- Architecture understood: **YES**
- Data sources known: **YES**
- Critical dependencies known: **YES**
- Production risks identified: **YES**
- Controlled development plan executable: **YES**

**Phase 2 baseline result:** `PASS FOR CONTROLLED, SMALL, REVERSIBLE IMPROVEMENTS`.  
External DNS/Cloudflare legacy-claim resolution and account/auth gateway deployment remain separate owner-controlled work, not reasons to replace the live repository.
