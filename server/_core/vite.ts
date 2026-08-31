import type { Express } from "express";
import { type Server } from "http";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

/**
 * Dev-only Vite integration (HMR + on-the-fly index.html transform).
 *
 * This module is the *only* place that imports `vite` and `vite.config.ts`. It
 * must be loaded exclusively from `server/_core/dev.ts`; if the production
 * entry ever imports it, esbuild emits top-level `import "vite"` (etc.) into
 * `dist/index.js` and the app cannot boot in an image that strips
 * devDependencies.
 */
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
