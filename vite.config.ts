import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import {
  defineConfig,
  loadEnv,
  type Plugin,
  type PluginOption,
  type ViteDevServer,
} from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map(entry => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser logs (DEV ONLY — see `apply: "serve"` below)
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",
    // Dev-only: the log sink writes to the local filesystem, so it must never
    // be registered in a production/container build.
    apply: "serve",

    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // أدوات التطوير فقط (dev): الملف لم يعد داخل publicDir القابل للنشر،
      // فيُقدَّم يدويًا في بيئة التطوير وحدها ولا يصل أبدًا لناتج البناء.
      server.middlewares.use("/__manus__/debug-collector.js", (_req, res) => {
        const file = path.join(
          PROJECT_ROOT,
          "client",
          "public",
          "__manus__",
          "debug-collector.js"
        );
        try {
          res.writeHead(200, { "Content-Type": "text/javascript" });
          res.end(fs.readFileSync(file, "utf-8"));
        } catch {
          res.writeHead(404);
          res.end();
        }
      });

      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Host/IDE tooling must never reach production output.
//
// `vite-plugin-manus-runtime` inlines its whole previewer bundle
// (~367 kB of JS, plus ~34 kB CSS) directly into index.html on every build —
// it is the host editor's element-picker, not application code. `@builder.io/
// vite-plugin-jsx-loc` likewise stamps `data-jsx-loc` source coordinates onto
// every element (bundle bloat + leaked file paths). Both are marked
// `apply: "serve"` so `vite build` skips them. The dev log collector lives in
// `client/public/__manus__`, which is deliberately NOT the shipped publicDir,
// and is served in dev through a middleware instead (see the plugin above), so
// it is dropped from the build output too.
// -----------------------------------------------------------------------------
function devOnly(plugin: Plugin): Plugin {
  return { ...plugin, apply: "serve" };
}

/**
 * Optional Umami analytics tag.
 *
 * The tracker was previously hard-coded into `client/index.html` as
 * `%VITE_ANALYTICS_ENDPOINT%/umami`. With those env vars unset Vite leaves the
 * placeholder literal, so every page load requested a bogus relative URL that
 * the SPA fallback answered with HTML — a guaranteed 404-ish fetch plus a
 * "script loaded as stylesheet/module" console error on each view. Injecting
 * here means the tag only exists when it can actually work.
 */
function vitePluginOptionalAnalytics(
  env: Record<string, string | undefined>
): Plugin {
  const endpoint = (env.VITE_ANALYTICS_ENDPOINT ?? "").replace(/\/+$/, "");
  const websiteId = env.VITE_ANALYTICS_WEBSITE_ID ?? "";
  const enabled = /^https?:\/\//.test(endpoint) && websiteId.length > 0;
  return {
    name: "optional-analytics-tag",
    transformIndexHtml(html) {
      if (!enabled) return html;
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              defer: true,
              src: `${endpoint}/umami`,
              "data-website-id": websiteId,
            },
            injectTo: "body",
          },
        ],
      };
    },
  };
}

/**
 * Workers Assets reads a `_headers` file from the root of the assets directory
 * to set response headers. In the hybrid topology the edge answers every static
 * request *without* invoking the worker, so Express never gets a chance to set
 * these — they must travel with the deployed assets. Mirrors the policy in
 * `server/_core/app.ts` so both deploy targets behave identically.
 */
const EDGE_HEADERS = [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  X-Frame-Options: DENY",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "",
  "# Content-hashed chunks are safe to pin for a year (browser + edge).",
  "/assets/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
].join("\n");

/*
 * Measured against workerd (wrangler 4.127.1), because the shape of this file is
 * counter-intuitive:
 *   - Rules ACCUMULATE, they never override. Declaring `Cache-Control: no-cache`
 *     on `/*` produced `no-cache, public, max-age=31536000, immutable` on hashed
 *     assets — the no-cache silently defeated a year of immutability.
 *   - `!`-negated paths are NOT supported; `!/assets/*` was parsed as a literal
 *     path and appended a second `no-cache`.
 *   - HTML needs no rule at all: Workers Assets already answers unmatched paths
 *     with `Cache-Control: public, max-age=0, must-revalidate`, which revalidates
 *     every view (cheap 304 via ETag) and makes a deploy visible immediately.
 * So: security headers on /*, and Cache-Control only where it differs.
 */
function vitePluginEdgeHeaders(): Plugin {
  return {
    name: "edge-headers",
    apply: "build",
    enforce: "post",
    closeBundle() {
      const outDir = path.resolve(import.meta.dirname, "dist", "public");
      if (!fs.existsSync(outDir)) return;
      fs.writeFileSync(path.join(outDir, "_headers"), EDGE_HEADERS, "utf8");
    },
  };
}

function buildPlugins(): PluginOption[] {
  // Vite's mode only decides which .env.[mode] file wins; the analytics ids are
  // plain VITE_* vars, so merge the env dir over process.env and read them there.
  const env = {
    ...loadEnv("development", path.resolve(import.meta.dirname), ""),
    ...process.env,
  };
  return [
    react(),
    tailwindcss(),
    devOnly(jsxLocPlugin()),
    devOnly(vitePluginManusRuntime()),
    vitePluginManusDebugCollector(),
    vitePluginOptionalAnalytics(env),
    vitePluginEdgeHeaders(),
  ];
}

// NOTE: this must stay a plain object, not the `defineConfig(({command}) => ({...}))`
// function form. `server/_core/vite.ts` spreads this default export into its
// programmatic dev-server options (`configFile: false`); a function there would
// silently strip plugins and path aliases from `pnpm dev`.
const plugins = buildPlugins();

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  // `public/` (جذر المشروع) هو دليل الأصول القابلة للنشر: الشعار والأيقونات
  // وصور المنتجات الحقيقية وrobots.txt وsitemap.xml وmanifest — يُنسخ كما هو
  // إلى dist/public ليُقدَّم من Workers Assets.
  // أدوات التطوير (`client/public/__manus__`) خارج هذا الدليل وتُقدَّم عبر
  // middleware في بيئة التطوير فقط (انظر vitePluginManusDebugCollector).
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Emit no sourcemaps in the shipped client.
    sourcemap: false,
    copyPublicDir: true,
    chunkSizeWarningLimit: 500,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      ".e2b.app",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
