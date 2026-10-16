/**
 * Build-only responsive copies for approved homepage category photos and public products.
 * Never rewrite the original image or change its URL. All derivatives stay same-origin.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const CATEGORY_NAMES = ["cars", "dolls", "role-play", "misc-toys", "balls", "ramadan"];
const PUBLIC_ROOT = "public";

async function newerThanTarget(source, target) {
  try {
    const [original, derivative] = await Promise.all([stat(source), stat(target)]);
    return original.mtimeMs > derivative.mtimeMs;
  } catch {
    return true;
  }
}

async function writeWebp(source, target, width) {
  if (!await newerThanTarget(source, target)) return false;
  const output = await sharp(source)
    .resize({ width, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(target);
  if (output.width < width || output.size < 500) {
    throw new Error(`Image thumbnail integrity check failed: ${target}`);
  }
  return true;
}

function publishedImages(text) {
  const match = text.match(/export const PUBLIC_PRODUCTS_SNAPSHOT: Product\[\] = (\[[\s\S]*?\]);/);
  if (!match) throw new Error("Approved public product snapshot was not found");
  const products = JSON.parse(match[1]);
  const paths = new Set();
  for (const product of products) {
    if (product.active !== true || product.workflowStatus !== "PUBLISHED" || product.qaStatus !== "PASS") {
      throw new Error("Unapproved product found in the public snapshot");
    }
    for (const image of [product.processedImage, product.image]) {
      if (typeof image !== "string") continue;
      if (!/^\/products\/processed\/[a-zA-Z0-9/_-]+\.(?:webp|jpe?g)$/.test(image)) continue;
      paths.add(image);
    }
  }
  if (!paths.size) throw new Error("No approved product media to optimize");
  return paths;
}

let created = 0;
for (const name of CATEGORY_NAMES) {
  const base = join(PUBLIC_ROOT, "categories", `category-${name}-approved`);
  const source = base + ".webp";
  const thumbnail = base + "-192.webp";
  if (await writeWebp(source, thumbnail, 192)) created++;
}

const snapshot = await readFile("client/src/lib/publicProductsSnapshot.ts", "utf8");
const approved = publishedImages(snapshot);
for (const image of approved) {
  const source = join(PUBLIC_ROOT, image.slice(1));
  const meta = await sharp(source).metadata();
  if (!meta.width) throw new Error("Unreadable approved image: " + image);
  const widths = /\.jpe?g$/i.test(image) ? [320, 480, 640, 960] : [480];
  for (const width of widths) {
    if (meta.width <= width) continue;
    const thumbnail = source.replace(/\.(?:webp|jpe?g)$/i, `-${width}.webp`);
    if (await writeWebp(source, thumbnail, width)) created++;
  }
}
console.log(`Homepage/public product thumbnails: ${created} new or updated files; originals unchanged.`);
