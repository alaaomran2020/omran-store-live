// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PUBLIC_PAGE_SEO, renderStaticSeoShell } from "../../scripts/static-seo-shell.mjs";

const shell = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("Cloudflare Pages static SEO shells", () => {
  it("gives every public route its own first-response canonical/title/description", () => {
    for (const [route, metadata] of Object.entries(PUBLIC_PAGE_SEO)) {
      const html = renderStaticSeoShell(shell, route);
      const canonical = html.match(/<link rel="canonical"[^>]*>/gi) ?? [];
      expect(canonical, route).toHaveLength(1);
      expect(canonical[0], route).toContain('href="https://omrantoys.store' + route + '"');
      expect(html, route).toContain("<title>" + metadata.title + "</title>");
      expect(html, route).toContain('property="og:url" content="https://omrantoys.store' + route + '"');
      expect(html, route).not.toContain('name="robots" content="noindex');
    }
  });

  it("never presents private pages as indexable home pages", () => {
    for (const route of ["/admin", "/admin/products", "/account", "/account/login", "/vip/qr-test", "/vip/staff-register"]) {
      const html = renderStaticSeoShell(shell, route);
      expect(html, route).toContain('name="robots" content="noindex, nofollow"');
      expect(html, route).toContain('href="https://omrantoys.store' + route + '"');
    }
  });

  it("marks real 404 shell noindex and gives it no canonical", () => {
    const html = renderStaticSeoShell(shell, "/404");
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toMatch(/<link\s+rel="canonical"/);
  });

  it("does not allow an unreviewed public route to inherit the home canonical", () => {
    expect(() => renderStaticSeoShell(shell, "/not-yet-approved")).toThrow(/No SEO policy/);
  });
});
