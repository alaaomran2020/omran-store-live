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
  "client/src/pages/Home.tsx",
  "client/src/pages/Products.tsx",
  "client/src/pages/ProductIntake.tsx",
  "client/src/lib/publicProductsSnapshot.ts",
  "shared/products.ts",
  "shared/productIntake.ts",
  "public/robots.txt",
  "public/sitemap.xml",
  ".env.example",
  ".github/workflows/deploy-storefront.yml",
];

for (const file of required) assert(exists(file), `missing required integration file: ${file}`);

if (exists("client/src/App.tsx")) {
  const app = read("client/src/App.tsx");
  assert(app.includes('path={"/"}'), "home route is not wired");
  assert(app.includes('path={"/products"}'), "products route is not wired");
  assert(app.includes('path={"/admin/product-intake"}'), "product intake route is not wired");
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
  for (const forbidden of ["DATABASE_URL=", "MYSQL_DATABASE=", "MYSQL_USER=", "ORIGIN_BASE_URL=", "JWT_SECRET=", "PORT="]) {
    assert(!env.includes(forbidden), `static live env template contains obsolete runtime setting: ${forbidden}`);
  }
}

for (const obsolete of ["server", "worker", "docker-compose.yml"]) {
  assert(!exists(obsolete), `obsolete API/VPS artifact must not return to live repo: ${obsolete}`);
}

if (errors.length) {
  console.error("Integration audit: FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Integration audit: PASS");
console.log("Routes, publication guard, intake contract, static env and bundled product images are coherent.");
