/**
 * Visual smoke test for a LOCAL Chrome CDP instance and the local Vite preview.
 * No credentials, no deploy and no third-party requests are required.
 * Usage: node scripts/qa-ramadan-browser.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PORT = 9333;
const BASE = "http://127.0.0.1:5174";
const OUT = resolve(".ramadan-source/screenshots");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find(p => p.type === "page");
if (!page) throw new Error("No CDP page to inspect");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let nextId = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const data = JSON.parse(event.data);
  if (!data.id || !pending.has(data.id)) return;
  const { resolve, reject } = pending.get(data.id);
  pending.delete(data.id);
  if (data.error) reject(new Error(data.error.message));
  else resolve(data.result || {});
});
function rpc(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
await rpc("Page.enable");
await rpc("Runtime.enable");
await mkdir(OUT, { recursive: true });
const reports = [];
const pages = [
  { slug: "home", path: "/" },
  { slug: "ramadan", path: "/products?category=ramadan-lanterns" },
  { slug: "popup", path: "/popup" },
];
for (const { slug, path } of pages) {
  for (const width of (slug === "popup" ? [390] : [320, 390, 768, 1440])) {
    const height = width <= 390 ? 850 : 900;
    await rpc("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: width < 600,
    });
    await rpc("Page.navigate", { url: BASE + path });
    await sleep(1450);
    const { result } = await rpc("Runtime.evaluate", {
      expression: `(()=>{const text=document.body?.innerText||'';const imgs=[...document.querySelectorAll('[data-ramadan-season] img')];return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,mainCount:document.querySelectorAll('main').length,ramadanSeason:!!document.querySelector('[data-ramadan-season]'),ribbon:!!document.querySelector('.ramadan-ribbon'),cardCount:document.querySelectorAll('[data-testid="product-card"]').length,brokenImages:[...document.querySelectorAll('img')].filter(x=>x.complete&&x.naturalWidth===0).map(x=>x.getAttribute('src')).slice(0,6),ramadanImages:imgs.map(x=>({loaded:x.complete&&x.naturalWidth>0,src:x.getAttribute('src')})),saleButtons:/أضف للسلة|شراء الآن/.test(text),whatsAppLinks:document.querySelectorAll('[data-testid="product-card"] a[href*="wa.me"]').length};})()`,
      returnByValue: true,
    });
    const report = { page: slug, targetWidth: width, ...result.value };
    reports.push(report);
    const screenshot = await rpc("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: false, fromSurface: true,
    });
    await writeFile(resolve(OUT, `${slug}-${width}.png`), Buffer.from(screenshot.data, "base64"));
    if (report.scrollWidth > report.width + 2 || report.mainCount !== 1 || !report.ribbon) {
      throw new Error(`Responsive or landmark regression: ${JSON.stringify(report)}`);
    }
    if (slug === "ramadan" && (report.cardCount !== 24 || !report.ramadanSeason || report.whatsAppLinks !== 24 || report.saleButtons)) {
      throw new Error(`Ramadan catalog regression: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify(report));
  }
}
ws.close();
console.log(`PASS: ${reports.length} viewport smoke tests; screenshots in ${OUT}`);
