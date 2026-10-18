// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const headers = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");
const robots = readFileSync(new URL("../../public/robots.txt", import.meta.url), "utf8");
const viteConfig = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");

const hash = (s: string) => `sha256-${createHash("sha256").update(s).digest("base64")}`;

describe("public surface security policy", () => {
  it("enforces CSP without a general inline JavaScript bypass", () => {
    expect(headers).toMatch(/^\/\*\r?\n  Content-Security-Policy: /);
    const csp = headers.match(/Content-Security-Policy: ([^\r\n]+)/)?.[1];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("script-src 'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    // Pages _headers lines must remain below 2000 characters.
    expect(`  Content-Security-Policy: ${csp}`.length).toBeLessThan(2000);
  });

  it("hash-allowlists every current inline script and the font-load handler", () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    for (const script of scripts) {
      if (!/\bsrc\s*=/.test(script[1])) {
        expect(headers, "inline script hash must stay in sync with HTML").toContain(hash(script[2]));
      }
    }
    for (const handler of html.matchAll(/\sonload="([^"]+)"/g)) {
      expect(headers, "inline event handler hash must stay in sync").toContain(hash(handler[1]));
    }
  });

  it("enforces HTTPS and keeps the admin noindex/no-store policy", () => {
    expect(headers).toContain("Strict-Transport-Security: max-age=31536000");
    expect(headers).toMatch(/\/admin\/\*\r?\n  X-Robots-Tag: noindex, nofollow/);
    expect(headers).toContain("Cache-Control: private, no-store, max-age=0");
  });

  it("copies the reviewed source headers into the production build", () => {
    expect(viteConfig).toContain('path.resolve(import.meta.dirname, "public", "_headers")');
    expect(viteConfig).toContain('path.join(outDir, "_headers")');
    expect(viteConfig).toContain("EDGE_ASSET_CACHE_HEADERS");
  });

  it("does not advertise admin and API paths in robots.txt", () => {
    expect(robots).not.toMatch(/^Disallow:\s*\/(admin|api|settings|manus-storage)/m);
    expect(robots).toContain("Sitemap: https://omrantoys.store/sitemap.xml");
  });
});
