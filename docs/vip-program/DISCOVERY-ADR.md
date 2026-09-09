# Omran VIP Card Program — Discovery and ADR 001

Status: Foundation implemented for a disabled pilot. No production activation.

## Evidence from the current repository

- The live storefront is Vite 7, React 19, TypeScript and Tailwind CSS on Cloudflare Pages.
- Production intentionally has no custom Backend, API, VPS, MySQL, Docker or Worker runtime.
- Google Sheet `قاعدة بيانات عمران تويز الرئيسية` is the operational source of truth.
- The existing Google Apps Script already receives VIP subscriber records, uses `LockService`, writes to the master Sheet and exposes the approved catalog feed.
- `/admin*` is protected by Cloudflare Access and validates identity through `/cdn-cgi/access/get-identity`.
- The current rewards code is a fail-closed calculation prototype only. It is disabled and has no persistent ledger.
- The current `VipSignup` is a marketing subscriber form. It is not a paid membership, card, identity check or redemption system.

## Gaps

The repository has no card registry, card lifecycle, partner registry, offer approval workflow, atomic redemption store, complaints workflow, role-level authorization, points batches, financial liability reporting or secure verification token.

## Security finding

Cloudflare Access protects the static `/admin*` page, but it does not protect the separate `script.google.com` or Make webhook origins. A secret embedded in browser JavaScript is extractable, and a caller can invoke those endpoints without passing through the storefront's Access policy. The current Product Intake pattern is therefore not sufficient for financial redemptions or points.

## Decision

Reuse the current Google Sheet and the existing Google Apps Script project for the pilot, but keep financial writes inside a Sheet-bound Apps Script menu/sidebar that only approved Google accounts with explicit spreadsheet access can open. The storefront admin may link to that operational workspace; it must not hold a shared write secret. Keep the customer program page static and read-only until an authenticated verification endpoint with rate limiting is approved.

`Approved Google account -> restricted Sheet/Apps Script UI -> ScriptLock -> validated append-only ledgers -> Google Sheet`

## Implemented foundation — 2026-09-09

- Reused the existing `المشتركون`, `الموظفون`, `حسابات النقاط`, `حركات النقاط` and `سجل التدقيق` sheets.
- Created only the missing VIP membership, card, partner, offer, redemption, purchase, reward, complaint, replacement and settings sheets.
- Seeded Omran VIP and Omran Silver as `DRAFT` with no price or validity values.
- Left `financial_activation`, `points_enabled` and `public_verification_enabled` set to `false` and `DRAFT`.
- Added a locked Apps Script operations module; it is repository code only and has not been copied or deployed to the bound Apps Script project.

## Why this is the first safe scope

- It respects the current no-new-backend constraint.
- It reuses the master operational database and Google account access control for trusted Omran employees.
- `LockService` can serialize the small pilot's redemption writes.
- It is adequate for 5–10 partners and a limited pilot, but it is not positioned as a permanent high-volume transaction platform.

## Required controls

- Store money as integer piasters and percentages as basis points.
- Use immutable unique event IDs and idempotency keys for every redemption and ledger entry.
- Execute eligibility check, usage check, budget check and append while holding one script lock.
- Store only a random verification token hash; never put a phone number or sequential membership identifier in the QR.
- Mask customer data in public verification responses.
- Separate public program data from private customer, complaint and ledger sheets.
- Keep all commercial settings in `DRAFT` until approved.
- Do not treat Cloudflare protection of the static page as authentication for a separate webhook origin.

## Upgrade triggers

Revisit the architecture before partner self-service or public verification. An authenticated same-origin transaction proxy or equivalent approved service is required for partner writes, request throttling and secure staff identity propagation. Also revisit it if the pilot requires offline redemption, multiple simultaneous high-volume branches, a payment gateway, sub-second availability guarantees, immutable regulatory-grade logs, or integrations that Google Sheets cannot reconcile safely.

## Production change control

This branch must not merge or deploy before commercial approval, privacy review, partner agreement approval, printed QR testing and pilot QA. The current production workflow deploys every push to `main`; therefore a merge is itself a production-release action.
