// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
const homepage = readFileSync(
  new URL("./components/HomeProductShowcase.tsx", import.meta.url),
  "utf8"
);

describe("mobile first-paint safeguards", () => {
  it("starts the Alexandria font request from HTML instead of a nested CSS import", () => {
    expect(css).not.toMatch(/@import[^;]*fonts\.googleapis\.com/);
    expect(html).toContain('<link rel="preconnect" href="https://fonts.googleapis.com" />');
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />');
    expect(html).toContain('Alexandria:wght@400;500;600;700;800&amp;display=swap');
    expect(html).toContain('media="print" onload="this.media=\'all\'"');
    expect(html).toContain('<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/');
    const activeHead = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
    const fontLinks = [...activeHead.matchAll(/<link[^>]*rel="stylesheet"[^>]*fonts\.googleapis\.com[^>]*>/gi)];
    expect(fontLinks).toHaveLength(1);
    expect(fontLinks[0][0]).toContain('media="print"');
    expect(fontLinks[0][0]).toContain('onload="this.media=\'all\'"');

  });

  it("defers the existing Ahrefs script until load plus idle without dropping analytics", () => {
    expect(html).toContain('window.addEventListener("load", function ()');
    expect(html).toContain('window.requestIdleCallback(startAhrefsAnalytics, { timeout: 4000 })');
    expect(html).toContain('window.setTimeout(startAhrefsAnalytics, 1200)');
    expect(html).toContain('https://analytics.ahrefs.com/analytics.js');
    expect(html).not.toContain("var ahrefs_analytics_script =");
  });

  it("limits eager high-priority home product media to the first card", () => {
    expect(homepage).toContain("priority={index === 0}");
    expect(homepage).not.toContain("priority={index < 2}");
  });

  it("does not change the SEO canonical or the public catalog link", () => {
    expect(html).toContain('<link rel="canonical" href="https://omrantoys.store/" />');
    expect(homepage).toContain('href="/products#feed"');
  });
});
