import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = Object.freeze({
  canonicalProductId: "POP-PDF-0316098ECE",
  productNameAr: "سبورة بروجيكتور",
  transactionDate: "2026-05-14",
  reportTransactionNo: "16",
  qty: 2,
  unitCostEgp: 310,
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(value); value = "";
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value); value = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else value += ch;
  }
  if (value !== "" || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function normalizeDate(value) {
  const raw = String(value ?? "").trim();
  const compact = raw.replace(/[^0-9]/g, "");
  if (/^\d{8}$/.test(compact)) {
    if (compact.startsWith("20")) return `${compact.slice(0,4)}-${compact.slice(4,6)}-${compact.slice(6,8)}`;
    return `${compact.slice(4,8)}-${compact.slice(2,4)}-${compact.slice(0,2)}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0,10);
}

function first(obj, ...names) {
  for (const name of names) {
    const value = obj[name];
    if (value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return null;
}

export function verifyFirstSkuCsv(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error("EXPORT_EMPTY: no data rows found");
  const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  const records = rows.slice(1).map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""])));

  const candidates = records.filter((record) => {
    const name = first(record, "Item_Name_AR", "item_name_ar", "name");
    const date = normalizeDate(first(record, "Transaction_Date", "transaction_date", "date"));
    const qty = Number(first(record, "Qty", "qty"));
    const price = Number(first(record, "Price", "price", "unit_cost"));
    return name === EXPECTED.productNameAr && date === EXPECTED.transactionDate && qty === EXPECTED.qty && price === EXPECTED.unitCostEgp;
  });

  if (candidates.length !== 1) throw new Error(`MATCH_COUNT_INVALID: expected 1 exact row, found ${candidates.length}`);
  const row = candidates[0];

  const sourceTransactionId = first(row, "Header_Id", "source_transaction_id");
  const sourceDetailId = first(row, "Detail_Id", "source_detail_id");
  const itemId = first(row, "Item_Id", "source_item_id");
  const itemPackageId = first(row, "Item_Package_Id", "source_item_package_id");
  const storeId = first(row, "Store_Id", "store_id");
  const colorId = first(row, "Color_Id", "color_id") ?? "000";
  const transactionType = Number(first(row, "Transaction_Type", "transaction_type"));

  const missing = Object.entries({ sourceTransactionId, sourceDetailId, itemId, itemPackageId, storeId })
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) throw new Error(`REQUIRED_IDS_MISSING: ${missing.join(",")}`);
  if (!Number.isInteger(transactionType)) throw new Error("TRANSACTION_TYPE_INVALID");

  return {
    candidate_id: "EGYPT-20260514-16-POP-PDF-0316098ECE",
    canonical_product_id: EXPECTED.canonicalProductId,
    product_name_ar: EXPECTED.productNameAr,
    source_transaction_id: sourceTransactionId,
    source_detail_id: sourceDetailId,
    source_item_id: itemId,
    source_item_package_id: itemPackageId,
    store_id: storeId,
    color_id: colorId,
    transaction_type: transactionType,
    transaction_date: EXPECTED.transactionDate,
    qty: EXPECTED.qty,
    qty_source: "TRANS_DETAILS_QTY",
    unit_cost_egp: EXPECTED.unitCostEgp,
    lineage_status: "VERIFIED",
    lineage_note: "Exact live-export match: Trans_Details.Qty lineage and operational identifiers verified.",
  };
}

function main() {
  const input = process.argv[2];
  if (!input) throw new Error("USAGE: node verify-first-sku.mjs <export.csv> [output.json]");
  const output = process.argv[3] ?? null;
  const payload = verifyFirstSkuCsv(fs.readFileSync(input, "utf8"));
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  if (output) fs.writeFileSync(output, serialized, "utf8");
  else process.stdout.write(serialized);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try { main(); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}