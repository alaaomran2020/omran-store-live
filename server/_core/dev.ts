import { createServer } from "http";
import net from "net";
import { buildApp, serveStatic } from "./app";
import { setupVite } from "./vite";

/**
 * Development entry point (`pnpm dev`), run through tsx so TypeScript resolves
 * directly. This is the only module allowed to import Vite.
 */

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, () => {
      probe.close(() => resolve(true));
    });
  });
}

/** Dev convenience: hop to the next free port so parallel previews can coexist. */
async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = buildApp();
  const server = createServer(app);

  // Vite serves the client in dev; static files only if Vite is unavailable.
  try {
    await setupVite(app, server);
  } catch (err) {
    console.error(
      "[dev] Vite middleware failed to start, falling back to dist:",
      err
    );
    serveStatic(app);
  }

  const port = await findAvailablePort(PORT);
  if (port !== PORT) {
    console.log(`Port ${PORT} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
