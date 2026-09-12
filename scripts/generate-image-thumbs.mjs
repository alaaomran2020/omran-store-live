#!/usr/bin/env node
/**
 * Generate lightweight WebP thumbnails for storefront product images.
 *
 * Why: product cards render at ~170–340px but historically requested the full
 * 1024–1200px source (66–188KB each). A 480px WebP thumbnail is ~4x smaller
 * and more than sharp enough for card density on Retina displays; the full
 * image is still requested only inside the product details dialog.
 *
 * Conventions:
 *   - Inputs : every WebP file under `public/products/` (recursively) that does
 *              not already end in `-thumb.webp`, plus `public/brand/logo.png`.
 *   - Output : `<basename>-thumb.webp` next to the source (WebP, 480px, q80);
 *              `public/brand/logo-128.png` (128px) for the 48–64px header logo.
 *   - Safety : idempotent; a thumbnail is regenerated only when it is missing
 *              or older than its source. Sources are never modified.
 *
 * Usage: pnpm images:thumbs   (node >= 20, uses the existing `sharp` devDep)
 */
import { readdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_DIR = path.join(ROOT, "public", "products");
const BRAND_DIR = path.join(ROOT, "public", "brand");
const THUMB_WIDTH = 480;
const THUMB_QUALITY = 80;

function walkWebpFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkWebpFiles(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".webp")) found.push(full);
  }
  return found;
}

function isFresh(outPath, inPath) {
  try {
    return statSync(outPath).mtimeMs >= statSync(inPath).mtimeMs;
  } catch {
    return false;
  }
}

let generated = 0;
let skipped = 0;

async function makeThumb(sourcePath) {
  if (sourcePath.endsWith("-thumb.webp")) {
    skipped += 1;
    return;
  }
  const outPath = sourcePath.replace(/\.webp$/i, "-thumb.webp");
  if (isFresh(outPath, sourcePath)) {
    skipped += 1;
    return;
  }
  await sharp(sourcePath).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: THUMB_QUALITY }).toFile(outPath);
  generated += 1;
  console.log(`  thumb  ${path.relative(ROOT, outPath)}  (${(statSync(outPath).size / 1024).toFixed(1)}KB from ${(statSync(sourcePath).size / 1024).toFixed(1)}KB)`);
}

const webpFiles = existsSync(PRODUCTS_DIR) ? walkWebpFiles(PRODUCTS_DIR) : [];
for (const file of webpFiles) await makeThumb(file);

// Header logo: displayed at 48px (mobile) / 64px (desktop) → 128px covers 2x.
const logoSource = path.join(BRAND_DIR, "logo.png");
const logoThumb = path.join(BRAND_DIR, "logo-128.png");
if (existsSync(logoSource) && !isFresh(logoThumb, logoSource)) {
  await sharp(logoSource).resize({ width: 128, height: 128, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(logoThumb);
  generated += 1;
  console.log(`  thumb  ${path.relative(ROOT, logoThumb)}  (${(statSync(logoThumb).size / 1024).toFixed(1)}KB from ${(statSync(logoSource).size / 1024).toFixed(1)}KB)`);
} else if (existsSync(logoSource)) {
  skipped += 1;
}

console.log(`\nDone: ${generated} generated, ${skipped} fresh/skipped.`);
