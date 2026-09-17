# PR 5 - Mobile + OTP authentication

## Scope

PR 5 adds the secure mobile/OTP authentication contract on top of the existing customer and employee models. It does not wire real analytics, replace the Admin data sources, or convert the full Admin UI to SQL.

## Implemented

- PostgreSQL persistence contract for OTP challenges, auth sessions and rate-limit buckets.
- OTP challenges store only `SHA-256(code:challengeId)`.
- Session persistence stores only `SHA-256(token:sessionId)`.
- Customer and employee identity domains remain separate.
- Employee OTP requests require an existing employee record and reject suspended/disabled accounts.
- New customer identity can be created only after a successful mobile verification.
- Rate limits remain 5 requests/mobile and 20 requests/IP per 15 minutes.
- OTP remains 6 digits, 5-minute TTL, 45-second resend cooldown and 5 wrong attempts.
- Sessions are represented by HttpOnly, Secure, SameSite=Lax cookies; no auth token is stored in browser storage.

## Delivery boundary

The repository intentionally does not contain an SMS/WhatsApp provider secret. `OtpDelivery` is a server-side interface. A production runtime must supply a trusted delivery adapter; when no adapter is configured, login must remain fail-closed and the client already displays the existing provider-not-configured state.

No OTP is ever returned to the browser, logged, included in audit metadata, or stored in plaintext.

## Cloudflare Access

Cloudflare Access remains the external mandatory guard for `/admin*`. Employee OTP in this PR is an identity/second-factor contract, not a replacement for Access.

## Explicitly out of scope

- Real analytics/audit persistence: PR 6.
- Full SQL-backed Admin reads/writes and removal of TSV/Sheets fallbacks: PR 7.
- Any paid SMS/WhatsApp provider or API key.
