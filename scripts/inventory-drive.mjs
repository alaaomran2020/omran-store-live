#!/usr/bin/env node
/**
 * OMRAN TOYS — RAW Inventory Audit (API-free)
 *
 * المصدر الأساسي: automation/raw-inventory.json.
 * لا يستخدم Google Drive API أو Service Account أو أي API key.
 * عند وجود صور محلية في automation/raw-downloads/ يتم تنفيذ dHash لكشف التكرارات بصريًا.
 * لا حذف للصور الخام ولا اختلاق لأسماء المنتجات.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FOLDER_ID = "1Xbq8V4-9-6GRUVb5dejriQOmcR7nn7_k";
const FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;
const SNAPSHOT_FILE = "automation/raw-inventory.json";
const OUTPUT_FILE = "automation/drive-inventory.json";
const DOWNLOAD_DIR = "automation/raw-downloads";
const METADATA_FILE = "automation/product-metadata.json";
const HASH_DUPLICATE_THRESHOLD = 6;

async function dhash64(file) {
  const { data } = await sharp(file)
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      hash += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return hash;
}

const hamming = (a, b) => a.split("").filter((c, i) => c !== b[i]).length;

function groupByHash(entries) {
  const groups = [];
  for (const entry of entries) {
    let group = groups.find(g => hamming(g.hash, entry.dhash) <= HASH_DUPLICATE_THRESHOLD);
    if (!group) {
      group = { hash: entry.dhash, files: [] };
      groups.push(group);
    }
    group.files.push(entry);
  }
  return groups;
}

function attachDocumentedMetadata(entries) {
  if (!fs.existsSync(METADATA_FILE)) return entries;
  const meta = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
  const byFile = new Map();

  for (const product of meta.products ?? []) {
    for (const rawImage of product.raw_images ?? []) {
      byFile.set(path.basename(rawImage), product);
    }
  }

  for (const entry of entries) {
    const product = byFile.get(entry.source_filename);
    if (!product) continue;
    entry.candidate_product = product.name;
    entry.metadata_confidence = 1.0;
    entry.documented_product_id = product.id;
  }
  return entries;
}

async function main() {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    throw new Error(`Missing ${SNAPSHOT_FILE}; no API fallback is used.`);
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
  let files = (snapshot.inventory ?? []).map(item => ({ ...item }));
  const source = `snapshot:${SNAPSHOT_FILE} (${snapshot.generated_at ?? "unknown"})`;

  const downloaded = fs.existsSync(DOWNLOAD_DIR)
    ? fs.readdirSync(DOWNLOAD_DIR)
        .filter(file => /\.(jpe?g|png|webp)$/i.test(file))
        .map(file => path.join(DOWNLOAD_DIR, file))
    : [];

  if (downloaded.length > 0) {
    const hashed = [];
    for (const file of downloaded) {
      const base = path.basename(file);
      try {
        const dhash = await dhash64(file);
        const inv = files.find(item => item.source_filename === base);
        hashed.push({
          ...(inv ?? {
            source_file_id: `local:${base}`,
            source_filename: base,
            product_group: null,
            duplicate_status: "UNVERIFIED",
            visual_confidence: null,
            metadata_confidence: null,
            processing_status: "NOT_DOWNLOADED",
            qa_status: "NOT_STARTED",
            candidate_product: null,
          }),
          local_file: file,
          dhash,
        });
      } catch (error) {
        console.warn(`dHash failed for ${base}: ${error.message}`);
      }
    }

    const groups = groupByHash(hashed);
    for (const group of groups) {
      const groupId = `grp-${group.files[0].source_file_id}`;
      group.files.forEach((file, index) => {
        file.product_group = groupId;
        file.duplicate_status = index === 0 ? "unique" : "duplicate";
        file.visual_confidence = group.files.length === 1
          ? 1.0
          : Number((1 - hamming(group.hash, file.dhash) / 64).toFixed(3));
        file.processing_status = "DOWNLOADED_DEDUPLICATED";
      });
    }

    const byName = new Map(files.map(file => [file.source_filename, file]));
    for (const group of groups) {
      for (const file of group.files) {
        const target = byName.get(file.source_filename) ?? file;
        Object.assign(target, {
          product_group: file.product_group,
          duplicate_status: file.duplicate_status,
          visual_confidence: file.visual_confidence,
          processing_status: file.processing_status,
          dhash: file.dhash,
          local_file: file.local_file,
        });
        if (!byName.has(file.source_filename)) files.push(target);
      }
    }
  } else {
    console.log(`No local images in ${DOWNLOAD_DIR}/; visual dedup remains UNVERIFIED.`);
  }

  files = attachDocumentedMetadata(files);

  const unique = files.filter(file => file.duplicate_status === "unique").length;
  const duplicates = files.filter(file => file.duplicate_status === "duplicate").length;
  const unverified = files.filter(file => file.duplicate_status === "UNVERIFIED").length;

  const output = {
    source,
    mode: "API_FREE_SNAPSHOT_AND_LOCAL_FILES",
    folder_url: FOLDER_URL,
    folder_name: snapshot.folder_name,
    generated_at: new Date().toISOString(),
    total_raw: files.length,
    unique_products: unverified === 0 ? unique : null,
    duplicates_detected: unverified === 0 ? duplicates : `${duplicates} (+${unverified} UNVERIFIED)`,
    unverified,
    note: "No Google API is used. RAW files are never deleted. Visual duplicates use dHash <= 6/64 when local files are available.",
    inventory: files,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Inventory written to ${OUTPUT_FILE}`);
  console.log(`RAW=${output.total_raw} unique=${unique} duplicates=${duplicates} unverified=${unverified}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
