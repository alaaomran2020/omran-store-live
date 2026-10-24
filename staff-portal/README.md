# OMRAN private staff portal — deployed 2026-10-24

This **private Cloudflare Worker** is intentionally separate from both public storefronts.

## Current deployed configuration

- Custom host: **https://staff.digital-execution.cc** (Cloudflare-proxied custom domain, DNS AAAA `100::`).
- Worker service: `omran-private-staff-portal`.
- Cloudflare Access app: `OMRAN Private Staff Portal` protects the **entire** hostname (not a single path), with a default-deny allow policy initially containing only the previously-approved store administrator identity.
- Worker `workers.dev` and preview URLs: **disabled**.
- D1: `omran-staff-private`, binding `STAFF_DB`, isolated from the Omran and Digital Execution production databases.
- Access JWT: validate the *signed* `Cf-Access-Jwt-Assertion` against the organization JWKS using WebCrypto RS256, and require matching issuer, Access app audience, expiry, nbf and verified email.
- Identity: server-side D1 account matched against signed email; rejects everyone without an `ACTIVE` employee record.
- Owner-only: `GET/POST /api/admin/employees`, employee profile pages, role/status invitations. Changes also require same-origin JSON (CSRF mitigation) and parameterized queries.
- All responses: `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, `nosniff`, `frame-ancestors 'none'`.
- No link to the staff portal from any customer-facing storefront. No customer or POS/sales/payment data is loaded into this app.

## Employee provisioning state

- Existing single previously authorized administrative email in Access is linked to the **علاء عمران** owner record, with D1 status `ACTIVE`.
- Owner records `عبد الرحمن عمران` and `محمد عمران`, and staff `سمسم` (sales + warehouse), `حسن` (sales), `سلمى` (cashier) are **INVITED** without emails, not capable of signing in.
- The additional five future hires have not been provisioned.
- Once the owner has securely collected the unique verified email for each person: set their email from owner-only UI, include that exact address in Access app allow policy, then activate the matching D1 record after verifying the person. No registration from customer devices.
- **Do not invent emails** or grant Access to broad domains/everyone. Also don't confuse D1 account activation with Access eligibility; both checks are mandatory.

## Known limitations / test status

- Cloudflare API reads confirm domain routing, Access app/policy, D1 binding and disabled preview origins. Authenticated Android/browser session test and anonymous edge HTTP redirect test could not be completed using available non-browser tool connectivity.
- All business-critical sales, inventory writes, receipts and cashier operations are **not yet integrated**. Personal workspaces are currently role-specific launch surfaces only. Do not interpret these as a functioning POS or full Omran backend integration.
- No changes were made to the existing `digital-execution.cc` storefront hosted on GitHub Pages or `omrantoys.store`.
- Source change is kept in review-only PR #168; production storefront deployments remain governed by their existing approval gate.
