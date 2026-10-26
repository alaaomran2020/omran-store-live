// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PUBLIC_PAGE_SEO, renderStaticSeoShell, renderProductSeoShell } from "../../scripts/static-seo-shell.mjs";

const shell = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("Cloudflare Pages static SEO shells", () => {
  it("emits canonical, real image and safe informational schema in initial HTML for a published product", () => {
    const html = renderProductSeoShell(shell, { id: "OMR-RAW-001", name: "محلول فقاعات صابون", description: "", category: "ألعاب خارجية", processedImage: "/products/processed/generated/product-omr-raw-001-main.webp" }, "toys");
    expect(html).toContain('href="https://omrantoys.store/products/p/OMR-RAW-001"');
    expect(html).toContain('<title>محلول فقاعات صابون | عمران تويز</title>');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).not.toContain('"@type":"Product"');
    expect(html).not.toContain('"offers":');
    expect(html).toContain('https://omrantoys.store/products/processed/generated/product-omr-raw-001-main.webp');
  });
  it("keeps wholesale prices out of static SEO, social previews, JSON-LD and no-script fallback", () => {
    const html = renderProductSeoShell(shell, {
      id: "OMR-SPK-MIC-001",
      name: "سماعة محمولة مع مايك لاسلكي",
      category: "رفايع لعب أطفال",
      description: "سماعة ممتازة للهدايا. سعر الجملة للتجار 150 جنيه.",
      price: 170,
      image: "/products/processed/product-speaker-wireless-mic-main.webp",
    }, "toys");
    expect(html).toContain("سماعة ممتازة للهدايا");
    expect(html).not.toContain("سعر الجملة");
    expect(html).not.toContain("150 جنيه");
    expect(html).not.toContain('"price":170');
    expect(html).toContain("للسعر");
  });

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
