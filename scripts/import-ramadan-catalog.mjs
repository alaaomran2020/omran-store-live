/**
 * Assemble the owner-approved D1 Ramadan records into the repository-controlled
 * snapshot catalog. No public runtime API or Drive dependency is introduced.
 *
 * One-time command:
 *   node scripts/import-ramadan-catalog.mjs .ramadan-source/products.json
 * The JSON is a private working copy from D1; do not commit that file.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const inputPath = resolve(process.argv[2] || ".ramadan-source/products.json");
const csvPath = resolve("public/catalog/products.csv");
const records = JSON.parse((await readFile(inputPath, "utf8")).replace(/^\uFEFF/, ""));
if (!Array.isArray(records) || records.length !== 36) {
  throw new Error("Expected exactly 36 verified media rows from D1");
}

const groups = new Map();
for (const record of records) {
  if (!/^OMR-RAM-00\d{2}$/.test(record.product_id)) throw new Error("Unexpected product ID");
  if (!/^IMG-20261011-WA00\d{2}\.jpg$/.test(record.source_filename)) throw new Error("Unexpected original");
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(record.drive_file_id)) throw new Error("Missing Drive provenance");
  if (!["رمضان"].includes(record.category_name)) throw new Error("Unexpected category");
  const group = groups.get(record.product_id) || [];
  group.push(record);
  groups.set(record.product_id, group);
}
if (groups.size !== 32) throw new Error(`Expected 32 Ramadan product groups, got ${groups.size}`);

const escapeCsv = value => {
  const s = String(value ?? "");
  return /[,\r\n"]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

const oldCsv = (await readFile(csvPath, "utf8")).replace(/^\uFEFF/, "");
if (!oldCsv.trimStart().startsWith("id,name,price,category")) {
  throw new Error("Unexpected master catalog layout");
}
const csvLines = [];
for (const [id, images] of [...groups.entries()].sort(([a],[b]) => a.localeCompare(b))) {
  const main = images.filter(i => i.is_primary === 1);
  if (main.length !== 1 || images.length > 2) throw new Error(`Ambiguous photo selection for ${id}`);
  const product = main[0];
  const ordinal = id.slice(-4);
  const imagePath = `/products/processed/ramadan/ramadan-${ordinal}-main.webp`;
  for (const photo of images) {
    const asset = resolve(`public/products/processed/ramadan/ramadan-${ordinal}-${photo.is_primary ? "main" : "alt-1"}.webp`);
    const file = await stat(asset);
    const metadata = await sharp(asset).metadata();
    if (file.size < 10_000 || metadata.format !== "webp" || !metadata.width || !metadata.height) {
      throw new Error(`Invalid local catalog image: ${asset}`);
    }
  }
  const fields = [
    id, product.name_ar, "", "ramadan-lanterns", product.description_ar,
    imagePath, "TRUE", String(1000 + Number(ordinal)), "",
    "PUBLISHED", "PASS", product.drive_file_id, imagePath, "", "", "", "",
  ];
  csvLines.push(fields.map(escapeCsv).join(","));
}
if (oldCsv.includes("OMR-RAM-0034,")) {
  throw new Error("Ramadan products already exist in the catalog; do not append duplicates");
}
await writeFile(csvPath, `${oldCsv.trimEnd()}\n${csvLines.join("\n")}\n`, "utf8");
console.log(`Appended ${csvLines.length} image-verified Ramadan products with NO price or stock claims`);
