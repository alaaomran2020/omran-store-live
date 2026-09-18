import { readdir, mkdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import sharp from "sharp";

const ROOT = "public/products/processed";
const WIDTHS = [320, 640, 960];
const VARIANT_RE = /-(320|640|960)\.webp$/i;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".webp" && !VARIANT_RE.test(entry.name)) files.push(full);
  }
  return files;
}

async function needsWrite(source, target) {
  try {
    const [sourceStat, targetStat] = await Promise.all([stat(source), stat(target)]);
    return sourceStat.mtimeMs > targetStat.mtimeMs;
  } catch {
    return true;
  }
}

async function main() {
  const sources = await walk(ROOT);
  let written = 0;
  for (const source of sources) {
    const metadata = await sharp(source).metadata();
    if (!metadata.width) continue;
    for (const width of WIDTHS) {
      if (metadata.width <= width) continue;
      const target = source.replace(/\.webp$/i, `-${width}.webp`);
      if (!await needsWrite(source, target)) continue;
      await mkdir(dirname(target), { recursive: true });
      await sharp(source)
        .resize({ width, withoutEnlargement: true, fit: "inside" })
        .webp({ quality: 82, effort: 4 })
        .toFile(target);
      written += 1;
    }
  }
  console.log(`Responsive image variants: ${written} written from ${sources.length} source images.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
