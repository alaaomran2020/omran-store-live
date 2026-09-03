#!/usr/bin/env node
/**
 * OMRAN TOYS — Google Drive RAW Inventory (Stages 4 & 5)
 *
 * Source of Truth: https://drive.google.com/drive/folders/1Xbq8V4-9-6GRUVb5dejriQOmcR7nn7_k
 * (مجلد عام: «صور منتجات خام شركة عمران التجارية» — 32 صورة خام + مجلدا originals/processed)
 *
 * قواعد صارمة:
 *   1. لا حذف RAW من Drive أبدًا — هذا السكربت قراءة فقط.
 *   2. لا اختلاق أسماء منتجات: candidate_product تبقى null حتى يُربط الملف
 *      بمخلصة موثقة في automation/product-metadata.json (أو يدويًا بعد فحص بصري).
 *   3. كشف التكرار بصري (dHash على الملفات المنزلة فعلًا في automation/raw-downloads/،
 *      hamming ≤ 6 = نفس الصورة). لم تُنزل الملفات بعد؟ تبقى الحالة UNVERIFIED — لا ادعاء.
 *   4. المصدَّر الأساسي = فهرس حقيقي مُلتقَط 2026-09-03 (automation/raw-inventory.json).
 *      إن وُجد GOOGLE_SERVICE_ACCOUNT_JSON يُحدَّث الفهرس من Drive API v3 (قراءة فقط).
 *
 * Usage: node scripts/inventory-drive.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const FOLDER_ID = "1Xbq8V4-9-6GRUVb5dejriQOmcR7nn7_k";
const FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;
const SNAPSHOT_FILE = "automation/raw-inventory.json";
const OUTPUT_FILE = "automation/drive-inventory.json";
const DOWNLOAD_DIR = "automation/raw-downloads";
const METADATA_FILE = "automation/product-metadata.json";

// ---------------------------------------------------------------------------
// JWT (RS256) بدون تبعيات خارجية — فقط node:crypto
// ---------------------------------------------------------------------------
function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getServiceAccountToken(scopes) {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  const sa = JSON.parse(json);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingInput)
    .sign(sa.private_key);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${signingInput}.${b64url(signature)}`,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`token_http_${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchDriveFilesLive() {
  const token = await getServiceAccountToken(["https://www.googleapis.com/auth/drive.readonly"]);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}' in parents and trashed = false and mimeType contains 'image/'&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=100&key=${
      process.env.GOOGLE_DRIVE_API_KEY ?? ""
    }`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`drive_http_${res.status}`);
  const data = await res.json();
  return (data.files ?? []).map(f => ({
    source_file_id: f.id,
    source_filename: f.name,
    mimeType: f.mimeType,
    size: f.size,
    modifiedTime: f.modifiedTime,
  }));
}

// ---------------------------------------------------------------------------
// dHash — كشف تكرار بصري حقيقي على الملفات المنزلة
// ---------------------------------------------------------------------------
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

const hamming = (a, b) => a.split("").filter((c, i) => c !== b[i]).length;
const HASH_DUPLICATE_THRESHOLD = 6; // 6/64 bits — عتبة عملية لنفس الصورة/لقطة

function groupByHash(entries) {
  // entries: [{...file, dhash}] — يجمع المتشابهات؛ أول ملف في المجموعة = representative
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

/** يربط الملفات بمخلصة موثقة (إن وُجدت) — بلا اختلاق: فقط تطابق صريح لـ source_file_id/الاسم. */
function attachDocumentedMetadata(entries) {
  if (!fs.existsSync(METADATA_FILE)) return entries;
  const meta = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
  const byFile = new Map();
  for (const p of meta.products ?? []) {
    for (const r of p.raw_images ?? []) {
      const base = path.basename(r);
      byFile.set(base, p);
    }
  }
  for (const e of entries) {
    const p = byFile.get(e.source_filename);
    if (p) {
      e.candidate_product = p.name;
      e.metadata_confidence = 1.0;
      e.documented_product_id = p.id;
    }
  }
  return entries;
}

