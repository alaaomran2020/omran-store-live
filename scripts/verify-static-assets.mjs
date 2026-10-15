/**
 * Check final Pages output: all hashed JS/CSS referenced by each static
 * SEO shell must be present, and sitemap only includes publicly routable URLs.
 *
 * No network, API, browser or new dependency required.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist/public");
const origin = "https://omrantoys.store";
function fail(message) { throw new Error("[static-assets] " + message); }
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  });
}
function checkFile(filename) {
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile() || fs.statSync(filename).size === 0) fail("Missing or empty file: " + filename);
}
checkFile(path.join(root, "index.html"));
checkFile(path.join(root, "_headers"));
checkFile(path.join(root, "sitemap.xml"));
const pages = walk(root).filter(p => p.endsWith(".html"));
const generatedAssets = new Set();
for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const match = tag[0].match(/(?:href|src)=["']([^"']+)["']/i);
    if (!match) continue;
    const assetPath = match[1].split(/[?#]/)[0];
    if (!assetPath.startsWith("/assets/")) continue;
    const decoded = decodeURIComponent(assetPath);
    const dest = path.resolve(root, "." + decoded);
    if (!dest.startsWith(root + path.sep)) fail("Unsafe build asset path: " + decoded);
    checkFile(dest);
    generatedAssets.add(dest);
  }
}
if (!generatedAssets.size) fail("No built JS or CSS assets were referenced by HTML shells");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
if (!sitemap.includes("<urlset") || sitemap.includes("<!DOCTYPE")) fail("Invalid sitemap XML document");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(/&amp;/g, "&"));
if (!urls.length || new Set(urls).size !== urls.length) fail("Empty or duplicated sitemap entries");
for (const raw of urls) {
  let url;
  try { url = new URL(raw); } catch { fail("Invalid sitemap URL: " + raw); }
  if (url.origin !== origin) fail("Foreign sitemap host: " + raw);
  if (/^\/(admin|account|404)(\/|$)/.test(url.pathname)) fail("Private sitemap URL: " + raw);
  if (url.search) fail("Query-string URL in sitemap: " + raw);
  if (/^\/(products|popup)\/p\//.test(url.pathname)) {
    if (!/^\/(products|popup)\/p\/[A-Za-z0-9_-]+$/.test(url.pathname)) fail("Unsafe product path: " + raw);
  }
  const staticPath = url.pathname === "/" ? "index.html" : url.pathname.slice(1) + ".html";
  checkFile(path.join(root, staticPath));
  const html = fs.readFileSync(path.join(root, staticPath), "utf8");
  const canonicals = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)];
  if (canonicals.length !== 1 || canonicals[0][1] !== raw) fail("Noncanonical sitemap entry " + raw);
  if (/^\/(products|popup)\/p\//.test(url.pathname)) {
    if (!html.includes("id=\"omran-product-jsonld\"")) fail("Product detail lacks first-response WebPage markup: " + raw);
    if (!html.includes(url.pathname.slice(url.pathname.lastIndexOf("/") + 1))) fail("Product details are missing in initial HTML: " + raw);
    if (/"@type":"Product"|"@type":"Offer"/.test(html)) fail("Unsupported Merchant Product/Offer markup in price-enquiry shell: " + raw);
  }
}
console.log(`[static-assets] PASS: ${pages.length} HTML shells, ${generatedAssets.size} hashed assets, ${urls.length} sitemap URLs`);
