# TARGET ARCHITECTURE

**Target:** strengthened version of the existing Omran Toys system  
**Baseline:** `alaaomran2020/omran-store-live` / `main`  
**Principle:** evolve the confirmed live system; do not create a replacement.

## Target diagram

```text
External operational catalog
  Google Sheet / Apps Script
          │
          │ approved rows only
          ▼
GitHub Actions catalog selection
  live feed → commit-pinned CSV fallback
          │
          ▼
Publication guard
  active=true
  workflow_status=PUBLISHED
  qa_status=PASS
          │
          ├── public snapshot (last-known-good)
          ├── catalog/image reconciliation
          └── catalog provenance hash
          │
          ▼
React + Vite static storefront
  public routes /products /popup /vip
  same-origin approved media
  responsive image srcset
  client-side search/filter/dialog URLs
  runtime metadata + JSON-LD contract
          │
          ▼
Vite production output
  dist/public
  route shells + real 404 shell
  robots + generated sitemap
  security/cache headers
          │
          ▼
Cloudflare Pages
  project: omrantoys-live-app
  Access policy on /admin*
  custom domain: omrantoys.store
```

## Architectural decisions to preserve

### 1. Hosting and repository

- `alaaomran2020/omran-store-live` remains the sole production code repository.
- `main` remains the production branch.
- Cloudflare Pages project `omrantoys-live-app` remains the production deployment target.
- Pull requests validate; only approved non-PR `main`/scheduled/manual workflows deploy.
- The stale legacy `omran-store` GitHub Pages CNAME must be resolved as an external ownership task, not by changing the live storefront source.

### 2. Static runtime

- Keep React + Vite + TypeScript + Tailwind.
- Keep the static Pages output and same-origin public media.
- Do not introduce a VPS, custom server, Worker application runtime, Docker, MySQL, or a replacement Next.js application for incremental storefront work.
- Keep dynamic catalog retrieval optional and bounded; the storefront remains useful from its approved snapshot when external services fail.

### 3. Data and publication

- The operational Google Sheet/Apps Script remains the external source for approved catalog updates.
- The commit-pinned CSV remains the deterministic CI/deploy fallback.
- The generated snapshot remains a last-known-good browser fallback.
- The publication guard remains fail-closed and is applied before public use.
- Product IDs, commercial values, content, and original approved media are preserved.
- Future deployment artifacts should include:
  - code commit SHA;
  - selected source (`live-feed` or `repo-fallback`);
  - approved product count;
  - catalog content hash; and
  - image bundle validation result.

### 4. Media performance

- Keep original approved images as preserved source assets.
- Generate derived WebP/responsive variants during controlled builds.
- Use `srcSet`/`sizes` for local product and category images.
- Keep a same-origin processed image as the primary candidate and only use declared fallback sources; do not guess filenames from product IDs.
- Preserve alt text, aspect-ratio placeholders, lazy loading, and high-priority hero loading.

### 5. UX and conversion

- Keep Arabic RTL navigation, product discovery, filters, accessible details dialogs, and WhatsApp-first inquiry flow.
- Keep POP UP as a separate catalog and brand surface.
- Keep account/admin surfaces isolated from public product browsing.
- Do not add a cart/payment flow unless the commercial operating model is explicitly changed and documented.
- Preserve URL-addressable product query links already used in production.

### 6. SEO

- Keep static homepage metadata, robots, sitemap, canonical rules, and JSON-LD safety checks.
- Keep noindex behavior for search/filter/unknown product/admin/private paths.
- Improve product discovery and metadata within the static architecture first.
- Any future path-based product URL migration must include redirects, canonical migration, sitemap migration, and backward-compatible query links.

### 7. Security and access

- Cloudflare Access remains the edge gate for `/admin*`; in-app RBAC is defense in depth, not the outer authentication boundary.
- Customer account auth remains fail-closed until a trusted same-origin gateway exists.
- No credentials, tokens, passwords, or secrets belong in `VITE_*` production source.
- CI keeps integration, lint, typecheck, tests, build, gitleaks, Semgrep, Trivy, Checkov, and ZAP workflows.
- Patch high-severity transitive toolchain findings before release approval.

## Target quality gates

### Stability

- `node scripts/integration-audit.mjs` passes.
- `pnpm lint` passes with zero warnings/errors.
- `pnpm check` passes.
- `pnpm test` passes.
- Build succeeds from a clean checkout without tracked/generated-diff noise.

### Data

- Approved product count is non-zero.
- IDs are unique and reconciled between snapshot/CSV/build.
- All public product images are present, valid, and same-origin processed assets.
- No product, price, content, or media deletion occurs without a documented source-backed decision.

### UX and responsive behavior

- Home, catalog, search, filters, details, WhatsApp CTA, POP UP, account fail-closed state, admin Access guard, and NotFound are smoke-tested.
- Mobile, tablet, desktop, and large desktop layouts have no horizontal overflow or blocked primary CTA.
- Keyboard focus, reduced motion, dialog containment, and accessible names remain green.

### SEO

- Static robots/sitemap are valid XML/text and production-reachable.
- Canonical URLs are on `https://omrantoys.store`.
- No search/filter/admin/unknown product URLs are submitted for indexing.
- Product JSON-LD contains only source-backed properties.

### Performance

- Product/category images select an appropriate responsive variant.
- Hero is prioritized; below-fold media is lazy.
- Hashed assets are immutable; HTML revalidates.
- No new third-party request is added without a documented business purpose.

## Incremental implementation plan

1. **Build hygiene:** make nested scripts package-manager agnostic and ignore generated responsive variants.
2. **Dependency hygiene:** patch `undici` advisories with targeted overrides and rerun all gates.
3. **Media delivery:** wire product/card `srcSet` and add optimized category derivatives while preserving originals.
4. **Provenance:** add catalog count/hash reporting to CI without changing catalog content.
5. **Browser QA:** add a small smoke matrix against the built Pages output.
6. **SEO measurement:** compare indexing/unfurl behavior before considering path-based product shells.
7. **External operations:** separately verify Cloudflare Access, custom-domain binding, DNS, and retire the stale GitHub Pages claim.

## Non-goals

- No alternative repository.
- No new production backend.
- No replacement framework.
- No invented products, prices, reviews, stock, or ratings.
- No production DNS/Cloudflare changes as part of routine code improvements.
- No deletion of current product data or original approved media.