async function main() {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
  let files = snapshot.inventory.map(i => ({ ...i }));
  let source = `snapshot:${SNAPSHOT_FILE} (${snapshot.generated_at})`;

  // 1) تحديث من Drive API إن وُجدت اعتمادات
  try {
    const live = await fetchDriveFilesLive();
    if (Array.isArray(live) && live.length > 0) {
      const liveIds = new Set(live.map(f => f.source_file_id));
      const snapIds = new Set(files.map(f => f.source_file_id));
      for (const f of live) {
        const existing = files.find(x => x.source_file_id === f.source_file_id);
        if (existing) {
          existing.size = f.size;
          existing.modifiedTime = f.modifiedTime;
        } else {
          files.push({
            source_file_id: f.source_file_id,
            source_filename: f.source_filename,
            product_group: null,
            duplicate_status: "UNVERIFIED",
            visual_confidence: null,
            metadata_confidence: null,
            processing_status: "NOT_DOWNLOADED",
            qa_status: "NOT_STARTED",
            candidate_product: null,
            size: f.size,
            modifiedTime: f.modifiedTime,
          });
        }
      }
      const removed = [...snapIds].filter(id => !liveIds.has(id));
      source = "drive_api_live";
      console.log(`Drive API live: ${live.length} files (+${live.length - snapIds.size} new, ${removed.length} no longer in folder)`);
      for (const id of removed) {
        const f = files.find(x => x.source_file_id === id);
        if (f) f.removed_from_folder = true; // توثيق، لا حذف
      }
    }
  } catch (e) {
    console.warn(`Drive API غير متاح (${e.message}) — نستخدم الفهرس المُلتقَط (snapshot).`);
  }

  // 2) دمج الملفات المنزلة محليًا (إن وُجدت) + dHash + تجميع
  const downloaded = fs.existsSync(DOWNLOAD_DIR)
    ? fs
        .readdirSync(DOWNLOAD_DIR)
        .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
        .map(f => path.join(DOWNLOAD_DIR, f))
    : [];

  if (downloaded.length > 0) {
    const hashed = [];
    for (const file of downloaded) {
      const base = path.basename(file);
      let dhash;
      try {
        dhash = await dhash64(file);
      } catch (e) {
        console.warn(`dHash failed for ${base}: ${e.message}`);
        continue;
      }
      const inv = files.find(f => f.source_filename === base);
      hashed.push({
        source_file_id: inv?.source_file_id ?? `local:${base}`,
        source_filename: base,
        local_file: file,
        dhash,
        ...(inv ?? {
          product_group: null,
          duplicate_status: "UNVERIFIED",
          visual_confidence: null,
          metadata_confidence: null,
          processing_status: "NOT_DOWNLOADED",
          qa_status: "NOT_STARTED",
          candidate_product: null,
        }),
      });
    }
    const groups = groupByHash(hashed);
    console.log(`dHash groups over ${hashed.length} downloaded files: ${groups.length} (unique=${groups.filter(g => g.files.length === 1).length}, dup-groups=${groups.filter(g => g.files.length > 1).length})`);
    for (const [gi, g] of groups.entries()) {
      const groupId = `grp-${g.files[0].source_file_id}`;
      g.files.forEach((f, fi) => {
        f.product_group = groupId;
        f.duplicate_status = fi === 0 ? "unique" : "duplicate";
        f.visual_confidence =
          g.files.length === 1 ? 1.0 : Number((1 - hamming(g.hash, f.dhash) / 64).toFixed(3));
        f.processing_status = "DOWNLOADED_DEDUPLICATED";
      });
    }
    // ندمج النتائج في قائمة الفهرس الرئيسية (نفس الاسم = نفس الملف)
    const byName = new Map(files.map(f => [f.source_filename, f]));
    for (const g of groups) {
      for (const f of g.files) {
        const target = byName.get(f.source_filename) ?? f;
        Object.assign(target, {
          product_group: f.product_group,
          duplicate_status: f.duplicate_status,
          visual_confidence: f.visual_confidence,
          processing_status: f.processing_status,
          dhash: f.dhash,
          local_file: f.local_file,
        });
      }
    }
  } else {
    console.log(`No files in ${DOWNLOAD_DIR}/ — dedup بصري غير منفذ؛ الحالة تبقى UNVERIFIED (لا ادعاء).`);
  }

  files = attachDocumentedMetadata(files);

  const unique = files.filter(f => f.duplicate_status === "unique").length;
  const dups = files.filter(f => f.duplicate_status === "duplicate").length;
  const unverified = files.filter(f => f.duplicate_status === "UNVERIFIED").length;

  const output = {
    source,
    folder_url: FOLDER_URL,
    folder_name: snapshot.folder_name,
    generated_at: new Date().toISOString(),
    total_raw: files.length,
    unique_products: unverified === 0 ? unique : null, // لا رقم نهائي قبل التحقق البصري لكل الملفات
    duplicates_detected: unverified === 0 ? dups : `${dups} (+${unverified} UNVERIFIED)`,
    unverified: unverified,
    note: "RAW files never deleted from Drive. Duplicates = نفس المنتج بصريًا (dHash ≤ 6/64) — يُنشر منتج واحد لكل مجموعة.",
    inventory: files,
  };
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nInventory written to ${OUTPUT_FILE}`);
  console.log(`RAW=${output.total_raw} unique=${unique} duplicates=${dups} unverified=${unverified}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
