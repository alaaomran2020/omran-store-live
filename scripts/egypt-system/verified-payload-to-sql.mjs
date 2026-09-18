import fs from "node:fs";
import path from "node:path";

function esc(value) { return String(value).replace(/'/g, "''"); }

export function verifiedPayloadToSql(payload) {
  const required = [
    "canonical_product_id","source_transaction_id","source_detail_id","source_item_id",
    "source_item_package_id","store_id","transaction_type","transaction_date","qty","qty_source","lineage_status"
  ];
  const missing = required.filter((key) => payload[key] === null || payload[key] === undefined || payload[key] === "");
  if (missing.length) throw new Error(`PAYLOAD_FIELDS_MISSING: ${missing.join(",")}`);
  if (payload.lineage_status !== "VERIFIED") throw new Error("PAYLOAD_NOT_VERIFIED");
  if (payload.qty_source !== "TRANS_DETAILS_QTY") throw new Error("QTY_SOURCE_NOT_ALLOWED");
  const color = payload.color_id ?? "000";
  const sku = payload.sku ?? "";
  return [
    "BEGIN;",
    "INSERT INTO egypt_system_inventory_stage (",
    "  source_row_id, source_transaction_id, source_detail_id, transaction_date, transaction_type,",
    "  store_id, source_item_id, source_item_package_id, source_color_id, product_id, sku, qty, qty_source, lineage_status, lineage_note",
    ") VALUES (",
    `  '${esc(payload.candidate_id)}', '${esc(payload.source_transaction_id)}', '${esc(payload.source_detail_id)}', '${esc(payload.transaction_date)}', ${Number(payload.transaction_type)},`,
    `  '${esc(payload.store_id)}', '${esc(payload.source_item_id)}', '${esc(payload.source_item_package_id)}', '${esc(color)}', '${esc(payload.canonical_product_id)}', '${esc(sku)}', ${Number(payload.qty)}, 'TRANS_DETAILS_QTY', 'VERIFIED',`,
    `  '${esc(payload.lineage_note ?? "live export verified")}'`,
    ") ON CONFLICT (source_row_id) DO NOTHING;",
    "COMMIT;",
    ""
  ].join("\n");
}

function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input) throw new Error("USAGE: node verified-payload-to-sql.mjs <verified.json> [output.sql]");
  const payload = JSON.parse(fs.readFileSync(input, "utf8"));
  const sql = verifiedPayloadToSql(payload);
  if (output) fs.writeFileSync(output, sql, "utf8"); else process.stdout.write(sql);
}

if (process.argv[1] && path.basename(process.argv[1]) === "verified-payload-to-sql.mjs") {
  try { main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}