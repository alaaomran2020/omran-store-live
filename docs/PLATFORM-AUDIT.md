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

**Recommended path** (matches how the sibling repo is already configured): keep this app on
Docker behind a Cloudflare Tunnel (done, §5), and put the edge-side work where the D1
binding already exists — `omrantoys-store`, whose `wrangler.toml` has
`[[d1_databases]] binding = "DB", database_name = "omran-toys-db"`.

---

## 4. Webhook / Meta Live idempotency — needs a decision, nothing to patch

Nothing in this repo receives a callback, so there is no code path to make idempotent.
When you green-light it, this is the design I'd implement in `omrantoys-store` (D1,
`compatibility_date = "2025-06-01"` already set there):

```sql
-- 001_add_idempotency_key.sql (D1 / SQLite)
CREATE TABLE IF NOT EXISTS inbound_events (
  event_id     TEXT PRIMARY KEY,              -- Meta entry.id / Paymob order id
  source       TEXT NOT NULL CHECK (source IN ('meta','paymob','fawry','store')),
  received_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  status       TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','done','failed','ignored')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  payload_sha  TEXT,                           -- secondary dedupe for id-less senders
  lease_until  TEXT
);
CREATE INDEX IF NOT EXISTS idx_inbound_events_due
  ON inbound_events(status, lease_until);
```

SQL-level suppression — a single statement that both claims and dedupes, so concurrent
retries cannot double-apply a Live order:

```sql
INSERT INTO inbound_events (event_id, source, payload_sha)
VALUES (?1, 'meta', ?2)
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id;      -- 0 rows => duplicate: ACK 200 and stop.
```

Worker contract (`functions/api/webhook/meta.ts`-style, Web Standard APIs):

```ts
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(req.url);
    if (req.method === "GET")                       // verification handshake
      return new Response(url.searchParams.get("hub.challenge"), {
        status: 200, headers: { "content-type": "text/plain" } });
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const body = await req.text();
    if (!(await verifyHmac(body, req.headers, env.META_APP_SECRET)))
      return new Response("forbidden", { status: 401 });
    const claimed = await env.DB.prepare(
      `INSERT INTO inbound_events (event_id, source, payload_sha) VALUES (?,'meta',?)
       ON CONFLICT (event_id) DO NOTHING RETURNING event_id`)
      .bind(entryId, sha256hex(body)).first();
    ctx.waitUntil(processEntry(entryId, body, env));  // ack in <5s, Meta's timeout
    return new Response("ok", { status: 200 });        // never block on the store API
  },
};
```

Rules: 200 before any store write; failures recorded in `inbound_events` for replay
(`attempts`, `lease_until`) instead of returning 5xx and inviting a retry storm; secrets
only as Wrangler secrets (`wrangler secret put META_VERIFY_TOKEN`).

---

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

### 5.4 Edge/D1 work — belongs to `omrantoys-store`

```bash
gh repo clone alaaomran2020/omrantoys-store && cd omrantoys-store
npm install                                    # wrangler 4.127.1 is already a devDep
npx wrangler d1 create omran-toys-db           # paste the real database_id into wrangler.toml
npx wrangler d1 execute DB --remote --file=cloudflare/d1-schema.sql
npx wrangler d1 execute DB --remote --file=cloudflare/001_add_idempotency_key.sql  # after §4 approval
npx wrangler d1 execute DB --local  --file=cloudflare/d1-tests.sql                 # 25/25 + 16/16 pass
npx wrangler deploy                            # [assets] + D1 are already configured
printf 'META_VERIFY_TOKEN=...' | npx wrangler secret put META_VERIFY_TOKEN
```

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
```

Not verified locally: `docker build` / `docker compose up` (no Docker daemon in this
sandbox) and `wrangler deploy` (needs the real `database_id` and Cloudflare auth). The
image's runtime layout was instead verified equivalently by running the production bundle
against a fresh `pnpm install --prod` tree — which is exactly what exposed the
`ERR_MODULE_NOT_FOUND: vite` defect that §2.3 fixes.
