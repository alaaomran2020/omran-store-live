# Live store gap audit — 2026-09-11

Scope: `alaaomran2020/omran-store-live` at `22c869e24ca47f6008023d33c2b66d76d7d384cf` (`main`). The implementation stack found in the live repository is Vite + React 19 + TypeScript + Tailwind CSS 4. No framework migration is part of this work.

## UI inventory

| Surface | Active entry | Status before fixes |
| --- | --- | --- |
| Storefront | `/` → `Storefront` → `Products` | Active; shared announcement, brand header, POP UP promo and catalog |
| Toys catalog | `/products` | Active; search, filters, product cards and details dialog |
| POP UP catalog | `/popup` | Active and catalog-scoped; local balloon image snapshot exists |
| Videos | `/videos` | Active |
| Rewards and VIP | `/rewards`, `/vip`, terms and privacy | Active |
| Admin | `/admin*` | Active; denies by default and checks Cloudflare Access identity |
| Cart / “طلبك” | Global `CartDrawer`, product cards and details | Active but conflicts with the approved WhatsApp-only conversion path |
| Saved products / compare | Global `SavedProductsPanel` | Active; compare is reachable through the shared saved-products panel |
| Legacy page/template UI | `Home`, `Map`, `AIChatBox`, `ManusDialog`, `DashboardLayoutSkeleton`, `SocialSettings` | No active route or import found; candidate dead code |

## Feature inventory

| Feature | Classification | Evidence / decision |
| --- | --- | --- |
| WhatsApp product inquiry | ACTIVE | Product card and details CTA include product context |
| Product details/media/zoom/video | ACTIVE | `ProductDetailsDialog` + `ProductMediaGallery` |
| Product specifications | ACTIVE | Verified fields only; null values are omitted |
| Smart Arabic/English search | ACTIVE | Normalization, synonyms, bounded edit distance and “هل تقصد” exist |
| Brand/tag/availability/age filters | ACTIVE | Client-side and URL-synchronized |
| POP UP separation | ACTIVE | `filterProductsByCatalog` plus dedicated snapshot/tests |
| Cart and “طلبك” | REMOVE | Explicitly rejected in the current product direction |
| Compare | REMOVE | Explicitly rejected; implemented inside `SavedProductsPanel` |
| Wishlist floating panel | REMOVE | Shares the compare surface and adds an unrequested global overlay |
| Optional Umami | ACTIVE/OPTIONAL | Injected only when both public configuration values exist |
| Make catalog/analytics gateway | ACTIVE EXISTING INTEGRATION | Existing public integration; no new API will be introduced |
| Old VPS/server comments and unused template modules | LEGACY/DEAD | Remove only after reference checks |

## Data flow map

1. `Products` calls `fetchProducts()` through React Query.
2. `fetchProducts()` reads the existing Make catalog gateway and enforces `active + PUBLISHED + PASS`.
3. Missing/failed live data falls back to bundled approved toys and POP UP snapshots.
4. POP UP is filtered independently and its verified local images override unstable remote images.
5. Search and filters operate only on the already approved, catalog-scoped product list.
6. Product cards/details build a WhatsApp URL from product name, SKU, category and product permalink.
7. Existing analytics sends optional Umami events and first-party events to the already configured Make gateway; failures never block conversion.
8. Admin pages require a Cloudflare Access identity and fail closed in the client; edge policy remains the actual protection boundary.

## Gap analysis

