# AGENTS.md — Omran Trading / Omran Toys Store

These are repository-wide instructions for AI coding agents (including Codex). Read `README.md`, `docs/CURRENT-ARCHITECTURE.md`, and the relevant source files before editing. Keep changes small, traceable, and scoped to the requested task.

## Business and design rules
- This is Omran Trading's Arabic-first children's toys and gifts storefront. Preserve the approved company logo without redrawing it. Use the established brand colors (#1769E0, #123B6D, #FFC83D, #C62828, #F7F9FC; text #172033) and Alexandria/Cairo typography where already defined.
- Present customer-facing pricing as **"السعر عبر واتساب"** where the business policy applies; never expose wholesale purchase/wholesale selling prices, internal margins, or protected operational data in the public UI.
- Use verifiable real product photographs and facts. Do not invent prices, stock counts, barcodes, descriptions, photos, packaging, age ratings, dimensions, offers, locations, or contact information.
- UI polish may use Unslop as a review aid if available, but it must not override brand identity, real data, accessibility, or existing functionality. No dependency or third-party skill installation without review.

## Architecture and product data
- Follow the actual repo architecture: React + TypeScript + Tailwind + Vite, static Cloudflare Pages storefront.
- The **repository's production catalog source is `public/catalog/products.csv`**, transformed at build time into the public snapshot. Do not introduce runtime Google Sheet, Apps Script, Make, or other external catalog fallbacks. Follow `README.md` and existing product publication guards.
- Egypt System may be the external operational inventory reference, but a historical September backup is **read-only lookup material**, not a live catalog source. Do not import old SQL directly into production, infer current stock or prices, or write to an Egypt System database. Match new items against a current export including item codes, barcodes and units; flag uncertain matches and duplicates for review.
- Do not modify live catalog content, product IDs, slugs, canonicals, product URLs, stock, prices, or public media references without explicit owner approval and verified input data. New product images start in the existing review pipeline; do not publish automatically.
- Keep the separate POP UP catalog separate. Do not remove or bypass product-intake security, publication guards, access checks, or existing integration gates. The isolated intake security migration remains review-only unless separately authorized.

## SEO and publication
- Use free SEO tooling only. Improve H1, real content, page titles, metadata and accessibility where justified; do not fabricate structured-data claims.
- Do not change canonical tags, robots.txt policy, sitemap URLs, redirects, indexability or product slugs without evidence, impact analysis and explicit owner approval. Respect Search Console evidence and preserve links until validated.
- **Never merge to main, publish/deploy to Cloudflare Pages, change production secrets/configuration, delete data, or run production database mutations without explicit prior approval.** A successful build is not approval to deploy.

## Workflow, commands and review
1. Inspect `git status`, current branch, relevant recent changes, `README.md`, and affected tests. Never overwrite uncommitted user work.
2. Work only in a dedicated `dev/*`, `fix/*` or `chore/*` branch. For risky catalog or infrastructure changes, propose the exact plan and rollback first.
3. Prefer targeted tests, then run appropriate existing checks: `pnpm check`, `pnpm lint`, `pnpm test`, `node scripts/integration-audit.mjs`, `node scripts/catalog-dependency-gate.mjs`, and `pnpm build` when applicable. These commands do not themselves authorize deployment. Do not run `pnpm deploy` without specific approval.
4. Verify product snapshots, referenced media, responsive mobile UI, Arabic RTL, WhatsApp flows, and absence of wholesale-price leaks when the change touches those paths.
5. Open a **Draft PR** with a concise diff, PASS/FAIL/NOT TESTED checks, any risks, affected paths, and rollback. No auto-merge, auto-publish, or claims of real-device testing without evidence.

## Priority
Protect live customer experience and correct product information. Prefer simple, proven changes over rewrites, subscriptions, extra agents or new infrastructure. If instructions conflict, follow the most restrictive safety/data-preservation rule and request owner approval before sensitive action.
