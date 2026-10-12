/**
 * One-time, opt-in conversion of owner-supplied Ramadan photography.
 *
 * Usage: node scripts/prepare-ramadan-assets.mjs .ramadan-source
 * Only committed WebP display copies are used by storefront builds.
 * Original images stay on Google Drive and must NEVER be committed here.
 */
import { readdir, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const input = resolve(process.argv[2] || ".ramadan-source");
const output = resolve("public/products/processed/ramadan");
const originalPattern = /^IMG-20261011-WA00(3[4-9]|[4-5]\d|6[0-9])\.jpg$/i;
const secondary = new Map([[38, 37], [46, 47], [54, 53], [67, 65]]);
const SOURCE_COUNT = 36;

const originals = (await readdir(input)).filter(name => originalPattern.test(name)).sort();
if (originals.length !== SOURCE_COUNT) {
  throw new Error(`Ramadan image intake incomplete: got ${originals.length} originals; need ${SOURCE_COUNT}`);
}
await mkdir(output, { recursive: true });
const exported = [];
for (const name of originals) {
  const imageNo = Number(name.match(originalPattern)[1]);
  const id = secondary.get(imageNo) || imageNo;
  const isSecondary = secondary.has(imageNo);
  let pipeline = sharp(join(input, name)).rotate();
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height || meta.width < 600 || meta.height < 600) {
    throw new Error(`Insufficient image resolution: ${name}`);
  }
  // Visible phone-watermark areas are on empty background below the actual products.
  if ([47, 50].includes(imageNo)) {
    pipeline = pipeline.extract({
      left: 0, top: 0, width: meta.width, height: Math.floor(meta.height * 0.943),
    });
  } else if (imageNo === 43) {
    // Trim studio lighting equipment visible beyond the curtain display.
    const inset = Math.floor(meta.width * 0.07);
    pipeline = pipeline.extract({
      left: inset, top: 0, width: meta.width - 2 * inset, height: meta.height,
    });
  }
  const suffix = isSecondary ? "alt-1" : "main";
  const outputName = `ramadan-${String(id).padStart(4, "0")}-${suffix}.webp`;
  const target = join(output, outputName);
  const info = await pipeline
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toFile(target);
  if (info.size < 10_000 || info.width < 400) {
    throw new Error(`Output did not pass basic integrity: ${target}`);
  }
  exported.push({ imageNo, productNo: id, outputName, ...{ width: info.width, height: info.height, bytes: info.size } });
}
const mainCount = exported.filter(x => x.outputName.endsWith("-main.webp")).length;
if (mainCount !== 32 || exported.length !== SOURCE_COUNT) {
  throw new Error(`Expected 32 main photos + 4 detail photos; got ${mainCount} + ${exported.length - mainCount}`);
}
console.log(`Ramadan media approved for catalog staging: ${mainCount} products / ${exported.length} WebP photos`);
for (const x of exported) console.log(`${x.outputName}\t${x.width}x${x.height}\t${x.bytes} bytes`);
