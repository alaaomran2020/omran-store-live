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
- `pnpm test`: **PASS** — 54 files, 361 tests
- `pnpm build`: **PASS** — Vite production build, generated route shells and 42-URL sitemap
- Latest observed production workflow `37145353545`: **success** for `main` commit `a0d1fa53c99bffef682b324d4fae520c13f1292b`

The release is not yet a clean QA-approved candidate because two non-functional risks remain: high-severity transitive development-tool vulnerabilities reported by `pnpm audit`, and an image pipeline that generates responsive variants but does not yet consume them from product cards. The production domain also has a stale competing GitHub Pages/CNAME claim documented in the Phase 1 report; it is not changed here.

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
| Product media | `public/products/processed/` and `public/products/popup/` | product cards, gallery, dialogs, bundle guard | local asset paths and generated variants | Some large originals and generated variants; responsive variants are currently not consumed by `<img srcset>`. |
| Category media | `public/categories/` | homepage category cards and hero | source image files and hard-coded component references | Six approved PNGs are approximately 2 MB each; below-fold lazy loading limits initial cost but scroll cost is high. |
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
- Product images are lazy-loaded, but `ProductImage` currently sets `sizes` without a matching `srcSet`; generated 320/640/960 variants are therefore not selected by browsers.
- Six approved homepage category PNGs are approximately 1.9–2.2 MB each. They are lazy-loaded but remain unnecessarily expensive when scrolled into view.
- Hashed JS assets receive immutable caching through the generated `_headers`; HTML remains revalidated by Cloudflare Assets.
- Vite build has no source maps in shipped output.

## 8. Current deployment and environment

- GitHub Actions validates PRs and deploys only non-PR `main`/scheduled/manual runs.
- The workflow chooses the live Apps Script feed when its expected header is present and otherwise uses a commit-pinned raw CSV fallback.
- The workflow runs the integration audit, lint, typecheck, tests, build, image/catalog bundle guards, Cloudflare credential check, Pages deploy, and sitemap probes.
- `.env.production` contains only public runtime contact/subscriber values; secrets are expected in GitHub/Cloudflare configuration, not in browser environment files.
- Static security headers are generated into the Pages output.
- Cloudflare Access, custom-domain binding, DNS, and external Make/Google configurations cannot be completely verified from this repository alone.

## 9. Technical debt

1. Responsive image variants are generated during build but not wired into product image markup.
2. Generated responsive product files appear as untracked files after a local build; build artifacts need an explicit ignore convention.
3. High-severity `undici` advisories remain in transitive dev tooling (`jsdom` and Wrangler/Miniflare) according to `pnpm audit`.
4. Six large approved PNG category sources increase scroll-time transfer size.
5. Product SEO depends on client-side metadata mutation rather than pre-rendered product documents.
6. `App.tsx` contains preserved legacy admin aliases and duplicated explicit operational route entries; this is low-risk refactor debt, not a production blocker.
7. Production deployment can generate a new catalog snapshot from the external feed without a corresponding catalog commit; deployment provenance should eventually record the catalog hash.
8. Existing historical documents contain stale deployment dates/commit claims; the new dated reports are the current audit reference.
9. Browser-level responsive/performance regression tests are missing from CI.
10. The stale `omran-store` GitHub Pages CNAME/certificate claim remains external infrastructure debt.

## 10. Critical issues and current classification

| Area | Classification | Priority | Current decision |
|---|---|---:|---|
| Live repository/deployment identity | KEEP | P0 | Confirmed in Phase 1; do not switch repositories. |
| Product publication guard and fallback snapshot | KEEP | P0 | Preserve; no product deletion or replacement. |
| Cloudflare Pages deployment gate | KEEP | P0 | Preserve required checks and main-only production deployment. |
| Catalog runtime resilience | IMPROVE | P1 | Keep live feed + snapshot; make failure/age/source visible to operations. |
| Product responsive media | IMPROVE | P1 | Consume generated same-origin variants and add regression coverage. |
| Category media transfer size | IMPROVE | P1 | Add derived WebP/responsive assets without deleting approved originals. |
| Dependency audit | IMPROVE | P1 | Patch transitive `undici` versions, rerun full gates. |
| Local build reproducibility | IMPROVE | P1 | Avoid nested `pnpm` calls inside scripts so Corepack invocation works. |
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
