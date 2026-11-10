/**
 * Guard the checked-in sitemap against retired product URLs.
 *
 * Runs after the approved catalog snapshot is refreshed in CI. This test is
 * offline and never requests Google Search Console or a live storefront.
 * If the approved catalog changes, regenerate the source sitemap with
 * `pnpm sitemap:generate` in the development branch before review.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const origin = "https://omrantoys.store";

function snapshotPaths(file, prefix) {
  const source = readFileSync(file, "utf8");
  const ids = [...source.matchAll(/^\s*(?:"id"|id):\s*"([^"]+)"/gm)]
    .map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `Duplicate approved IDs in ${file}`);
  assert.ok(ids.every(id => /^[A-Za-z0-9_-]+$/.test(id)), `Invalid product ID in ${file}`);
  return ids.map(id => prefix + encodeURIComponent(id));
}

function sourceSitemapPaths() {
  const xml = readFileSync("public/sitemap.xml", "utf8");
  assert.match(xml, /<urlset\b/);
  const raw = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(raw.length, new Set(raw).size, "Duplicate sitemap URLs");
  return raw.map(value => {
    const url = new URL(value);
    assert.equal(url.origin, origin, `Unexpected sitemap host: ${value}`);
    assert.equal(url.search, "", `Query strings must not enter sitemap: ${value}`);
    assert.equal(url.hash, "", `Fragments must not enter sitemap: ${value}`);
    return url.pathname;
  });
}

test("checked-in sitemap lists exactly the approved product routes", () => {
  const expected = [
    ...snapshotPaths("client/src/lib/publicProductsSnapshot.ts", "/products/p/"),
    ...snapshotPaths("client/src/lib/popupProductsSnapshot.ts", "/popup/p/"),
  ].sort();
  const actual = sourceSitemapPaths()
    .filter(value => /^\/(?:products|popup)\/p\//.test(value))
    .sort();

  assert.deepEqual(actual, expected,
    "Stale or missing product sitemap URLs. Check the publication gate, then run pnpm sitemap:generate.");
});

test("sitemap does not advertise internal, private or missing-page routes", () => {
  const paths = sourceSitemapPaths();
  assert.ok(paths.includes("/"), "Homepage missing from sitemap");
  for (const pathname of paths) {
    assert.doesNotMatch(pathname, /^\/(?:admin|account|api|404)(?:\/|$)/,
      `Private or missing page in sitemap: ${pathname}`);
  }
});
