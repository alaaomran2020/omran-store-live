import fs from "node:fs";
import path from "node:path";

export function assertAdminInventoryAcceptance(payload, adminJson) {
  if (payload.lineage_status !== "VERIFIED") throw new Error("PAYLOAD_NOT_VERIFIED");
  const rows = Array.isArray(adminJson) ? adminJson : (adminJson?.data ?? []);
  const row = rows.find((item) => item?.productId === payload.canonical_product_id || item?.product_id === payload.canonical_product_id);
  if (!row) throw new Error("ADMIN_PRODUCT_NOT_FOUND");
  const onHand = Number(row.onHandQty ?? row.on_hand_qty);
  if (!Number.isFinite(onHand)) throw new Error("ADMIN_ON_HAND_INVALID");
  if (onHand < Number(payload.qty)) throw new Error(`ADMIN_QTY_MISMATCH: expected at least ${payload.qty}, got ${onHand}`);
  return { productId: payload.canonical_product_id, onHandQty: onHand, accepted: true };
}

function main() {
  const payloadPath = process.argv[2];
  const adminPath = process.argv[3];
  if (!payloadPath || !adminPath) throw new Error("USAGE: node assert-admin-inventory.mjs <verified.json> <admin-inventory.json>");
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  const admin = JSON.parse(fs.readFileSync(adminPath, "utf8"));
  process.stdout.write(`${JSON.stringify(assertAdminInventoryAcceptance(payload, admin), null, 2)}\n`);
}

if (process.argv[1] && path.basename(process.argv[1]) === "assert-admin-inventory.mjs") {
  try { main(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}