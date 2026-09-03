#!/usr/bin/env node
/**
 * OMRAN TOYS — Production Google Sheet UPSERT (Stage 10)
 *
 * Spreadsheet: 1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc (OMRAN TOYS Products)
 * Sheet: products (gid 57015348)
 * Columns: id, name, price, category, description, image, active, sort_order, product_prompt
 *          (+ workflow_status, created_at, updated_at تشغيلية يتجاهلها الموقع)
 *
 * منطق UPSERT الصارم (لا Blind Append):
 *   1. يقرأ الشيت الحالي (CSV المنشور مباشرةً — عام وقراءة فقط — أو ملف snapshot محلي).
 *   2. لكل مرشح من automation/product-metadata.json:
 *        - تطابق id                    → UPDATE (يُحدَّث الحقول المحددة فقط)
 *        - تطابق الاسم (بعد تطبيع عربي) → duplicate → يُتخطّى (لا تكرار)
 *        - تطابق رابط الصورة           → duplicate → يُتخطّى
 *        - وإلا                        → INSERT بالـid المُعطى
 *   3. النشر:
 *        - مع GOOGLE_SERVICE_ACCOUNT_JSON: Sheets API v4 (values.update + values.append)
 *          عبر JWT RS256 خام (بلا مكتبات خارجية).
 *        - بلا اعتمادات: يُكتب PLAN محدد (صفوف الإضافة + صفوف التحديث بأرقام صفوفها)
 *          + تعليمات يدوية خطوة-بخطوة. السكربت لا يدّعي تنفيذًا لم يحدث.
 *
 * Usage:
 *   node scripts/upsert-sheet.mjs                    # live CSV أو snapshot
 *   SHEET_CSV_FILE=automation/sheet-snapshot-2026-09-03.csv node scripts/upsert-sheet.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SPREADSHEET_ID = "1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc";
const SHEET_NAME = "products";
const SHEET_GID = "57015348";
const PRODUCTS_SHEET_URL =
  process.env.PRODUCTS_SHEET_URL ||
  process.env.VITE_PRODUCTS_SHEET_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTLph4MyfmoeWcjJ3cMi-iDaM3dgt4_S57SvKr6wpQu8IbDKliduguIcvtp7E5o0ZoxN3ouNQoZo7dn/pub?gid=57015348&single=true&output=csv";

const COLUMNS = [
  "id",
  "name",
  "price",
  "category",
  "description",
  "image",
  "active",
  "sort_order",
  "product_prompt",
  "workflow_status",
  "created_at",
  "updated_at",
];

// ---------------------------------------------------------------------------
// CSV (RFC 4180) — نفس قواعد shared/products.ts
// ---------------------------------------------------------------------------
function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some(c => c.trim() !== "")) rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      endField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      endRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function normalizeArabic(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// قراءة الشيت الحالي — لا افتراضات مختلقة
// ---------------------------------------------------------------------------
async function fetchExistingSheet() {
  // 1) ملف محلي صريح
  const local = process.env.SHEET_CSV_FILE;
  if (local && fs.existsSync(local)) {
    const rows = parseCsv(fs.readFileSync(local, "utf-8"));
    return { rows, source: `local_file:${local}` };
  }
  // 2) CSV المنشور (عام)
  try {
    const res = await fetch(PRODUCTS_SHEET_URL, {
      headers: { accept: "text/csv,text/plain;q=0.9,*/*;q=0.8" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    if (/^\s*<(?:!doctype|html)/i.test(csv)) throw new Error("sheet_not_published (HTML)");
    const rows = parseCsv(csv);
    return { rows, source: `live_published_csv:${PRODUCTS_SHEET_URL}` };
  } catch (e) {
    console.warn(`Live sheet fetch failed (${e.message})`);
  }
  // 3) أحدث snapshot موثق في المستودع
  const snaps = fs
    .readdirSync("automation")
    .filter(f => /^sheet-snapshot-.*\.csv$/.test(f))
    .sort();
  if (snaps.length > 0) {
    const file = path.join("automation", snaps[snaps.length - 1]);
    const rows = parseCsv(fs.readFileSync(file, "utf-8"));
    return { rows, source: `snapshot:${file} (قد لا يعكس أحدث تعديل)` };
  }
  throw new Error(
    "No existing sheet source available (لا live ولا snapshot) — لا نُرجع صفوفًا مختلقة؛ أعد التشغيل من بيئة وصول."
  );
}

