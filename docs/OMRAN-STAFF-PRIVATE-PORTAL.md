# Private staff portal for Omran operations under Digital Execution domain

Status (2026-10-24): separate Cloudflare Worker published on this hostname behind full-host Access. The public Omran and Digital Execution storefronts were not changed. Source remains in draft PR #168; signed owner login still needs interactive device verification.
Requested hostname: `staff.digital-execution.cc`.

## Product and hosting boundaries

- `digital-execution.cc` continues serving the public Digital Execution store from GitHub Pages behind Cloudflare. Do not modify its product catalogue, SEO, redirects or production build for this portal.
- `omrantoys.store` continues serving the public Omran Toys storefront. Its production project and customer pages must not change as a side effect.
- Deploy the staff UI as a **separate** Cloudflare Pages deployment/project or a dedicated Worker-protected application on `staff.digital-execution.cc`, with its own routes and release gate. The source of employee roles and Omran business data remains the authenticated Omran back end, **not** the Digital Execution public store.
- Both the custom hostname and any accessible `*.pages.dev` / preview/staging hostname must be protected by a matching Cloudflare Access application/policy. Restrict the whole host to explicitly approved employee identity emails; default deny everyone else. Do **not** leave an unprotected preview or direct origin URL.
- Don't add public navigation links to the portal, and add `X-Robots-Tag: noindex, nofollow, noarchive`; **neither obscurity nor robots headers are access controls**.
- All staff pages and supporting API routes require Cloudflare Access authentication, verified at the server edge. Sensitive API responses should be `Cache-Control: private, no-store`. Configure Cloudflare WAF/rate limiting as warranted.
- Cloudflare Access and the server must validate each request. Client-side RBAC only helps UX; never trust `role`, `actor_id`, `email` or `employee_id` sent by browser as authorization proofs.

## Personal pages

- `/admin/me` renders a separate *personal workspace* for the **authenticated identity**, using role-scoped links. The owner cannot impersonate employees by supplying a URL parameter.
- `/admin/users/:id` shows each employee's profile and permitted functions **only to active OWNERs**. The record comes from the authenticated private directory, not hardcoded human names in public JavaScript bundles.
- `/admin/users` (staff directory) and creation/role/disable actions are accessible only to active OWNERs.
- Roles: OWNER, SALES_WAREHOUSE_MANAGER, SALES_MANAGER, CASHIER and further controlled roles. New employees are added by an owner; no public self-registration.
- Existing people/roles from the approved organizational structure must be provisioned **through private staff records**, binding *one verified Cloudflare Access identity per person*. Do not store employee names or private emails in static public source or assign permissions from a name.
- An unrecognized / inactive / suspended / disabled identity must fail closed with zero permissions. Five future hires get no active accounts until the owner provisions them.

## Required secure backend before staff sign-in works

1. Serve `GET /api/admin/me` **same-origin** from the protected staff hostname. Validate the Cloudflare Access identity token/signature/audience/expiry on the server, extract verified email there, and read **only that person's** record; never accept arbitrary employee lookup from the browser. Example: `{ "employee": { "employee_id": "...", "full_name": "...", "access_email": "...", "role": "...", "status": "ACTIVE" } }`. Unknown or inactive users must be refused. Until that endpoint is implemented, non-bootstrap employees remain unable to sign in.
2. Implement owner-only `GET /api/admin/employees` and POST actions for invite, role, suspension and reactivation. Validate the same Access identity plus server-side RBAC for every read/write; reject all non-owner requests with 403 and record audit events. The current legacy cross-origin `employees` gateway must **not** supply the full directory to staff sessions; migrate owner operations to a protected same-origin endpoint before rollout.
3. Implement inventory/customer/sales data APIs with scoped authorization. **Do not** show sample transactions, invented balances or fake stock movements as live data. A CASHIER workspace is not yet a transactional checkout/POS.
4. Validate new user onboarding, invitation activation and Access policy binding. Employee accounts remain INVITED until every required step succeeds; an exported TSV is a manual approval packet, not an activated account.
5. Verify owner access, non-owner directory 403, unknown customer 403/Access denial, wrong-employee URL denial, inactive account denial, blocked public origins and blocked preview URLs, then independently approve rollout.

## Release prerequisites

- Access app and owner-only allow policy were created **before** attaching the hostname. Cloudflare API confirms DNS/proxied routing, the Worker D1 binding, and workers.dev/preview disabled; authenticated real-device login remains to be confirmed.
- Do not automatically merge this PR into `main` or deploy `omrantoys-live-app`; Omran's published storefront and Cloudflare state should remain unchanged through review.
- Collect staff Access email addresses securely during owner-driven onboarding; never embed them in git.
- The Digital Execution subdomain is an operational hostname only. The two stores' catalogs, billing, customer data and visual navigation remain isolated.
