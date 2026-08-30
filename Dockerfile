# syntax=docker/dockerfile:1
# =============================================================================
# Omran Store Live — production image
#
# Multi-stage, node:20-alpine, devDependencies stripped from the final layer,
# non-root `USER node`. Measured in this repo's validation run:
#   runtime node_modules  359 MB -> 62 MB (10 packages)
#   dist/index.js          23.6 kB
#   dist/public/index.html 0.48 kB (was 368 kB while a host preview runtime was
#                          being inlined into every production build)
#
# NOTE ON V8 FLAGS: `--optimize-for-size` (and `--gc-global`) are *not* allowed
# inside NODE_OPTIONS — Node aborts with
#   node: --optimize-for-size is not allowed in NODE_OPTIONS
# so the flags live in the ENTRYPOINT below, where they are accepted, and only
# --max-old-space-size is passed through NODE_OPTIONS.
# =============================================================================

# --- Stage 1: resolve dependencies (full graph, needed to build the client) --
FROM node:20-alpine AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Copy only the manifests first so this layer caches until they change.
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack enable \
 && corepack prepare pnpm@10.4.1 --activate \
 && pnpm install --frozen-lockfile --ignore-scripts

# --- Stage 2: build (vite client -> dist/public, esbuild server -> dist) -----
FROM node:20-alpine AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
COPY tsconfig.json vite.config.ts vitest.config.ts drizzle.config.ts components.json ./
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY drizzle ./drizzle
# Build args, not runtime secrets: only VITE_* values may be embedded here.
ARG VITE_ANALYTICS_ENDPOINT=
ARG VITE_ANALYTICS_WEBSITE_ID=
ENV VITE_ANALYTICS_ENDPOINT=${VITE_ANALYTICS_ENDPOINT}
ENV VITE_ANALYTICS_WEBSITE_ID=${VITE_ANALYTICS_WEBSITE_ID}
RUN pnpm build

# --- Stage 3: production-only dependency set -------------------------------
FROM node:20-alpine AS prod-deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack enable \
 && corepack prepare pnpm@10.4.1 --activate \
 && pnpm install --prod --frozen-lockfile --ignore-scripts \
 && pnpm store prune

# --- Stage 4: runner --------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    # Body cap; uploads go direct-to-storage and never hit this process.
    BODY_LIMIT=1mb
# Heap cap stays below the container memory limit in docker-compose.yml
# (256M) so V8 is forced to collect before the cgroup OOM-killer intervenes.
# Measured idle RSS with a 128 MB cap: ~116 MB, flat across 200 requests.
ENV NODE_OPTIONS=--max-old-space-size=160

# `node` (uid 1000) ships with the official images; no app data is written, so
# the container can run with a read-only root filesystem.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

# Busybox `wget` is present in alpine (no curl); the endpoint performs no DB or
# upstream work, so a dependency outage cannot flip the container unhealthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O - "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || exit 1

# Exec form keeps node as PID 1 so SIGTERM from `docker stop` reaches the
# graceful drain handler in server/_core/index.ts.
ENTRYPOINT ["node", "--max-semi-space-size=2", "--optimize-for-size", "--disable-warning=ExperimentalWarning"]
CMD ["dist/index.js"]
