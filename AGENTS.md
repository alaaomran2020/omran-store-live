# AGENTS.md — Omran Trading Company storefront

## Mission and scope

This is the **existing production storefront** for شركة عمران التجارية / OMRAN Toys & Gifts at https://omrantoys.store. Improve the existing product and customer experience; **do not restart, rebrand, or replace the architecture**.

- Stack: React, TypeScript, Tailwind, Vite, pnpm; Cloudflare Pages project `omrantoys-live-app`.
- Arabic-Egyptian, RTL, mobile-first; shopping assistance and product enquiries primarily via WhatsApp.
- Keep OMRAN Toys, POP UP, and admin behavior and brand boundaries separate.
- The approved original logo is immutable. Use the existing asset `public/brand/logo.png` and its approved variants; NEVER redraw, recolor, distort, replace, or generate a lookalike logo.

## Read existing authority before any task

1. `README.md` — production architecture and catalog contract.
2. `docs/DESIGN-SYSTEM-2026-09.md` — source-of-truth precedence for visuals.
3. `client/src/index.css` and `client/src/design-system.css` — actual deployed tokens and typography.
4. `docs/BRAND-GUIDELINES-EXECUTION.md` and `brand/social-templates.json` — storefront, product cards, and social execution.
5. `docs/BRAND-GUIDELINES.md` and `brand/omran-banner-brief.md` — supporting context; do not let older conflicting colors override production.
6. Relevant existing React pages/components and tests before proposing edits.

When brand documents conflict, follow approved logo -> production index.css -> design-system.css -> current execution guidance -> older historical docs. Do not invent a new palette. Key production anchors: blue `#1769E0`, navy `#123B6D`, red `#C62828`, yellow `#FFC83D`, page `#F7F9FC`, text `#172033`; Cairo is the primary Arabic UI font.

## Non-negotiable business and data safety

- The current *implemented* catalog source is `public/catalog/products.csv`, which generates a local public snapshot. Do not silently replace it with Sheets, Drive, Egypt System, Make, APIs, runtime fetches, or another source.
- A future migration to Egypt System with recoverable Google Drive backups, and a reset of published products retaining approved Ramadan categories during transition, are **separate owner decisions requiring a dedicated plan, data mapping, reconciliation, rollback and explicit approval**. Never delete or republish products as a side effect of design work.
- Do not change public product IDs, names, SKUs, SEO URLs, images, stock, pricing, descriptions, or catalog publication rules without a separately approved, traceable product-data task.
- Keep POP UP's isolated products and staff/admin permission boundaries intact. Do not add credentials, customer data, or secrets to the repository.
- Show price and availability by WhatsApp enquiry unless a specific verified commercial policy change is approved. Never expose wholesale prices in public descriptions or metadata.
- Never invent discounts, ratings, testimonials, stock, urgency, age guidance, packaging contents or product attributes.
- Real approved product photos remain accurate: no AI alteration of physical characteristics, accessories, colors, or package contents.
- Preserve SEO, canonical URLs, indexability, internal linking, accessibility (WCAG 2.2 AA target), image performance, RTL layout and existing WhatsApp flows.

## Codex workflow

1. **Inspect first:** examine source, current assets, design system, active branches/PRs and relevant tests; report confirmed facts separately from assumptions.
2. **Plan, then propose:** for creative work use `docs/CODEX-CREATIVE-CONCEPTS-2026.md`. Present five meaningfully different directions and a scored recommendation before implementing designs.
3. **Approval gate:** no production UI changes, new public campaigns, catalog mutations, merges, releases or Cloudflare deploys without explicit owner approval for that scope. A documentation-only branch/PR is acceptable for review.
4. **Small, reviewable changes:** branch from current `main`, avoid broad refactors; do not alter unrelated code.
5. **Check locally before claiming success:** use `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm build`, `node scripts/integration-audit.mjs`, and `node scripts/catalog-dependency-gate.mjs` when applicable. Record what actually ran, failures and limitations. Do not claim tests passed without evidence.
6. **Explain outcome:** changed files, screenshots/preview if produced, mobile widths checked, accessibility, SEO/performance impacts, rollback route and any blockers. A green check is not an authorization to deploy.

## Creative guardrails

- Product is the hero; clean real photography, minimal copy, strong visual hierarchy, one primary CTA, Egyptian Arabic, 320–390px-first.
- Distinct concepts must serve distinct customer needs, not be recolors of one template.
- Preserve existing component contracts such as `client/src/components/ProductCard.tsx`, `client/src/components/ProductDetailsDialog.tsx` and `client/src/pages/Home.tsx` unless a scoped change is authorized.
- Do not publish or claim to have connected external services unless the connection and effect were actually verified.
