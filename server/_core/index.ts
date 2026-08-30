import { createServer } from "http";
import { buildApp, serveStatic } from "./app";

/**
 * Production entry point — bundled by esbuild into `dist/index.js`.
 *
 * Nothing in this file's import graph may reference Vite or any other
 * devDependency; `./app` is where the shared wiring lives, and the dev-server
 * helper lives in `./vite` (imported only by `./dev`).
 */

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

if (process.env.NODE_ENV !== "production") {
  console.warn(
    `[server] NODE_ENV is "${process.env.NODE_ENV ?? "unset"}", expected "production" ` +
      "(use server/_core/dev.ts for development)."
  );
}

/** Held so the signal handlers can drain the live listener. */
let activeServer: ReturnType<typeof createServer> | null = null;

async function startServer() {
  const app = buildApp();
  const server = createServer(app);
  activeServer = server;

  serveStatic(app);

  // Bind exactly $PORT and fail loudly if it is taken. Silently hopping to the
  // next free port (the old behaviour) would move the app off the 3000 that a
  // Cloudflare Tunnel/ingress targets, leaving a "healthy" but unreachable
  // container. Dev keeps the hop; see ./dev.ts.

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "0.0.0.0", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  console.log(`Server running on http://0.0.0.0:${PORT}/`);
}

/**
 * Graceful drain: stop accepting new sockets, let in-flight requests finish,
 * then force-exit after a bounded window so a stuck keep-alive cannot block
 * `docker stop` (Compose sends SIGTERM, waits stop_grace_period, then SIGKILL).
 */
function shutdown(signal: string) {
  console.log(`[server] ${signal} received, draining`);
  const server = activeServer;
  if (!server) {
    process.exit(0);
    return;
  }
  const force = setTimeout(() => process.exit(1), 8_000);
  force.unref();
  server.closeIdleConnections();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer().catch(err => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
