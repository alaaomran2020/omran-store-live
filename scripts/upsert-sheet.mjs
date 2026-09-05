#!/usr/bin/env node
/**
 * OMRAN TOYS — Product Sheet Upsert Planner (API-free)
 *
 * هذا السكربت لا يكتب إلى Google Sheets ولا يستخدم Service Account أو أي API key.
 * وظيفته فقط:
 * 1) قراءة الكتالوج الحالي من CSV المنشور أو snapshot محلي.
 * 2) مقارنة automation/product-metadata.json بالبيانات الحالية.
 * 3) إنشاء خطة INSERT / UPDATE / HOLD محلية للمراجعة البشرية.
 */
import fs from "node:fs";
import path from "node:path";

const PRODUCTS_SHEET_URL =
  process.env.PRODUCTS_SHEET_URL ||
  process.env.VITE_PRODUCTS_SHEET_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTLph4MyfmoeWcjJ3cMi-iDaM3dgt4_S57SvKr6wpQu8IbDKliduguIcvtp7E5o0ZoxN3ouNQoZo7dn/pub?gid=57015348&single=true&output=csv";

const PLAN_JSON = "automation/sheet-upsert-plan.json";
const PLAN_CSV = "automation/sheet-upsert-plan.csv";
const COLUMNS = [
  "id", "name", "price", "category", "description", "image", "active", "sort_order",
  "product_prompt", "workflow_status", "qa_status", "source_drive_id", "processed_image",
  "review_reason", "created_at", "updated_at"
];

function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const endField = () => { row.push(field); field = ""; };
  const endRow = () => {
    endField();
    if (row.some(cell => cell.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; continue; }
      if (ch === '"') { quoted = false; continue; }
      field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { endField(); continue; }
    if (ch === "\r") { endRow(); if (text[i + 1] === "\n") i++; continue; }
    if (ch === "\n") { endRow(); continue; }
    field += ch;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeArabic(value) {
  return String(value ?? "")
    .trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

async function fetchExistingSheet() {
  const local = process.env.SHEET_CSV_FILE;
  if (local && fs.existsSync(local)) {
    return { rows: parseCsv(fs.readFileSync(local, "utf-8")), source: `local_file:${local}` };
  }

  try {
    const response = await fetch(PRODUCTS_SHEET_URL, {
      headers: { accept: "text/csv,text/plain;q=0.9,*/*;q=0.8" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csv = await response.text();
    if (/^\s*<(?:!doctype|html)/i.test(csv)) throw new Error("sheet_not_published");
    return { rows: parseCsv(csv), source: "published_csv" };
  } catch (error) {
    console.warn(`Published CSV unavailable (${error.message}); trying local snapshot.`);
  }

  const snapshots = fs.existsSync("automation")
    ? fs.readdirSync("automation").filter(file => /^sheet-snapshot-.*\.csv$/.test(file)).sort()
    : [];
  if (!snapshots.length) throw new Error("No current sheet source available.");
  const file = path.join("automation", snapshots.at(-1));
  return { rows: parseCsv(fs.readFileSync(file, "utf-8")), source: `snapshot:${file}` };
}

function rowToMap(row, excelRow) {
  const mapped = { excelRow };
  COLUMNS.forEach((column, index) => { mapped[column] = row[index] ?? ""; });
  return mapped;
}

function buildCandidateRow(candidate) {
  const now = new Date().toISOString();
  return COLUMNS.map(column => {
    switch (column) {
      case "id": return candidate.id ?? "";
      case "name": return candidate.name ?? "";
      case "price": return candidate.price == null ? "" : String(candidate.price);
      case "category": return candidate.category ?? "";
      case "description": return candidate.description ?? "";
      case "image": return candidate.image ?? "";
      case "active": return candidate.active ? "TRUE" : "FALSE";
      case "sort_order": return candidate.sort_order == null ? "" : String(candidate.sort_order);
      case "workflow_status": return candidate.workflow_status ?? "NEEDS_REVIEW";
      case "qa_status": return candidate.qa_status ?? "NEEDS_REVIEW";
      case "source_drive_id": return candidate.source_drive_id ?? "";
      case "processed_image": return candidate.processed_image ?? "";
      case "review_reason": return candidate.needs_review_reason ?? "";
      case "created_at": return now;
      case "updated_at": return now;
      default: return "";
    }
  });
}

function makePlan(existingRows, candidates) {
  const existing = existingRows.map((row, index) => rowToMap(row, index + 2));
  const byId = new Map(existing.map(row => [String(row.id).trim(), row]));
  const actions = [];

  for (const candidate of candidates) {
    const id = String(candidate.id ?? "").trim();
    if (!id || !candidate.name) {
      actions.push({ action: "HOLD", id, name: candidate.name ?? "", reason: "missing_id_or_name" });
      continue;
    }

    if (candidate.sheet_action === "HOLD") {
      actions.push({ action: "HOLD", id, name: candidate.name, reason: candidate.needs_review_reason ?? "held_for_review" });
      continue;
    }

    const current = byId.get(id);
    if (candidate.sheet_action === "UPDATE") {
      if (!current) {
        actions.push({ action: "HOLD", id, name: candidate.name, reason: "update_target_not_found" });
        continue;
      }
      const fields = candidate.sheet_update_fields ?? [];
      const values = COLUMNS.map(column =>
        fields.includes(column) && candidate[column] != null ? String(candidate[column]) : current[column]
      );
      actions.push({ action: "UPDATE", id, name: candidate.name, row: current.excelRow, fields, values });
      continue;
    }

    const duplicate = current || existing.find(row =>
      normalizeArabic(row.name) === normalizeArabic(candidate.name) ||
      (candidate.image && String(row.image).trim() === String(candidate.image).trim())
    );
    if (duplicate) {
      actions.push({ action: "HOLD", id, name: candidate.name, reason: "duplicate_by_id_name_or_image" });
      continue;
    }

    actions.push({ action: "INSERT", id, name: candidate.name, values: buildCandidateRow(candidate) });
  }
  return actions;
}

async function main() {
  if (!fs.existsSync("automation/product-metadata.json")) {
    throw new Error("Missing automation/product-metadata.json");
  }

  const metadata = JSON.parse(fs.readFileSync("automation/product-metadata.json", "utf-8"));
  const { rows, source } = await fetchExistingSheet();
  const hasHeader = (rows[0] ?? []).some(cell => /id|name/i.test(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const actions = makePlan(dataRows, metadata.products ?? []);

  const plan = {
    mode: "API_FREE_PLAN_ONLY",
    generated_at: new Date().toISOString(),
    existing_source: source,
    writes_to_google_sheets: false,
    summary: {
      insert: actions.filter(item => item.action === "INSERT").length,
      update: actions.filter(item => item.action === "UPDATE").length,
      hold: actions.filter(item => item.action === "HOLD").length,
    },
    actions,
  };

  fs.mkdirSync("automation", { recursive: true });
  fs.writeFileSync(PLAN_JSON, JSON.stringify(plan, null, 2), "utf-8");

  const csvRows = [COLUMNS, ...actions.filter(item => item.action === "INSERT").map(item => item.values)];
  fs.writeFileSync(PLAN_CSV, csvRows.map(row => row.map(csvCell).join(",")).join("\n") + "\n", "utf-8");

  console.log(`API-free plan written to ${PLAN_JSON}`);
  console.log(`Insert-only CSV written to ${PLAN_CSV}`);
  console.log(`INSERT=${plan.summary.insert} UPDATE=${plan.summary.update} HOLD=${plan.summary.hold}`);
  console.log("No Google Sheet write was attempted.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
