# Omran VIP Card Program — Pilot runbook

## Before pilot

1. Approve card settings and model assumptions.
2. Complete legal and privacy review.
3. Sign 5–10 partner agreements and approve each offer.
4. Restrict the master Sheet to named internal operators and configure the manual roles. Do not distribute spreadsheet access to partners.
5. Train issuance, branch, partner and support roles separately.
6. Print a small test batch and test QR scans on representative phones.

## Employee console

Open `VIP_Employee_Console` in the master workbook. It is the starting point for internal staff and provides:

- exact serial-number lookup for card ID, membership, type, status, expiry and payment reference;
- live counts for new, active, stopped/lost cards, pending operations, staff requests, complaints, replacements and redemptions;
- direct links to the card, manual-operation, replacement, redemption, complaint and staff-enrollment registers;
- a visible warning that serial/QR lookup is manual and is not proof of validity.

Only cell `B4` is an operator search input. Search results and KPI cells are formulas and must not be overwritten. Every state-changing action must also receive a unique row in `VIP_Manual_Operations`.

## Employee operation desk

An employee who passed Cloudflare Access opens `/admin/vip-operations`. The screen prepares issuance, activation, suspension, replacement, redemption and complaint-operation rows without writing to Google Sheets. It converts EGP input to integer piasters, rejects invalid Egyptian WhatsApp numbers, rejects a discount above the invoice total, and requires payment or invoice evidence for the relevant operations.

The employee copies the generated 18-column row into the first empty row of `VIP_Manual_Operations`. Every row starts as `PENDING`; a reviewer must compare it with the card, payment, invoice and evidence before updating the related register. Preparing or copying a row is never activation by itself.

## Native Sheet controls

The workbook rejects duplicate non-empty identifiers for cards, staff requests, manual operations, redemptions, replacements and complaints. Duplicate identifiers are also highlighted in red. Money fields in manual operations, redemptions, replacements and complaints accept only zero or positive numeric piaster values. These controls are native Google Sheets validation and conditional formatting; they do not use Apps Script, an API or an access token.

The redemption `idempotency_key` is a unique manual operation reference, not a credential. Before recording a redemption, the operator must still re-read the card status, expiry, offer conditions, prior usage and budget. Native validation reduces accidental duplicates but does not provide an atomic lock across simultaneous operators.

## Experimental QR

Open `/vip/qr-test` on the development build, enter a test card serial and generate the QR locally in the browser. The QR payload contains only `OMRAN-VIP:<SERIAL>` and no customer data, phone number, API credential or access token. Download the SVG, print one sample at the intended card size, then scan it on representative employee phones and confirm that the decoded serial matches exactly.

Do not print a production batch or mark `qr_mode` approved until the physical scan test is documented. A successful scan still requires an exact serial lookup in `VIP_Employee_Console`; the QR alone never authorizes a discount.

## Required test cycle

Issue a test card; reject a duplicate serial; activate after test payment evidence; validate active, expired, suspended and lost states; apply capped percentage and fixed discounts; reject excluded items, repeat use and budget overrun; verify the manual duplicate-check procedure; replace a lost card and reject the old card; earn, expire, redeem and reverse test points; open and escalate a complaint; verify that public pages expose no customer data; verify role separation; and run storefront regression tests including POP UP separation.

## Daily controls

- Reconcile issued, paid and activated card counts.
- Reconcile redemptions to invoices and funding owner.
- Review offer budget remaining and maximum outstanding liability.
- Review red-highlighted duplicates, invoice references and manual adjustments.
- Review new complaints and partner response deadlines.
- Back up the operational Sheet according to the approved retention plan.

## Launch stop conditions

Stop activation if more than one operator may record redemptions concurrently, a duplicate redemption is possible, an offer lacks a cap, a partner is not documented, customer data is exposed, the old card remains usable after replacement, liability cannot be reconciled, or legal approval is missing.

Partner self-service, automatic points and real-time QR verification are not part of the manual pilot.

## Employee enrollment

1. Employee opens `/vip/staff-register`, enters name, Egyptian mobile, WhatsApp and requested role.
2. The page creates an `OVS-XXXXXXXX` request reference and opens the approved Omran WhatsApp conversation.
3. Employee sends the prepared message from the same WhatsApp number entered in the request.
4. Admin matches the sender number and request reference, records it as `WHATSAPP_CONFIRMED`, then approves the least-privilege role in the restricted Sheet.
5. The employee performs only the manual Sheet tasks assigned by the manager; there is no VIP web-console login.

The request reference is not an access token. Phone or WhatsApp possession alone never authorizes a discount, points change or card activation.
