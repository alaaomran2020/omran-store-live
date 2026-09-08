# Plugin Library Gap Analysis — 2026-09-08

Scope: current `omran-store-live` storefront only. The WordPress/WooCommerce library is used as a functional reference. No WordPress migration and no direct plugin installation.

## Current technical baseline

- Runtime: React 19 + Vite 7 + TypeScript + Tailwind CSS 4.
- Deployment: Cloudflare Pages via Wrangler.
- Product browsing: `/products` and `/popup` share the same product feed but are filtered by catalog.
- Conversion: WhatsApp inquiry is the primary product CTA.
- Analytics: first-party event persistence through the Make gateway plus optional Umami.

## Functional mapping

| Reference capability | Current state | Gap | Priority |
|---|---|---|---|
| YITH Product Gallery / Image Zoom | `ProductMediaGallery` already supports gallery thumbnails, video and basic click zoom | No fullscreen/lightbox, pan/gesture zoom, image count navigation, or robust mobile zoom | P1 |
| WooCommerce Product Options / Extra Product Options | Verified colors are extracted from description and selectable | Options are not represented as structured product data; no generic option groups | P1 |
| Product Tabs / ACF-style specifications | `ProductSpecifications` already renders dimensions, package dimensions, weight, material, pieces, power, assembly, box contents and instructions | Specs depend on populated catalog data; no tabbed/accordion hierarchy or field-level completeness indicator | P1 |
| FacetWP / WP Grid Builder | Smart search, category filter and age filter already exist | No price/brand/tags/availability filters, sort modes, active-filter summary, result-count UX, or advanced faceting | P2 |
| WooCommerce Cart All in One | `client/src/lib/cart.ts` has localStorage add/increment primitives and tests | Cart primitive is not wired into storefront UI; no drawer, quantity controls, remove/clear, cart badge or WhatsApp order summary | P1 if cart flow is approved |
| YITH Wishlist / Compare | Not active in current storefront | No wishlist or compare flow | P3 |
| WP Rocket / FlyingPress / Perfmatters / Asset CleanUp | Native lazy loading and async image decoding exist | No responsive `srcset` generation in `ProductImage`, no explicit image width/height reservation, no route-level performance budget, no asset audit | P1 |
| Rank Math / Yoast / Schema Pro | Static title, description, canonical and OpenGraph metadata exist in `client/index.html` | No Product JSON-LD, no dynamic product metadata per product URL state, no BreadcrumbList schema, canonical is static homepage URL | P1 |
| MonsterInsights User Journey | Product view, search, filters and WhatsApp click tracking exist | No cart/add/remove/quantity events, no image-gallery interaction events, no filter-clear/sort events | P2 |
| Stock Manager / Supplier Management / Import-Export | Catalog pipeline and automation assets exist in repo | Storefront does not expose an operational stock/supplier UX; must remain separate from customer-facing catalog | P2/P3 |

## Confirmed existing strengths

1. Product media is already separated into a reusable `ProductMediaGallery` component.
2. The product detail dialog already exposes verified age data, structured specifications, selected colors and WhatsApp conversion.
3. Search and filters already preserve state in URL query parameters.
4. POP UP is filtered separately from the toys catalog in the storefront logic.
5. WhatsApp conversion tracking is fail-safe and does not block customer navigation.
6. A local cart primitive already exists, so a future cart drawer can be built without introducing a backend.

## Highest-value gaps

### P1-A — Product media upgrade

Target files:
- `client/src/components/ProductMediaGallery.tsx`
- `client/src/components/ProductImage.tsx`

Safe first increment:
- Add image position indicator (`1 / N`).
- Add previous/next navigation.
- Add fullscreen lightbox mode using existing image candidates.
- Preserve current fallback chain and never infer images from SKU.
- Add interaction analytics without blocking rendering.

### P1-B — Structured product options/specifications

Target files:
- `shared/products.ts`
- `client/src/lib/productsClient.ts`
- `client/src/components/ProductDetailsDialog.tsx`
- `client/src/components/ProductSpecifications.tsx`

Safe first increment:
- Keep existing color extraction for compatibility.
- Introduce optional structured `options` data only when present.
- Render options generically without changing products that lack those fields.
- Keep POP UP and Omran Toys catalog classification separate.

### P1-C — Image performance and stability

Target files:
- `client/src/components/ProductImage.tsx`
- product media assets / build pipeline if needed

Safe first increment:
- Reserve intrinsic image dimensions or aspect-ratio consistently to reduce CLS.
- Audit large local images and generate responsive derivatives only for repository-owned media.
- Keep remote/Drive fallback behavior unchanged until verified independently.

### P1-D — SEO/schema

Target files:
- `client/index.html`
- new client-side metadata/schema helper if required

Safe first increment:
- Add Organization/WebSite JSON-LD globally.
- Add Product JSON-LD only when a product detail is open and data is valid.
- Do not emit price/availability fields unless catalog data is verified.
- Correct route canonical handling rather than forcing every route to `/`.

### P1-E — Cart drawer, only if approved as a current sales flow

Target files:
- `client/src/lib/cart.ts`
- new `client/src/components/CartDrawer.tsx`
- `client/src/components/ProductCard.tsx`
- `client/src/components/ProductDetailsDialog.tsx`

Current evidence: cart storage exists but has no storefront consumer. Recommended implementation is local-only, no new backend:
- add to cart;
- cart badge;
- increment/decrement/remove;
- clear cart;
- generate one WhatsApp order/inquiry message containing SKUs and quantities.

This should not be enabled until the current WhatsApp-only vs cart-assisted conversion policy is confirmed.

## Deferred / low-value references

Do not port WordPress page builders, LMS, booking systems, memberships/subscriptions, WordPress security plugins, WordPress backup/migration plugins or Elementor/Bricks/Oxygen-specific addons into the current storefront. They do not match the current architecture.

## Execution order

1. Product media/lightbox + image stability.
2. SEO/schema baseline.
3. Structured options/specification completeness.
4. Search/filter UX expansion.
5. Cart drawer only after conversion-flow approval.
6. Wishlist/compare later, after measured demand.

## Non-breaking constraints

- No WordPress migration.
- No direct use of plugin binaries or activators.
- No catalog merge between Omran Toys and POP UP.
- No backend/database change for the first increments.
- Preserve WhatsApp CTA and analytics as fallback conversion paths.
- Run `pnpm lint && pnpm check && pnpm test && pnpm build` before any merge.
