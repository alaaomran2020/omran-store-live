// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(new URL(".", import.meta.url).pathname, "..", "..");
const html = readFileSync(new URL("../../client/index.html", import.meta.url), "utf8");
const robots = readFileSync(new URL("../../public/robots.txt", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8");

function jsonLdBlocks(text: string): Record<string, unknown>[] {
  return Array.from(text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map(
    match => JSON.parse(match[1]) as Record<string, unknown>
  );
}

describe("client/index.html — HTML الثابت (initial shell)", () => {
  it("lang=ar وdir=rtl وcharset صحيح", () => {
    expect(html).toMatch(/<html lang="ar" dir="rtl">/);
    expect(html).toMatch(/<meta charset="UTF-8" \/>/);
  });

  it("viewport آمن (لا maximum-scale=1 ولا user-scalable=no)", () => {
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/)?.[1] ?? "";
    expect(viewport).toContain("width=device-width");
    expect(viewport).toContain("initial-scale=1.0");
    expect(viewport).not.toContain("maximum-scale=1");
    expect(viewport).not.toContain("user-scalable=no");
  });

  it("canonical واحد فقط وبالنطاق الإنتاجي", () => {
    const canonicals = html.match(/<link rel="canonical"[^>]*>/g) ?? [];
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0]).toContain("https://omrantoys.store/");
  });

  it("Open Graph كاملة وtwitter كاملة وog:image asset حقيقي", () => {
    for (const property of ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image", "og:locale"]) {
      expect(html, property).toContain(`property="${property}"`);
    }
    for (const name of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
      expect(html, name).toContain(`name="${name}"`);
    }
    expect(html).toContain("https://omrantoys.store/brand/logo.png");
    expect(existsSync(path.join(repoRoot, "public", "brand", "logo.png"))).toBe(true);
  });

  it("لا يحتوي localhost ولا dev metadata ولا placeholders", () => {
    expect(html).not.toContain("localhost");
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("TODO");
    expect(html).not.toContain("placeholder");
  });

  it("JSON-LD: Organization + WebSite + LocalBusiness كلها صالحة ومطابقة للبيانات المعتمدة", () => {
    const blocks = jsonLdBlocks(html);
    const organization = blocks.find(b => b["@type"] === "Organization")!;
    const website = blocks.find(b => b["@type"] === "WebSite")!;
    const local = blocks.find(b => b["@type"] === "LocalBusiness")!;

    expect(organization.name).toBe("شركة عمران التجارية");
    expect(organization.url).toBe("https://omrantoys.store/");
    expect(organization.logo).toBe("https://omrantoys.store/brand/logo.png");

    expect(website.url).toBe("https://omrantoys.store/");
    const action = website.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    expect(String(action.target)).toContain("/products?search=");

    expect(local.name).toBe("شركة عمران التجارية");
    expect(local.telephone).toContain("+201555570269");
    expect(local.telephone).toContain("+20403411149");
    const addresses = local.address as Record<string, unknown>[];
    expect(addresses).toHaveLength(2);
    const joined = JSON.stringify(addresses, null, 0);
    expect(joined).toContain("ميدان السيد البدوي، شارع درب الأبشيهي");
    expect(joined).toContain("الاستاد، أمام نادي سيتي كلوب ومطعم سي السيد");
    expect(joined).toContain("طنطا");
    // ممنوع اختلاق بيانات غير موثقة.
    expect(joined).not.toContain("postalCode");
    expect(joined).not.toContain("streetNumber");
    for (const field of ["openingHours", "geo", "priceRange", "aggregateRating"]) {
      expect(local).not.toHaveProperty(field);
    }
  });
});

describe("public/robots.txt", () => {
  it("يشير إلى sitemap بالإطار الصحيح", () => {
    expect(robots).toContain("Sitemap: https://omrantoys.store/sitemap.xml");
  });

  it("لا يمنع المنتجات أو POP UP أو الأصول", () => {
    const lines = robots.split(/\r?\n/).map(line => line.trim());
    const disallowed = lines
      .filter(line => line.startsWith("Disallow:"))
      .map(line => line.slice("Disallow:".length).trim());
    expect(disallowed).toContain("/admin");
    expect(disallowed).not.toContain("/products");
    expect(disallowed).not.toContain("/popup");
    expect(disallowed).not.toContain("/brand");
    expect(disallowed).not.toContain("/assets");
  });

  it("صياغة سليمة (User-agent + Allow/Disallow/Sitemap)", () => {
    expect(robots).toMatch(/User-agent: \*/);
    for (const line of robots.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      expect(trimmed).toMatch(/^(User-agent|Allow|Disallow|Sitemap): .+/);
    }
  });
});

describe("public/manifest.webmanifest + sitemap الثابت", () => {
  it("manifest صالح وأيقوناته موجودة فعلًا", () => {
    const data = JSON.parse(manifest) as Record<string, unknown>;
    expect(data.lang).toBe("ar");
    expect(data.dir).toBe("rtl");
    expect(data.start_url).toBe("/");
    const icons = data.icons as Array<{ src: string }>;
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(existsSync(path.join(repoRoot, "public", icon.src.replace(/^\//, ""))), icon.src).toBe(true);
    }
  });

  it("sitemap الثابت XML صالح وبدون مسارات داخلية", () => {
    expect(sitemap).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    expect(sitemap).toContain("<urlset");
    for (const forbidden of ["/admin", "?search=", "?category=", "qr-test", "staff-register"]) {
      expect(sitemap, forbidden).not.toContain(forbidden);
    }
  });
});
