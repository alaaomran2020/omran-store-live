# Omran VIP Card Program — Discovery and ADR 001

Status: Foundation implemented for a disabled pilot. No production activation.

## Evidence from the current repository

- The live storefront is Vite 7, React 19, TypeScript and Tailwind CSS on Cloudflare Pages.
- Production intentionally has no custom Backend, API, VPS, MySQL, Docker or Worker runtime.
- Google Sheet `قاعدة بيانات عمران تويز الرئيسية` is the operational source of truth.
- An older Apps Script receives marketing subscriber records, but the owner has explicitly excluded Apps Script from the paid-card program.
- `/admin*` is protected by Cloudflare Access and validates identity through `/cdn-cgi/access/get-identity`.
- The current rewards code is a fail-closed calculation prototype only. It is disabled and has no persistent ledger.
- The current `VipSignup` is a marketing subscriber form. It is not a paid membership, card, identity check or redemption system.

## Gaps

The repository originally had no card registry, card lifecycle, partner registry, offer approval workflow, complaints workflow, points batches or financial liability reporting. The Sheet foundation now covers those registers, but the approved manual architecture cannot provide atomic redemption or real-time public verification.

## Security finding

The owner explicitly rejected a VIP API, Apps Script and access-token workflow. A static browser cannot securely write to a shared card database or guarantee atomic redemption. Therefore the pilot must stay manual and internal; no customer-facing QR may claim real-time validity.

## Decision

Reuse the current restricted Google Sheet as the manual operations workspace. Staff registration is a static `/vip/staff-register` page that prepares a WhatsApp message; the admin matches the sender number and enters the request manually. Issuance, activation, redemption, replacement and complaints are recorded in the dedicated VIP sheets and `VIP_Manual_Operations`. The public program page stays static and read-only.

`Employee WhatsApp request -> admin review -> restricted Google Sheet -> manual operation record -> audit/reconciliation`

## Implemented foundation — 2026-09-09

- Reused the existing `المشتركون`, `الموظفون`, `حسابات النقاط`, `حركات النقاط` and `سجل التدقيق` sheets.
- Created only the missing VIP membership, card, partner, offer, redemption, purchase, reward, complaint, replacement and settings sheets.
- Seeded Omran VIP and Omran Silver as `DRAFT` with no price or validity values.
- Left `financial_activation`, `points_enabled` and `public_verification_enabled` set to `false` and `DRAFT`.
- Added `VIP_Manual_Operations` and recorded the owner-approved `MANUAL_SHEETS_WHATSAPP` mode.
- Added `VIP_Employee_Console` with internal serial lookup, operating counters and direct links to the controlled registers.
- Removed the VIP Apps Script console and operations modules from the development branch.
- Added a static WhatsApp employee-registration page with no API, database write or access token.
- Added a client-side `/vip/qr-test` tool that creates a serial-only SVG locally with no remote request; production QR remains blocked pending a printed scan test.
- Added protected `/admin/vip-operations` manual row preparation for issuance, activation, suspension, replacement, redemption and complaint intake; it performs no remote write and every operation starts `PENDING`.
- Added `VIP_Card_Payments` and `VIP_Dashboard` so collected revenue, refunds, Omran-funded discounts, partner-funded discounts and remaining Omran offer liability are reported separately.

## Why this is the first safe scope

- It respects the current no-new-backend constraint.
- It reuses the master operational database and Google account access control for trusted Omran employees.
- It has no additional runtime or paid service.
- It is adequate only for a low-volume supervised test and is not safe for simultaneous partner self-service.

## Required controls

- Store money as integer piasters and percentages as basis points.
- Assign a unique operation ID to every manual action and reconcile it against the invoice or evidence link.
- Before recording a redemption, one authorized operator must re-read the latest card, offer and usage rows; simultaneous partner writes remain prohibited.
- The pilot QR may contain only a non-sensitive manual reference/serial and must be labelled as requiring staff lookup. It is not proof of validity.
- Never place a phone number or customer data in the QR or public page.
- Separate public program data from private customer, complaint and ledger sheets.
- Keep all commercial settings in `DRAFT` until approved.
- Do not treat Cloudflare protection of the static page as authentication for a separate webhook origin.

## Upgrade triggers

Revisit the owner's no-API decision before partner self-service, automatic QR verification, concurrent redemption, automatic points or card sales. Those capabilities require an authenticated transactional service. Also revisit it if the pilot requires multiple simultaneous branches, a payment gateway, immutable regulatory-grade logs or integrations that manual Sheets cannot reconcile safely.

## Production change control

This branch must not merge or deploy before commercial approval, privacy review, partner agreement approval, printed QR testing and pilot QA. The current production workflow deploys every push to `main`; therefore a merge is itself a production-release action.
