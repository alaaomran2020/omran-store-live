#!/usr/bin/env node
/**
 * OMRAN TOYS — Production Google Sheet Upsert (Stage 11)
 * Spreadsheet: 1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc  (OMRAN TOYS Products, gid 57015348)
 * Columns: id, name, price, category, description, image, active, sort_order, product_prompt, workflow_status, created_at, updated_at, source_file_id, processed_image
 * 
 * Logic: Upsert — before adding, search existing product by id/image/product name to prevent duplicates.
 * Ready: workflow_status=PUBLISHED, active=TRUE
 * Needs review: NEEDS_REVIEW
 * 
 * Auth: Requires OAuth/Service Account with Sheets scope.
 *   Env: GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_API_KEY + OAuth token
 *   Sandbox fallback: Generates CSV for manual import via Google Sheets UI (File -> Import)
 * 
 * This script will:
 *   1. Fetch existing sheet via PRODUCTS_SHEET_URL (CSV published) to build existing set
 *   2. For each candidate from automation/pilot-sheet-upsert.csv, check duplicate via id and nameSimilarity
 *   3. If not duplicate, assign PUBLISHED and prepare row
 *   4. If credentials available, call Google Sheets API append; else output CSV and instructions
 */

import fs from "node:fs";
import path from "node:path";

const SPREADSHEET_ID = "1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc";
const SHEET_NAME = "products";
const SHEET_GID = "57015348";
const PRODUCTS_SHEET_URL = process.env.PRODUCTS_SHEET_URL || process.env.VITE_PRODUCTS_SHEET_URL || "https://docs.google.com/spreadsheets/d/e/2PACX-1vTLph4MyfmoeWcjJ3cMi-iDaM3dgt4_S57SvKr6wpQu8IbDKliduguIcvtp7E5o0ZoxN3ouNQoZo7dn/pub?gid=57015348&single=true&output=csv";

async function fetchExisting() {
  try {
    const res = await fetch(PRODUCTS_SHEET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    if (/^\s*<(?:!doctype|html)/i.test(csv)) throw new Error("Sheet not published (HTML response)");
    // simple parse: split lines, assume header
    const lines = csv.trim().split(/\r?\n/);
    const header = lines[0].split(",");
    const idIdx = header.findIndex(h => h.trim().toLowerCase() === "id");
    const nameIdx = header.findIndex(h => h.trim().toLowerCase() === "name");
    const imageIdx = header.findIndex(h => h.trim().toLowerCase() === "image");
    const existing = [];
    for (let i=1; i<lines.length; i++) {
      const cols = lines[i].split(",");
      // naive: but for check we just need id/name
      existing.push({
        id: cols[idIdx]?.trim().replace(/^"|"$/g,""),
        name: cols[nameIdx]?.trim().replace(/^"|"$/g,""),
        image: cols[imageIdx]?.trim().replace(/^"|"$/g,""),
        raw: lines[i],
      });
    }
    console.log(`Fetched existing sheet: ${existing.length} rows from ${PRODUCTS_SHEET_URL}`);
    return existing;
  } catch (e) {
    console.warn(`Could not fetch existing sheet (network blocked in sandbox or not published): ${e.message}`);
    console.warn(`Proceeding with local assumption: existing sheet has 5 sample rows (001-005). Duplicate check will be heuristic.`);
    // fallback: assume 5 sample rows from docs/sample-products.csv
    const sample = fs.readFileSync("docs/sample-products.csv", "utf-8").trim().split(/\r?\n/).slice(1);
    return sample.map(line => {
      const cols = line.split(",");
      return { id: cols[0], name: cols[1], image: cols[5], raw: line };
    });
  }
}

function normalizeArabic(str) {
  return str.toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْ]/g, "").replace(/ـ/g, "").trim();
}

function isDuplicate(candidate, existing) {
  const candNameNorm = normalizeArabic(candidate.name);
  for (const ex of existing) {
    if (ex.id === candidate.id) return { duplicate: true, reason: "same_id", match: ex };
    if (ex.name && normalizeArabic(ex.name) === candNameNorm) return { duplicate: true, reason: "same_name", match: ex };
    // For demo: also check image equality
    if (ex.image && candidate.image && ex.image.trim() === candidate.image.trim()) return { duplicate: true, reason: "same_image", match: ex };
  }
  return { duplicate: false };
}

