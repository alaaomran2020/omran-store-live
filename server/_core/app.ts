import "dotenv/config";
import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerSocialFeedRoute } from "../socialFeed";

/**
 * Request body caps.
 *
 * Uploads never pass through this process: `server/storage.ts` asks Forge for a
 * presigned S3 URL and the browser PUTs the bytes directly, while
 * `/manus-storage/*` only issues a 307 redirect. Everything that does reach
 * this server is tRPC JSON (small payloads). The previous `50mb` limit let each
 * concurrent request buffer up to 50 MB of raw body text in memory before
 * parsing — a trivial memory-amplification vector on a capped container.
 * Override with BODY_LIMIT (e.g. BODY_LIMIT=4mb) if a feature ever needs more.
 */
export const BODY_LIMIT = process.env.BODY_LIMIT || "1mb";

/**
 * Assemble the Express app (middleware + API routes).
 *
 * This module is deliberately free of any `vite` import. It used to share a
 * file with the dev-server setup, which pulled `vite.config.ts` — and with it
 * `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` and
 * `@builder.io/vite-plugin-jsx-loc` — into the *production* bundle's static
 * import graph. esbuild marks bare specifiers as external, so `dist/index.js`
 * began with `import ... from "vite"` and died at startup with
 * `ERR_MODULE_NOT_FOUND` under a production-only dependency install (i.e. in
 * any Docker image that strips devDependencies, as it must). Keeping the dev
 * wiring in `./vite.ts`, imported only by the dev entry point, is what makes a
 * slim runner image possible.
 */
export function buildApp(): Express {
  const app = express();

  // Behind a Cloudflare Tunnel/connector the client IP and scheme arrive as
  // X-Forwarded-*; trust one hop so req.ip / req.protocol are correct.
  app.set("trust proxy", 1);

  app.disable("x-powered-by");

  // Baseline response hardening. These were previously delivered by a
  // hosting-platform config file that no longer exists; setting them here
  // keeps the policy portable across Workers / Docker / any origin.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ limit: BODY_LIMIT, extended: false }));

  // Container/orchestrator liveness probe. Deliberately dependency-free (no DB,
  // no upstream calls) so an outage downstream can't trigger a restart loop.
  const startedAt = new Date().toISOString();
  const t0 = performance.now();
  app.get("/api/health", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      startedAt,
      uptimeMs: Math.round(performance.now() - t0),
    });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Facebook/Instagram product feed (same module the Cloudflare edge uses).
  registerSocialFeedRoute(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}

/** Serve the Vite build output with content-hashed assets cached immutably. */
export function serveStatic(app: Express) {
  // The prod entry runs from the bundle (dist/index.js, so the assets sit in a
  // sibling `public` dir); a non-bundled run (tsx) sits under server/_core,
  // two levels below the repo root. Pick whichever layout exists instead of
  // guessing from NODE_ENV, which is what made the old branch brittle.
  const here = import.meta.dirname;
  const candidates = [
    path.resolve(here, "public"),
    path.resolve(here, "..", "..", "dist", "public"),
    path.resolve(here, "..", "dist", "public"),
  ];
  const distPath = candidates.find(c => fs.existsSync(c)) ?? candidates[0];
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory (tried: ${candidates.join(", ")}); run \`pnpm build\` first`
    );
  }

  app.use(
    express.static(distPath, {
      // Vite emits content-hashed names under /assets/, so these are safe to
      // cache forever. The prior behaviour was `maxAge: 0`, forcing every
      // visitor to re-download the ~426 kB bundle and ~122 kB CSS and making
      // the CDN edge cache useless for the app's hot path.
      maxAge: "1y",
      immutable: true,
      index: false,
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // HTML must revalidate so a deploy is visible immediately.
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