// ---------------------------------------------------------------------------
// Sheets API v4 عبر JWT خام (بلا googleapis)
// ---------------------------------------------------------------------------
function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function sheetsApi(method, token, url, body) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/${url}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sheets_http_${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function applyViaSheetsApi(insertRows, updateOps) {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(sa.private_key);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${b64url(signature)}`,
    }).toString(),
  });
  if (!tokenRes.ok) throw new Error(`token_http_${tokenRes.status}`);
  const { access_token } = await tokenRes.json();

  const applied = [];
  for (const op of updateOps) {
    const value = await sheetsApi(
      "PUT",
      access_token,
      `values/${encodeURIComponent(`${SHEET_NAME}!A${op.row}:L${op.row}`)}`,
      { valueInputOption: "RAW", range: `${SHEET_NAME}!A${op.row}:L${op.row}`, values: [op.values] }
    );
    applied.push({ action: "update", id: op.id, row: op.row, updatedCells: value.updates?.updatedCells });
  }
  if (insertRows.length > 0) {
    const value = await sheetsApi(
      "POST",
      access_token,
      `values/${encodeURIComponent(`${SHEET_NAME}!A:L`)}`,
      { valueInputOption: "RAW", range: `${SHEET_NAME}!A:L`, insertDataOption: "INSERT_ROWS", values: insertRows }
    );
    applied.push({ action: "append", count: insertRows.length, updatedRange: value.updates?.updatedRange });
  }
  return applied;
}

// ---------------------------------------------------------------------------
// خطة الـUpsert
// ---------------------------------------------------------------------------
function rowToMap(row, index) {
  const map = {};
  COLUMNS.forEach((c, i) => {
    map[c] = row[i] ?? "";
  });
  return { excelRow: index, ...map };
}

function main_sync(existingRows, candidates) {
  const existing = existingRows.map((r, i) => rowToMap(r, i + 2)); // +2: صف العناوين + Excel 1-based
  const byId = new Map(existing.map(r => [String(r.id).trim(), r]));
  const insertRows = [];
  const updateOps = [];
  const duplicates = [];
  const held = [];

  for (const cand of candidates) {
    if (cand.sheet_action === "HOLD") {
      held.push({ id: cand.id, name: cand.name, reason: cand.needs_review_reason ?? "held" });
      continue;
    }

    if (cand.sheet_action === "UPDATE") {
      const ex = byId.get(String(cand.id).trim());
      if (!ex) {
        held.push({ id: cand.id, name: cand.name, reason: "update_target_not_found_in_sheet" });
        continue;
      }
      const fields = cand.sheet_update_fields ?? [];
      const values = COLUMNS.map(c => {
        if (fields.includes(c) && cand[c] !== undefined && cand[c] !== null) return String(cand[c]);
        return ex[c];
      });
      updateOps.push({ id: cand.id, row: ex.excelRow, values, changed: fields });
      console.log(`UPDATE ${cand.id} (row ${ex.excelRow}) fields=[${fields.join(",")}]`);
      continue;
    }

    if (cand.sheet_action === "INSERT") {
      const dup =
        byId.has(String(cand.id).trim()) ||
        existing.find(r => normalizeArabic(r.name) === normalizeArabic(cand.name)) ||
        existing.find(r => cand.image && String(r.image).trim() === String(cand.image).trim());
      if (dup) {
        duplicates.push({ candidate: cand.id, reason: "exists_by_id_or_name_or_image" });
        console.log(`SKIP duplicate ${cand.id} — exists in sheet`);
        continue;
      }
      const now = new Date().toISOString();
      const row = COLUMNS.map(c => {
        switch (c) {
          case "id":
            return cand.id;
          case "name":
            return cand.name;
          case "price":
            return cand.price === null || cand.price === undefined ? "" : String(cand.price);
          case "category":
            return cand.category ?? "";
          case "description":
            return cand.description ?? "";
          case "image":
            return cand.image ?? "";
          case "active":
            return cand.active ? "TRUE" : "FALSE";
          case "sort_order":
            return cand.sort_order === null || cand.sort_order === undefined ? "" : String(cand.sort_order);
          case "product_prompt":
            return "";
          case "workflow_status":
            return cand.workflow_status ?? (cand.active ? "PUBLISHED" : "NEEDS_REVIEW");
          case "created_at":
            return now;
          case "updated_at":
            return now;
          default:
            return "";
        }
      });
      insertRows.push(row);
      console.log(`INSERT ${cand.id} (${cand.name}) active=${cand.active} status=${cand.workflow_status ?? "PUBLISHED"}`);
    }
  }

  return { insertRows, updateOps, duplicates, held };
}

async function main() {
  if (!fs.existsSync("automation/product-metadata.json")) {
    console.error("Missing automation/product-metadata.json");
    process.exit(1);
  }
  const metadata = JSON.parse(fs.readFileSync("automation/product-metadata.json", "utf-8"));
  const candidates = metadata.products ?? [];

  const { rows: existingRows, source: existingSource } = await fetchExistingSheet();
  const hasHeader = (existingRows[0] ?? []).some(c => /id|name/i.test(c));
  const dataRows = hasHeader ? existingRows.slice(1) : existingRows;
  console.log(`Existing sheet: ${dataRows.length} rows (source: ${existingSource})`);

  const { insertRows, updateOps, duplicates, held } = main_sync(dataRows, candidates);

  const audit = {
    spreadsheet_id: SPREADSHEET_ID,
    sheet: SHEET_NAME,
    gid: SHEET_GID,
    generated_at: new Date().toISOString(),
    existing_source: existingSource,
    existing_count: dataRows.length,
    candidates: candidates.length,
    planned_inserts: insertRows.length,
    planned_updates: updateOps.length,
    duplicates_skipped: duplicates.length,
    held_for_review: held.length,
    duplicates,
    held,
    applied: false,
    mode: "PLANNED",
  };

  const hasCreds = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (insertRows.length === 0 && updateOps.length === 0) {
    console.log("\nNothing to upsert (كل المرشحين موجودون أو محجوزون).");
  } else if (hasCreds) {
    try {
      const applied = await applyViaSheetsApi(insertRows, updateOps);
      audit.applied = true;
      audit.mode = "SHEETS_API";
      audit.applied_detail = applied;
      console.log(`\nSheets API applied: ${JSON.stringify(applied)}`);
    } catch (e) {
      console.error(`Sheets API failed: ${e.message} — سنكتب الخطة اليدوية بدلًا من ذلك.`);
    }
  }

  if (!audit.applied) {
    const outInsert = path.join("automation", "sheet-upsert-plan.csv");
    const outUpdate = path.join("automation", "sheet-upsert-updates.csv");
    if (insertRows.length > 0) {
      fs.writeFileSync(
        outInsert,
        [COLUMNS.join(","), ...insertRows.map(r => r.map(csvCell).join(","))].join("\n") + "\n",
        "utf-8"
      );
    }
    if (updateOps.length > 0) {
      const header = ["excel_row", ...COLUMNS].join(",");
      const lines = updateOps.map(o =>
        [o.row, ...o.values.map(v => csvCell(v))].join(",")
      );
      fs.writeFileSync(outUpdate, [header, ...lines].join("\n") + "\n", "utf-8");
    }
    console.log("\n[PLAN MODE] لا اعتمادات Sheets API — الخطوات اليدوية:");
    if (insertRows.length > 0)
      console.log(`  1) إضافات (${insertRows.length}): automation/sheet-upsert-plan.csv`);
    if (updateOps.length > 0)
      console.log(`  ${insertRows.length > 0 ? 2 : 1}) تحديثات (${updateOps.length}): automation/sheet-upsert-updates.csv (بأرقام الصفوف)`);
    console.log(`  ثم افتح: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${SHEET_GID}`);
    console.log("  وألصق الصفوف (Insert: أسفل آخر صف — Update: استبدل الصف المُرَقَّم بالكامل).");
    console.log("  الموقع يُحدَّث تلقائيًا خلال ~5 دقائق (كاش الحافة) بدون أي Deploy.");
  }

  fs.writeFileSync("automation/sheet-upsert-audit.json", JSON.stringify(audit, null, 2), "utf-8");
  console.log(`\nAudit: automation/sheet-upsert-audit.json (mode=${audit.mode}, applied=${audit.applied})`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
