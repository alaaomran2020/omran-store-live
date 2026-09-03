#!/usr/bin/env node
/**
 * OMRAN TOYS — Product Image Processing (Stage 7)
 *
 * PRODUCT FIDELITY = CRITICAL. معالجة محافظة فقط:
 *   - EXIF auto-orient (rotate)
 *   - مربع 1:1 بدون قص (canvas أبيض عند الحاجة) — لا crop للمنتج
 *   - بدون upscale: الارتفاع/العرض النهائي ≤ min(1600, جانب المصدر)
 *   - لا normalize ولا sharpen ولا إزالة خلفية ولا أي خطوة توليدية
 *   - WebP quality 82
 *
 * مناهض للاختلاق (anti-fabrication):
 *   - لا يُعالج أي صورة بدون سجل موثق في automation/product-metadata.json
 *   - لا يُطلق اسم/وصف/سعر من هذه السكربت — البيانات من الملف الموثق فقط
 *   - qa_status في المانيفست = PENDING_VISUAL_QA دائمًا (التحقق البصري قرار بشري)
 *
 * Usage: node scripts/process-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUTPUT_DIR = "public/products/processed";
const METADATA_FILE = "automation/product-metadata.json";
const MANIFEST_FILE = "automation/process-manifest.json";

/** dHash 64-bit بسيط (9×8 grayscale) للتوثيق وكشف التكرار. */
async function dhash64(file) {
  const { data } = await sharp(file)
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let h = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      h += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return h;
}

async function processImage(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error(`invalid_dimensions ${w}x${h}`);

  // بدون upscale: الهدف = أصغر جبين بين 1600 وأكبر جانب في المصدر
  const target = Math.min(1600, Math.max(w, h));
  const square = w === h;

  if (square) {
    await sharp(inputPath)
      .rotate()
      .resize(target, target, { withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toFile(outputPath);
  } else {
    // fit inside square (لا قص) ثم توسيط على كanvas أبيض
    const resized = await sharp(inputPath)
      .rotate()
      .resize(target, target, {
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .toBuffer();
    await sharp(resized)
      .resize(target, target, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toFile(outputPath);
  }

  const outMeta = await sharp(outputPath).metadata();
  return { inWidth: w, inHeight: h, outWidth: outMeta.width, outHeight: outMeta.height };
}

async function main() {
  if (!fs.existsSync(METADATA_FILE)) {
    console.error(`Missing ${METADATA_FILE} — لا بيانات موثقة؛ لا معالجة بلا سجل.`);
    process.exit(1);
  }
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const entries = [];
  for (const product of metadata.products) {
    const raws = Array.isArray(product.raw_images) ? product.raw_images : [];
    const outName = product.processed_image
      ? path.basename(String(product.processed_image))
      : null;
    if (raws.length === 0 || !outName) {
      console.log(`SKIP ${product.id} (${product.name}) — بلا صور خام/مخرجات محددة (لا اختلاق)`);
      continue;
    }
    const primary = path.resolve(raws[0]);
    if (!fs.existsSync(primary)) {
      console.error(`MISSING RAW ${primary} for ${product.id} — FAIL لهذا المنتج فقط، نستمر بالبقية`);
      entries.push({
        product_id: product.id,
        candidate_product: product.name,
        status: "FAILED",
        error: `raw_missing:${primary}`,
      });
      continue;
    }

    // توثيق تكرار الصور الخام للمنتج الواحد (لا ينشر المنتج مرتين)
    const rawHashes = [];
    for (const r of raws) {
      const rp = path.resolve(r);
      if (fs.existsSync(rp)) rawHashes.push({ file: r, dhash: await dhash64(rp) });
    }

    const outPath = path.join(OUTPUT_DIR, outName);
    try {
      const dims = await processImage(primary, outPath);
      const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.log(
        `PROCESSED ${product.id} (${product.name}): ${dims.inWidth}x${dims.inHeight} -> ${dims.outWidth}x${dims.outHeight} ${sizeKb}KB [no-crop, no-upscale, no-generative]`
      );
      entries.push({
        product_id: product.id,
        candidate_product: product.name,
        primary_raw: primary,
        raw_hashes: rawHashes,
        input_dimensions: `${dims.inWidth}x${dims.inHeight}`,
        output_dimensions: `${dims.outWidth}x${dims.outHeight}`,
        output_file: `public/products/processed/${outName}`,
        public_url: product.processed_image,
        size_kb: sizeKb,
        transform: "exif-rotate + square-canvas(white) + webp q82 — بدون قص/upscale/توليد",
        qa_status: "PENDING_VISUAL_QA",
        status: "OK",
      });
    } catch (e) {
      console.error(`FAILED ${product.id}: ${e.message}`);
      entries.push({ product_id: product.id, candidate_product: product.name, status: "FAILED", error: String(e) });
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    fidelity_policy: "conservative-only: exif-rotate, square canvas (white), no crop, no upscale, no generative steps",
    note: "PENDING_VISUAL_QA = السكربت لا يصدر حكمًا بصريًا؛ المالك/الفريق يراجع المخرجات قبل النشر.",
    entries,
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nManifest written to ${MANIFEST_FILE}`);
  const ok = entries.filter(e => e.status === "OK").length;
  const failed = entries.filter(e => e.status === "FAILED").length;
  console.log(`Done: ${ok} processed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