async function trySheetsAppend(rows) {
  // Attempt real Sheets API if credentials present
  try {
    const { google } = await import("googleapis");
    const authJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!authJson) throw new Error("No GOOGLE_SERVICE_ACCOUNT_JSON");
    const credentials = JSON.parse(authJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const values = rows.map(r => [
      r.id, r.name, r.price, r.category, r.description, r.image, r.active, r.sort_order, r.product_prompt, r.workflow_status, r.created_at, r.updated_at
    ]);
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:L`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    console.log(`Sheets API append succeeded: ${res.data.updates.updatedCells} cells, range ${res.data.updates.updatedRange}`);
    return true;
  } catch (e) {
    console.warn(`Sheets API not available or no credentials: ${e.message}`);
    return false;
  }
}

async function main() {
  const pilotCsvPath = "automation/pilot-sheet-upsert.csv";
  if (!fs.existsSync(pilotCsvPath)) {
    console.error(`Pilot CSV not found: ${pilotCsvPath} — run scripts/process-images.mjs first`);
    process.exit(1);
  }
  const pilotCsv = fs.readFileSync(pilotCsvPath, "utf-8").trim().split(/\r?\n/);
  const header = pilotCsv[0].split(",");
  const rows = pilotCsv.slice(1).map(line => {
    // Parse CSV line naively but handle quoted name/description
    // For pilot we know structure: id,"name",price,category,"description",image,active,sort_order,,PUBLISHED,created,updated
    // Use regex for quoted fields
    const cols = [];
    let current = "";
    let inQuote = false;
    for (let i=0; i<line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { current += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) { cols.push(current); current=""; }
      else current += ch;
    }
    cols.push(current);
    // cols length should be 12
    return {
      id: cols[0],
      name: cols[1],
      price: cols[2],
      category: cols[3],
      description: cols[4],
      image: cols[5],
      active: cols[6],
      sort_order: cols[7],
      product_prompt: cols[8],
      workflow_status: cols[9],
      created_at: cols[10],
      updated_at: cols[11],
      raw: line,
    };
  });
  console.log(`\nPilot candidate rows: ${rows.length}`);
  rows.forEach(r => console.log(` - ${r.id} ${r.name} -> ${r.image}`));

  const existing = await fetchExisting();
  console.log(`\nExisting rows: ${existing.length}`);

  const toInsert = [];
  const duplicatesPrevented = [];
  for (const cand of rows) {
    const dup = isDuplicate(cand, existing);
    if (dup.duplicate) {
      console.log(`SKIP duplicate ${cand.id} (${dup.reason}) already exists as ${dup.match.id} ${dup.match.name}`);
      duplicatesPrevented.push({ candidate: cand.id, reason: dup.reason, existing: dup.match });
    } else {
      toInsert.push(cand);
    }
  }

  console.log(`\nUpsert plan: ${toInsert.length} to insert, ${duplicatesPrevented.length} duplicates prevented`);

  if (toInsert.length === 0) {
    console.log("Nothing to upsert.");
    return;
  }

  const appended = await trySheetsAppend(toInsert);
  if (appended) {
    console.log(`Successfully appended ${toInsert.length} rows to production sheet.`);
  } else {
    // Fallback: produce manual import CSV + instructions
    const outCsv = [header.join(","), ...toInsert.map(r=>r.raw)].join("\n");
    fs.writeFileSync("automation/sheet-manual-import.csv", outCsv, "utf-8");
    console.log(`\n[SANDBOX MODE] No Sheets API credentials/network — manual import required:`);
    console.log(`  1. Open https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${SHEET_GID}`);
    console.log(`  2. File -> Import -> Upload -> automation/sheet-manual-import.csv`);
    console.log(`  3. Choose "Append to current sheet"`);
    console.log(`  4. Verify new rows appear, then check https://omrantoys.store/api/products`);
    console.log(`\nManual CSV written to automation/sheet-manual-import.csv (${toInsert.length} rows)`);
    console.log(`\nFor GitHub Actions auto-upsert, set secret GOOGLE_SERVICE_ACCOUNT_JSON and run:`);
    console.log(`  node scripts/upsert-sheet.mjs`);
    // Also update local sample for verification
    const samplePath = "docs/sample-products.csv";
    const existingSample = fs.readFileSync(samplePath, "utf-8").trim();
    const appendedSample = existingSample + "\n" + toInsert.map(r=>r.raw).join("\n");
    fs.writeFileSync("automation/local-sheet-simulated.csv", appendedSample, "utf-8");
    console.log(`Simulated sheet (existing + pilot) written to automation/local-sheet-simulated.csv for local verification`);
  }

  // Write audit JSON
  const audit = {
    spreadsheet_id: SPREADSHEET_ID,
    sheet: SHEET_NAME,
    gid: SHEET_GID,
    generated_at: new Date().toISOString(),
    existing_count: existing.length,
    pilot_candidates: rows.length,
    to_insert: toInsert.length,
    duplicates_prevented: duplicatesPrevented.length,
    duplicates: duplicatesPrevented,
    inserted_ids: toInsert.map(r=>r.id),
    sheet_url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${SHEET_GID}`,
    api_url: PRODUCTS_SHEET_URL,
  };
  fs.writeFileSync("automation/sheet-upsert-audit.json", JSON.stringify(audit, null, 2), "utf-8");
  console.log(`Audit written to automation/sheet-upsert-audit.json`);
}

main().catch(e=>{console.error(e); process.exit(1);});
