# Omran VIP Card Program — Pilot runbook

## Before pilot

1. Approve card settings and model assumptions.
2. Complete legal and privacy review.
3. Sign 5–10 partner agreements and approve each offer.
4. Configure test-only sheets, approved Google-account access, roles and secure tokens. Do not distribute spreadsheet access to partners.
5. Train issuance, branch, partner and support roles separately.
6. Print a small test batch and test QR scans on representative phones.

## Required test cycle

Issue a test card; reject a duplicate serial; activate after test payment evidence; validate active, expired, suspended and lost states; apply capped percentage and fixed discounts; reject excluded items, repeat use and budget overrun; submit simultaneous identical redemptions; replace a lost card and reject the old card; earn, expire, redeem and reverse test points; open and escalate a complaint; verify masked public output; verify role denials; and run storefront regression tests including POP UP separation.

## Daily controls

- Reconcile issued, paid and activated card counts.
- Reconcile redemptions to invoices and funding owner.
- Review offer budget remaining and maximum outstanding liability.
- Review duplicate/idempotency alerts and manual adjustments.
- Review new complaints and partner response deadlines.
- Back up the operational Sheet according to the approved retention plan.

## Launch stop conditions

Stop activation if a duplicate redemption is possible, an offer lacks a cap, a partner is not documented, customer data is exposed, the old card remains usable after replacement, liability cannot be reconciled, or legal approval is missing.

Partner self-service is not part of the first internal test. It stays blocked until requests can be authenticated at the transaction endpoint rather than only at the static storefront page.
