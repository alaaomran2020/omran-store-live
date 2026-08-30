# Platform Audit & Edge/VPS Migration — omran-store-live

Date: 2026-08-30 · Branch: `arena/01a054f4-omran-store-live` · Baseline commit: `5d7a13e`

Scope of this document: what the migration brief asked for, what this repository
actually contains, what I changed, and the exact commands to run. Every claim is
backed by a command shown in §6 that was executed against this checkout.

---

## 1. Headline: the brief's premises do not match this repository

The brief was written for a **Next.js-on-Vercel storefront with Meta webhook
handlers**. `alaaomran2020/omran-store-live` is none of those things. It is a
**Vite 7 + React 19 + Express 4 + tRPC v11 + Drizzle/MySQL** app generated from
the Manus `web-db-user` template (`template.json`, `vite-plugin-manus-runtime`).

| Brief directive | Reality in this repo | Action taken |
|---|---|---|
| Delete `vercel.json`, `.vercel/`, `.vercelignore` | **None exist.** No such files at any path. | Nothing to delete. Added `.dockerignore` entries so a stray one can never enter an image. |
| Remove `@vercel/*` from `package.json` | **None declared.** Analytics here is Umami via `%VITE_ANALYTICS_ENDPOINT%`. | Removed the real platform leak instead (§2.1). `@vercel/postgres` appears in `pnpm-lock.yaml` only as drizzle-orm's *optional peer* metadata — never installed, nothing to purge. |
| "Refactor API handlers from Vercel Serverless to Web Standard `fetch`" | The only HTTP handlers are Express middlewares (`server/_core/app.ts`) + a tRPC express adapter. There are no `api/*.js` Vercel functions. | Not a Vercel problem to fix. See §3 for why a Workers port is a rewrite, not a refactor. |
| `wrangler.toml` with `[[d1_databases]] omran-toys-db` | No `wrangler.*` here. **The brief's snippet is copied verbatim from the sibling repo `alaaomran2020/omrantoys-store`**, which already has that exact D1 binding plus a validated 11-table D1 schema. | Deliberately did **not** add a `wrangler.toml`/D1 binding here: this app's DB layer is MySQL (`drizzle-orm/mysql2`), not D1/SQLite. A placeholder `database_id = "YOUR_D1_DATABASE_ID"` would ship a config that cannot deploy. |
| Idempotency via `001_add_idempotency_key.sql`; "handle duplicate Webhooks / Meta Live events" | **No webhook or Meta Live code exists anywhere in this repo** (`webhook`, `hub.challenge`, `META_VERIFY_TOKEN`: 0 hits). `001_add_idempotency_key.sql` exists in **none** of the 8 repos on the account. The only `idempot*` hit is a doc-comment in `server/_core/heartbeat.ts:185`. | Nothing to guard yet. Options + a ready design in §4. |
| Fast 200 / `hub.challenge` handshake / `ctx.waitUntil()` | No callback endpoint is served today, so Meta could not reach this app at all. | Blocked on §4 decision. Prerequisite fixed: §2.3 makes the server bind exactly `$PORT` (the old auto-increment would have silently drifted off the tunnel's `localhost:3000`). |
| Lean multi-stage `node:20-alpine` Dockerfile, non-root, devDeps stripped | No Dockerfile existed — **and the app could not have run in one**: the prod bundle statically imported `vite`/`@vitejs/plugin-react`/`@tailwindcss/vite`/`@builder.io/vite-plugin-jsx-loc`, so any image that stripped devDependencies died at boot with `ERR_MODULE_NOT_FOUND`. | Fixed properly (§2.3) + shipped `Dockerfile`, `.dockerignore`, `docker-compose.yml`. |
| `docker-compose.yml` with 256M / 0.50 CPU caps, log rotation | Did not exist. | Shipped — **with one correction to the spec**: `--optimize-for-size` is *rejected* inside `NODE_OPTIONS`, so it is passed as a CLI flag instead (§2.4). |
| Cloudflare Tunnel to `localhost:3000`, no public ports | Not present. | Shipped `cloudflared` as a sibling container on an internal network — no published ports at all (§5). |
| Secrets: `STORE_API_KEY`, `STORE_API_SECRET`, `META_VERIFY_TOKEN`, `INSTAGRAM_ACCESS_TOKEN` | **Zero references.** `.env.example` now documents the 12 variables the code really reads, and names these four as inert. `INSTAGRAM_ACCESS_TOKEN` was intentionally *removed* by the owner (see `todo.md`: the feed was cut over to static public links, and Meta access-token dependence was cancelled). | Documented, not fabricated. |

**Where the described work actually lives:** `vercel.json` + `@vercel/analytics@^2.0.1` are in
**`alaaomran2020/omran-store`** (Next.js 16 portfolio, already wired for Cloudflare via
`@opennextjs/cloudflare` + `wrangler.jsonc` + `open-next.config.ts` — i.e. the Vercel
files there are migration leftovers). The `omran-toys-db` D1 database, `wrangler.toml`,
`[assets]` SPA config and the "Live" surface (`src/components/common/LiveSalesNotification.jsx`)
are in **`alaaomran2020/omrantoys-store`**. Note that component renders a **hard-coded
array of 5 fake customers** — it is not driven by Meta Live events.

This Arena session is bound to `omran-store-live` and may only push to
`arena/01a054f4-omran-store-live`, so changes to those two repos need their own session/checkout.

---

## 2. Changes made in this repository

### 2.1 Production payload: 368 kB → 0.48 kB `index.html` (−99.87%)

`vite-plugin-manus-runtime` inlines its entire 367 kB previewer bundle (plus 34 kB CSS)
into `index.html` **on every build**, including production — it self-tags as host tooling
(`window.__MANUS_HOST_DEV__ = false`). `@builder.io/vite-plugin-jsx-loc` similarly stamped
`data-jsx-loc` source coordinates onto every element in production builds.

`vite.config.ts` now wraps both in `devOnly()` (`apply: "serve"`), and `publicDir` is
`false` for builds so the dev-only `client/public/__manus__/debug-collector.js` is no
longer copied into `dist/public`.

| Measured | before | after |
|---|---|---|
| `dist/public/index.html` | 368.19 kB (gzip 105.80) | **0.48 kB** (gzip 0.34) |
| `dist/public/assets/*.js` | 432.44 kB | 425.97 kB |
| `dist/index.js` (server) | 27.8 kB | 23.6 kB |
| dev deps required at runtime | yes (fatal otherwise) | **no** |

The HTML document is what blocks first paint; it was ~770× the size of the app's own
markup for a DOM inspector nobody uses in production.

### 2.2 Dependency split — runtime install 359 MB → 62 MB (−82.7%), 33 → 10 packages

`dependencies` previously mixed the client UI kit with the server runtime, so a
production install pulled React, 27 Radix packages, recharts, etc. into the deploy
artifact. `dependencies` is now exactly the set `dist/index.js` resolves:
`@trpc/server, axios, cookie, dotenv, drizzle-orm, express, jose, mysql2, superjson, zod`
(`mysql2` stays because `drizzle-orm/mysql2` loads it dynamically). Everything else moved
to `devDependencies`.

Also removed outright — **zero references anywhere** in the repo (grep-verified, including
CSS and configs): `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (storage presigns
through the Forge API, not the SDK), `framer-motion`, `tailwindcss-animate` (CSS uses
`tw-animate-css`), and the stray devDependency `add` (an accidental install).

### 2.3 Server entry points split: Vite banished from the production graph

`server/_core/app.ts` (new) holds all shared wiring; `server/_core/index.ts` is the
production entry (no Vite import); `server/_core/dev.ts` is the dev entry (the only module
allowed to import `./vite`). Verified end-to-end: `pnpm install --prod` + `node dist/index.js`
now boots and serves `/api/health` and the SPA.

Also in `app.ts`:
- **Body cap 50 mb → 1 mb** (`BODY_LIMIT`, overridable). A 2 MB POST now returns `413`
  instead of buffering into the heap; uploads never traverse this process anyway
  (`/manus-storage/*` is a 307 redirect, `server/storage.ts` PUTs browser→S3 direct).
- `GET /api/health` — dependency-free liveness endpoint for container healthchecks.
- `trust proxy` (1 hop) so `req.ip`/`req.protocol` are right behind the tunnel, and
  `x-powered-by` disabled.
- Security headers (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`) now set in code —
  replacing the role a platform config file used to play, portable across any origin.
- **Strict `$PORT` binding in production** with fail-loud on `EADDRINUSE`; the 20-port
  scan is kept only for dev, where it is useful.
- Graceful drain on SIGTERM/SIGINT (`closeIdleConnections()` + 8 s force-exit).
- Static assets: `max-age=31536000, immutable` for content-hashed files, `no-cache` for
  HTML — previously `maxAge: 0`, i.e. the CDN/edge cache was useless for the hot path.
- Umami analytics is now injected **only when both env vars are set**. Previously
  `<script src="%VITE_ANALYTICS_ENDPOINT%/umami">` shipped literally, so every page view
  fetched a bogus URL that the SPA fallback answered with HTML (console error + wasted
  request per view).

### 2.4 Correction to the brief's Docker spec

```
$ NODE_OPTIONS="--max-old-space-size=192 --optimize-for-size" node -e 0
node: --optimize-for-size is not allowed in NODE_OPTIONS
```

As written, the container would exit during boot (exit code 9, before the app starts).
Verified flag matrix:

| Flag | in `NODE_OPTIONS` | as CLI arg |
|---|---|---|
| `--max-old-space-size=192` | allowed | allowed |
| `--optimize-for-size` | **BLOCKED** | allowed |
| `--max-semi-space-size=2` | allowed | allowed |
| `--gc-global` | **BLOCKED** | allowed |

So `NODE_OPTIONS=--max-old-space-size=160` (192 MB heap + ~50 MB V8 code/page-cache
inside a 256 MB cgroup is tight) and `--max-semi-space-size=2 --optimize-for-size` live in
the Dockerfile `ENTRYPOINT`. Exec-form entrypoint keeps node as PID 1 so `docker stop`
reaches the drain handler.

---

### 2.5 Hybrid edge layer (adopted): client on Workers Assets, API on the VPS

Three new files, verified against a real `workerd` runtime (§6):

| File | Role |
|---|---|
| `wrangler.toml` | `[assets] directory = "./dist/public"`, `binding = "ASSETS"`, `not_found_handling = "single-page-application"`, `run_worker_first = ["/api/*", "/manus-storage/*"]`. `compatibility_flags = []` — `nodejs_compat` is deliberately **off**: the router uses only Web Standard APIs, and enabling the Node layer would build a polyfill graph per isolate boot for nothing. |
| `worker/index.ts` | The router: allowlist → stream to the tunnel origin, everything else → `env.ASSETS.fetch()`. **4.93 KiB / 1.95 KiB gzip.** |
| `vite.config.ts` → `_headers` | Workers Assets has no `[[assets.rules]]` in wrangler 4.127.1 (schema-checked), so cache/header policy ships as a generated `_headers` file in the assets dir. |

Why the client needs **no** change: `client/src/main.tsx` already calls `url: "/api/trpc"`
(same-origin) and `client/src/const.ts` builds `${window.location.origin}/api/oauth/callback`,
so one hostname serves edge statics and tunneled API without a rewrite — and the session
cookie stays first-party.

Worker behaviour, all of it tested: fail-closed path allowlist (never an open proxy), bodies
**streamed** (no `text()`/`arrayBuffer()` on the path, which is how an edge worker becomes a
memory problem), hop-by-hop headers stripped per RFC 9110 §7.6.1 while `Cookie` /
`Authorization` / `Set-Cookie` pass through untouched, `x-forwarded-proto: https` so Express
`trust proxy` marks the session cookie `Secure`, `redirect: "manual"` so the storage 307
reaches the browser, `Content-Length > MAX_BODY_BYTES → 413` **before** Node,
`content-encoding → 415` (a compressed body makes the size guard meaningless),
`AbortController` + 504 on origin timeout, 502 on unreachable origin, and `no-store` pinned
on every proxied response. Bodyless statuses (101/204/205/304) and `HEAD` never get a body
attached, per the Fetch spec.

Two `_headers` facts measured rather than assumed, both of which broke a first draft:

1. **Rules accumulate; they do not override.** Putting `Cache-Control: no-cache` on `/*`
   produced `no-cache, public, max-age=31536000, immutable` on hashed chunks — silently
   destroying a year of immutability.
2. **`!`-negation is unsupported**: `!/assets/*` was rejected with
   `Found 1 invalid header rule: Expected a colon-separated header pair`.
   HTML therefore needs *no* rule: Workers Assets already answers unmatched paths with
   `Cache-Control: public, max-age=0, must-revalidate`, i.e. revalidate every view,
   304-cheap via ETag, deploy visible immediately.

`EDGE_ONLY=true` on the container closes the remaining hole in this topology: without it the
tunnel hostname serves a second copy of the SPA, giving crawlers a duplicate origin and
visitors a path that bypasses the edge's cache/header policy. With it the origin answers
`/api/*` + `/manus-storage/*` only and 404s the rest (`{"error":"static_served_from_edge"}`).

### 2.6 Dead pages removed

`client/src/pages/Home.tsx` (33 lines) and `client/src/pages/ComponentShowcase.tsx`
(1 437 lines) were deleted — neither was routed in `App.tsx` (routes are `/`, `/products` →
`Products`, `/settings/social`, `/404`). The showcase was also the sole holder of the repo's
only literal `@vercel` string, so the only remaining "vercel" matches in the tree are
deliberate: the `.vercel` / `vercel.json` exclusion patterns in `.dockerignore` and the words
"no Vercel/Express signatures" in `worker/index.ts`'s header comment.
`client/src/App.tsx` lost its now-invalid `Home` import.

Per your scope choice the shadcn kit stays: those 54 `ui/*` files are unreferenced but cost
**0 bytes** in the bundle (grep-verified: `recharts`, `embla`, `cmdk`, `vaul`,
`react-day-picker`, `framer-motion` all appear 0 times in `dist/`), so `streamdown` and
friends remain declared because `AIChatBox.tsx` — kept — still imports them. Removing the kit
would only shrink the repo, never the payload, so it stays an explicit opt-in.

Measured side effect of the deletion: CSS `122.32 kB → 120.82 kB` (Tailwind dropped the
classes only the showcase used); JS unchanged at `425.97 kB`, exactly as predicted for
unreferenced files.

## 3. Why "100 % Cloudflare Workers + D1" is not a refactor for this app

The server uses Node-only APIs that workerd does not provide: `http.createServer`,
`net.createServer`, `node:fs` (static file serving), `express` middleware, and
`mysql2` (a TCP driver — D1 speaks SQLite over `env.DB`, MySQL requires Hyperdrive).
The 11 `server/_core/*` modules also call the Forge APIs with `fetch`, which *is*
portable, but that is the only piece.

Honest cost for a Workers port: rewrite `drizzle-orm/mysql2` → `drizzle-orm/sqlite-core`
(new migrations, new column types — `mysqlEnum`/`timestamp` defaults have no D1 equivalent),
replace `express.static` with Workers Static Assets bindings, and re-implement the session
cookie/Jose flow on `Request`/`Response`. That is a re-platform, not the "purge Vercel
files" task, and it would leave the MySQL database in `omran-store-live` stranded.

**Adopted path (§5.0 hybrid)**: the static client — which *is* portable and is 99 % of the
detected payload — moves to Workers Assets and is served from the edge, while the Express +
MySQL runtime stays on the VPS behind the tunnel, reached only for `/api/*` and
`/manus-storage/*`. No ORM rewrite, no stranded database, and the edge component is a
4.93 KiB worker with zero Node polyfills.

---

## 4. Webhook / Meta Live idempotency — **declined, by owner decision**

Recorded so the next reader does not re-open this. The brief asked to enforce SQL-level
idempotency on incoming webhooks and "Meta Live events" using `001_add_idempotency_key.sql`.

Findings that made it moot for this repository:

- There is no callback endpoint here at all: `webhook`, `hub.challenge`, `META_VERIFY_TOKEN`,
  `STORE_API_KEY` each return **0** matches across the tree, and `001_add_idempotency_key.sql`
  exists in none of the account's 8 repos. The single `idempot*` hit is a doc-comment in
  `server/_core/heartbeat.ts:185` about cron deletion.
- `todo.md` shows the Meta integration was **removed on purpose**: the Instagram/Facebook
  Graph fetchers, their access tokens and the tRPC feed endpoint were all deleted in favour of
  static official links, and the settings page was rewritten to hold no secret at all.
- The "Live" surface people point at — `src/components/common/LiveSalesNotification.jsx` in
  the sibling `omrantoys-store` — renders a hard-coded 5-row array of customer names. It is a
  mock, not an event consumer, so there is nothing to dedupe there either.

So there is no event path to guard, and building the guard would add a D1 table, a secret and
an attack surface for a feed the owner already decided not to run. If that decision ever
reverses, the shape is small and standard: an `inbound_events` table keyed by the provider's
event id, `INSERT … ON CONFLICT (event_id) DO NOTHING RETURNING event_id` as the atomic
claim-or-skip, `200` returned before any store write, and the actual work deferred with
`ctx.waitUntil()`. That belongs in `omrantoys-store`, which already has the `omran-toys-db`
D1 binding — not in this MySQL-backed app.

## 5. Deploy commands

### 5.1 Local development / migration

```bash
corepack enable && corepack prepare pnpm@10.4.1 --activate
pnpm install                      # dev + prod deps
cp .env.example .env                # fill DATABASE_URL, JWT_SECRET, OAUTH_SERVER_URL
pnpm dev                            # tsx watch server/_core/dev.ts  (Vite HMR)
pnpm check && pnpm test && pnpm build
# Drizzle/MySQL migrations (this project's migration folder is drizzle/):
pnpm exec drizzle-kit generate && pnpm exec drizzle-kit migrate
pnpm db:push                        # same two steps, one alias
```

### 5.2 Docker on the VPS (memory-capped, tunnel-only ingress)

```bash
git clone https://github.com/alaaomran2020/omran-store-live && cd omran-store-live
cp .env.example .env && vi .env
docker compose build                              # devDeps used only in the build stage
docker compose up -d                                # no published ports by design
# EDGE_ONLY=false keeps the container serving dist/public (pure-VPS mode)
docker compose ps                                   # store should be "healthy"
docker stats --no-stream $(docker compose ps -q)     # expect ~110-120 MiB / 256 MiB limit
docker compose exec store sh -lc 'wget -qO- http://127.0.0.1:3000/api/health'
# image discipline: no devDeps, no .env, no .git in the build context
docker image inspect omran-store-live:latest --format '{{.Config.User}} {{.Config.Entrypoint}}'
```

Firewall — keep the origin closed; the tunnel dials *out*:

```bash
sudo ufw default deny incoming && sudo ufw allow OpenSSH
sudo ufw status verbose          # 80/443 must NOT appear
```

Compose note: `env_file: [{path, required: false}]` needs Compose ≥ 2.24; on older
versions replace it with `env_file: [.env]` (and keep `.env` present), and note that
`deploy.resources` limits require Compose v2 (they are ignored by `docker run` / v1).

### 5.3 Cloudflare Tunnel (recommended: remotely-managed, token)

```bash
cloudflared tunnel login
cloudflared tunnel create omran-store-live
TUNNEL_ID=$(basename cloudflared tunnel list -O yaml | head -1)   # or read the JSON name
cloudflared tunnel route dns omran-store-live omrantoys.store
cloudflared tunnel route dns omran-store-live www.omrantoys.store
# In the dashboard, set the public hostname service to http://store:3000
# (Docker DNS inside the compose network — never a published host port).
printf 'CLOUDFLARE_TUNNEL_TOKEN=%s\n' "$(cat ~/.cloudflared/omran-store-live.token)" >> .env
docker compose up -d cloudflared
cloudflared tunnel info omran-store-live
```

Locally-managed alternative: mount `deploy/cloudflared/config.yml` (ingress →
`http://store:3000`, catch-all `http_status:404`), see the comments in that file.

### 5.4 Edge deployment — hybrid (this repo, adopted)

```bash
cd omran-store-live
cp .env.example .env                      # set ORIGIN hostnames + EDGE_ONLY=true on the VPS

# 1. Tunnel the container first; the edge proxies to it. Public hostname:
#    origin.omrantoys.store -> http://store:3000   (see deploy/cloudflared/config.yml)
#    omrantoys.store        -> CNAME to <name>.workers.dev  (or "Workers for Platforms" route)

# 2. Build the client, then publish assets + router
pnpm build                                # emits dist/public + _headers
pnpm exec wrangler versions upload        # dry-run the bundle first, no traffic:
pnpm exec wrangler deploy --dry-run       #   -> "Total Upload: 4.93 KiB / gzip: 1.95 KiB"
npx wrangler secret put ORIGIN_BASE_URL   # only if you prefer a secret over [vars]
pnpm run deploy:edge                      # wrangler deploy
pnpm run preview:edge                     # local: workerd + assets + origin proxy

# 3. Prove the split works (expect: immutable / must-revalidate / no-store)
curl -sI https://omrantoys.store/                     | grep -i cache-control
curl -sI https://omrantoys.store/assets/$(ls dist/public/assets | grep '\.js$' | head -1) | grep -i cache-control
curl -s  https://omrantoys.store/api/health
curl -sI https://origin.omrantoys.store/products      | head -1   # must be 404 (EDGE_ONLY)

# 4. VPS: stop serving the SPA once the edge owns it
printf 'EDGE_ONLY=true\n' >> .env && docker compose up -d store
```

Local end-to-end check without any Cloudflare account (what was run for §6): start the
container-equivalent origin, then point `wrangler dev` at it —

```bash
NODE_ENV=production PORT=3000 EDGE_ONLY=true node dist/index.js &
pnpm exec wrangler dev --port 8787 --var ORIGIN_BASE_URL:http://127.0.0.1:3000
curl -s localhost:8787/api/trpc/system.health?input=%7B%22json%22%3A%7B%22timestamp%22%3A1%7D%7D
```

> D1 note: the `omran-toys-db` database the brief quotes belongs to the sibling
> `omrantoys-store` repo (`[[d1_databases]] binding = "DB"`), whose `cloudflare/d1-schema.sql`
> is already validated (25/25 positive, 16/16 negative, 18/18 in `test-d1.sh`). Nothing in this
> app can use D1 — it is MySQL via `drizzle-orm/mysql2` — so no D1 binding is declared here.

### 5.5 Vercel purge — belongs to `omran-store` (the repo that has them)

```bash
git rm vercel.json
npm uninstall @vercel/analytics                 # ^2.0.1 — the only @vercel/* package
# its Cloudflare twin is already committed: wrangler.jsonc + open-next.config.ts
npm run build:cf && npx wrangler deploy         # opennextjs-cloudflare
# re-implement the three vercel.json header rules in _headers or the worker:
#   nosniff / X-Frame-Options DENY / Referrer-Policy on /* ;
#   immutable 1y on /fonts/* ; 86400 on /catalog-facebook/*
grep -rn "@vercel\|vercel\.json\|VERCEL_" . --exclude-dir=node_modules --exclude-dir=.git
```

---

## 6. Verification log (all run against this checkout)

```
$ pnpm exec tsc --noEmit                    → 0 errors
$ pnpm test                                 → 3 files / 7 tests passed
$ pnpm build                                → index.html 0.48 kB · js 425.97 kB · server 23.6 kB
$ grep -c manus dist/public/index.html       → 0        (was: 367 kB runtime inlined)
$ grep -c "%VITE_ANALYTICS" dist/…/index.html→ 0        (was: 2 literal placeholders)
$ du -sh /tmp/prodtest2/node_modules         → 62M     (was 359M for the same install)
$ NODE_ENV=production node dist/index.js     → "Server running on http://0.0.0.0:3198/"
      GET /api/health                        → 200 {"ok":true,…}
      GET /                                  → 200, 480 bytes, Cache-Control: no-cache
      GET /assets/index-*.js                 → Cache-Control: public, max-age=31536000, immutable
      POST 2 MB body                         → 413
      ps -o rss= (idle, then after 200 reqs) → 115.9 MB → 119.0 MB  (flat; no leak)
      SIGTERM                                → "[server] SIGTERM received, draining"
$ js-yaml docker-compose.yml                 → parses; store has no `ports:` key
$ pnpm exec prettier --check <touched files> → all clean

# Hybrid edge, run against real workerd (wrangler 4.127.1) + the built client:
$ pnpm run check                             → 0 errors (root tsconfig AND worker/tsconfig)
$ wrangler deploy --dry-run                  → Total Upload: 4.93 KiB / gzip: 1.95 KiB
                                             → "Read 5 files from the assets directory"
                                             → no schema warnings (compatibility_flags [])
$ wrangler dev  → "✨ Parsed 2 valid header rules."
  GET  /assets/index-*.js   → Cache-Control: public, max-age=31536000, immutable
  GET  /assets/index-*.css  → Cache-Control: public, max-age=31536000, immutable
  GET  /products            → 200, 482 bytes, Cache-Control: public, max-age=0, must-revalidate
                              + nosniff / DENY / strict-origin (3 of 3, from _headers)
  GET  /api/health          → 200, Cache-Control: no-store, x-edge: omran-store-live
  GET  /api/trpc/system.health?input=…      → {"result":{"data":{"json":{"ok":true}}}}
  POST 2 MB body to /api/*  → 413 {"error":"request_body_too_large"}   (rejected at edge)
  GET  //evil.com/api/health→ 307 Location: /evil.com/api/health  (path-relative: no open redirect;
                              and never reaches new URL() with a foreign host)
  GET  /api/../../etc/passwd→ normalized by workerd to /etc/passwd → SPA fallback 200 (no traversal)
  GET  :3000/products       → 404 {"error":"static_served_from_edge"}  (EDGE_ONLY on the origin)
  GET  :3000/api/health     → 200  (API still reachable through the tunnel)
$ du -sh /tmp/prodtest2/node_modules         → 62M, 10 packages (wrangler/workers-types are
                                               devDependencies, so the runtime image is unaffected)
```

Not verified locally: `docker build` / `docker compose up` (no Docker daemon in this
sandbox) and `wrangler deploy` (needs the real `database_id` and Cloudflare auth). The
image's runtime layout was instead verified equivalently by running the production bundle
against a fresh `pnpm install --prod` tree — which is exactly what exposed the
`ERR_MODULE_NOT_FOUND: vite` defect that §2.3 fixes.
