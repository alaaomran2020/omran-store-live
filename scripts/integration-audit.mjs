import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const ok = condition => Boolean(condition);
const exists = relative => fs.existsSync(path.join(root, relative));
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => { if (!ok(condition)) errors.push(message); };

const required = [
  "client/src/App.tsx",
  "client/src/admin/AdminAccess.tsx",
  "client/src/pages/Home.tsx",
  "client/src/pages/Products.tsx",
  "client/src/pages/ProductIntake.tsx",
  "client/src/lib/productIntakeClient.ts",
  "client/src/lib/analytics.ts",
  "client/src/lib/publicProductsSnapshot.ts",
  "shared/products.ts",
  "shared/productIntake.ts",
  "public/robots.txt",
  "public/sitemap.xml",
  ".env.example",
  "docs/CURRENT-ARCHITECTURE.md",
  ".github/workflows/deploy-storefront.yml",
];

for (const file of required) assert(exists(file), `missing required integration file: ${file}`);

if (exists("client/src/App.tsx")) {
  const app = read("client/src/App.tsx");
  assert(app.includes('path={"/"}'), "home route is not wired");
  assert(app.includes('path={"/products"}'), "products route is not wired");
  assert(app.includes('path={"/admin"}'), "admin route is not wired");
  assert(app.includes('path={"/admin/product-intake"}'), "product intake route is not wired");
}

if (exists("client/src/admin/AdminAccess.tsx")) {
  const admin = read("client/src/admin/AdminAccess.tsx");
  assert(admin.includes('/cdn-cgi/access/get-identity'), "admin must verify Cloudflare Access identity");
  assert(admin.includes('/cdn-cgi/access/logout'), "admin logout must use Cloudflare Access logout");
  assert(!admin.includes('VITE_ADMIN_AUTH_URL'), "admin must not depend on a custom auth API");
  assert(!admin.includes('sessionStorage'), "admin must not trust a browser-only session token");
  assert(!admin.includes('localStorage') || !admin.includes('admin-session'), "admin must not trust a local admin session");
}

if (exists("client/src/pages/ProductIntake.tsx")) {
  const intakePage = read("client/src/pages/ProductIntake.tsx");
  assert(intakePage.includes("submitProductIntake"), "product intake must submit to the operations gateway");
  assert(!intakePage.includes("localStorage"), "product intake must not persist operational drafts in localStorage");
  assert(!intakePage.includes("exportDrafts"), "product intake must not use CSV export as the operational handoff");
}

if (exists("client/src/lib/productIntakeClient.ts")) {
  const intakeClient = read("client/src/lib/productIntakeClient.ts");
  assert(intakeClient.includes("FormData"), "product intake gateway must send the product image as multipart data");
  assert(intakeClient.includes('form.append("photo"'), "product intake gateway must include the original photo");
  assert(intakeClient.includes("NEEDS_REVIEW"), "product intake gateway must fail closed to NEEDS_REVIEW");
}

if (exists("client/src/lib/analytics.ts")) {
  const analytics = read("client/src/lib/analytics.ts");
  assert(analytics.includes('"whatsapp_conversion"'), "analytics must expose the canonical WhatsApp conversion event");
  assert(analytics.includes("WHATSAPP_CONVERSION_WEBHOOK"), "WhatsApp conversions must be persisted to the operations ledger");
  assert(analytics.includes("product_id"), "conversion tracking must include product_id");
  assert(analytics.includes("sku"), "conversion tracking must include SKU");
  assert(analytics.includes("category"), "conversion tracking must include category");
}

if (exists("shared/productIntake.ts")) {
  const intake = read("shared/productIntake.ts");
  for (const source of ["Facebook", "Instagram", "WhatsApp", "Telegram", "Upload", "Camera", "Sync"]) {
    assert(intake.includes(`"${source}"`), `image source is missing from intake contract: ${source}`);
  }
  assert(intake.includes('"NEEDS_REVIEW"'), "intake must fail closed to NEEDS_REVIEW");
}

if (exists("shared/products.ts")) {
  const products = read("shared/products.ts");
  assert(products.includes('workflowStatus === "PUBLISHED"') || products.includes('workflow_status === "PUBLISHED"'), "publication gate must require PUBLISHED");
  assert(products.includes('qaStatus === "PASS"') || products.includes('qa_status === "PASS"'), "publication gate must require PASS");
}

if (exists("client/src/lib/publicProductsSnapshot.ts")) {
  const snapshot = read("client/src/lib/publicProductsSnapshot.ts");
  const images = [...snapshot.matchAll(/(?:"image"|image):\s*"([^"]+)"/g)].map(match => match[1]);
  assert(images.length > 0, "public snapshot has no product images");
  for (const image of images) {
    assert(image.startsWith("/products/processed/"), `public image is not same-origin: ${image}`);
    const asset = path.join(root, "public", image.replace(/^\//, ""));
    assert(fs.existsSync(asset), `referenced product image is missing: ${image}`);
    if (fs.existsSync(asset)) assert(fs.statSync(asset).size >= 1024, `product image is suspiciously small: ${image}`);
  }
}

if (exists(".env.example")) {
  const env = read(".env.example");
  for (const forbidden of ["DATABASE_URL=", "MYSQL_DATABASE=", "MYSQL_USER=", "ORIGIN_BASE_URL=", "JWT_SECRET=", "PORT=", "VITE_ADMIN_AUTH_URL="]) {
    assert(!env.includes(forbidden), `static live env template contains obsolete runtime setting: ${forbidden}`);
  }
}

if (exists("docs/CURRENT-ARCHITECTURE.md")) {
  const architecture = read("docs/CURRENT-ARCHITECTURE.md");
  assert(architecture.includes("omran-store-live"), "architecture contract must identify the live repository");
  assert(architecture.includes("omrantoys-live-app"), "architecture contract must identify the Cloudflare Pages project");
  assert(architecture.includes("Static Vite storefront only"), "architecture contract must remain static-only");
  assert(architecture.includes("Cloudflare Access"), "architecture contract must document admin edge authentication");
}

for (const obsolete of [
  "server",
  "worker",
  "docker-compose.yml",
  "docs/PLATFORM-AUDIT.md",
  "docs/PRODUCTION-ROUTING-FIX.md",
  "docs/META-SYNC-SETUP.md",
  "docs/N8N-PRODUCT-PIPELINE.md",
  "docs/WHATSAPP-ADMIN-AUTH.md",
]) {
  assert(!exists(obsolete), `obsolete architecture artifact must not return to live repo: ${obsolete}`);
}

if (errors.length) {
  console.error("Integration audit: FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Integration audit: PASS");
console.log("Routes, Cloudflare Access admin guard, publication guard, operational intake, conversion tracking, static architecture, environment and bundled product images are coherent.");