1. Cart, “طلبك”, add-to-cart CTAs and cart analytics are still shipped globally.
2. Compare remains shipped through `SavedProductsPanel`; the same global surface also adds an unnecessary wishlist overlay.
3. Product CTAs use price-oriented copy instead of the approved concise availability/quantity inquiry copy.
4. Product detail dialog duplicates conversion choices and has no related-products section.
5. Product-view analytics omits SKU/category in one call; category page-view tracking is incomplete.
6. Required search spellings are mostly supported but not covered as a single regression matrix.
7. Header mobile sizing needs a stricter logo/name/nav layout at 320–390 px.
8. The announcement pause control conflicts with the request to remove buttons from the moving bar.
9. Several proven-unreferenced template files add maintenance/bundle/security noise; one contains unused public API-key handling.
10. A hard-coded product-intake webhook is present in client code. It cannot be made secret in a static SPA; changing the integration without an approved existing server endpoint could break operations, so this remains an external architecture risk unless an existing protected gateway action is confirmed.
11. Sitemap coverage is incomplete for public POP UP/video/rewards/VIP policy routes.
12. Baseline lint and typecheck passed; the final verification result is recorded below.

## Fix plan

1. Remove the global cart/saved-products surfaces, product add-to-cart/wishlist controls, their isolated modules/tests and obsolete analytics events.
2. Make WhatsApp the single product conversion CTA with consistent Egyptian Arabic and complete product context.
3. Tighten header and announcement layouts for 320–390 px and remove the announcement control button.
4. Preserve POP UP catalog isolation and local image fallback; add regression coverage for broken-image prevention and catalog separation.
5. Extend product detail presentation with available verified fields and related products without inventing data.
6. Complete search/analytics regression coverage and category/product event context.
7. Remove only reference-proven dead template code and stale VPS/server comments.
8. Improve sitemap/security headers and replace avoidable unsafe QR HTML rendering.
9. Run lint, TypeScript, tests, production build and responsive smoke QA; commit/push/open a PR only after passing checks. Do not merge or deploy.

## Implemented outcome

- Removed cart, “طلبك”, wishlist and compare UI, state modules and analytics events. WhatsApp is now the only product conversion path.
- Standardized product WhatsApp messages with product name, SKU/fallback ID, category and product URL.
- Kept POP UP catalog filtering independent and retained its five verified local WebP product images. Images containing baked-in price/cart UI remain unused.
- Improved the 320–390 px header structure, retained the original logo on all customer-facing pages, and removed the announcement-bar control.
- Added related products, partial known-age display and component-field aliases without inventing absent product data.
- Added regression coverage for the required Arabic/English search spellings, catalog separation, forbidden cart/compare copy and responsive header structure.
- Completed public-route metadata/sitemap coverage, replaced unsafe inline SVG rendering, added a restrictive permissions policy and lazy-loaded page routes.
- Removed only files with no active import or route after reference tracing. The removed files are classified as dead template UI, obsolete cart/saved-products modules, duplicate social constants/feed code, or unused database/template configuration.
- Updated build dependencies and overrides. Final dependency audit: 0 critical, 0 high, 0 moderate and 1 low advisory in build-time `@babel/core`; no patched release is currently available to select.

## Final verification

| Check | Result |
| --- | --- |
| `pnpm lint` | PASS (0 errors) |
| `pnpm check` | PASS |
| `pnpm test` | PASS — 18 files, 85 tests |
| `pnpm build` | PASS — Vite 7 production build |
| Dependency audit (`--audit-level=high`) | PASS |
| Static route/media smoke | PASS — storefront, products, POP UP, videos, rewards, VIP routes, sitemap, robots, logo and five local POP UP images |
| Responsive DOM regression | PASS — 320, 375, 390, 768 and 1280 px |

## External decisions and residual risk

1. The existing product-intake Make webhook is still a public static-client integration. It cannot become a secret inside this SPA; changing it safely requires confirmation of an already existing protected gateway/action. No new backend, API or secret was introduced.
2. Cloudflare Access remains the security boundary for admin routes. Its live policy and production console/network behavior must be re-verified in the deployment environment after an approved merge.
3. Products with missing age, dimensions, components, additional images or video intentionally omit those fields until verified catalog data is supplied.
4. Production deployment and merge remain intentionally pending review; this change set does not invoke the deploy script.
