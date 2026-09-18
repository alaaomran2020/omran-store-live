import test from "node:test";
import assert from "node:assert/strict";
import { verifiedPayloadToSql } from "./verified-payload-to-sql.mjs";

const base = {
  candidate_id: "EGYPT-20260514-16-POP-PDF-0316098ECE",
  canonical_product_id: "POP-PDF-0316098ECE",
  source_transaction_id: "H16",
  source_detail_id: "D1603",
  source_item_id: "I77",
  source_item_package_id: "IP77",
  store_id: "S1",
  color_id: "000",
  transaction_type: 1,
  transaction_date: "2026-05-14",
  qty: 2,
  qty_source: "TRANS_DETAILS_QTY",
  lineage_status: "VERIFIED",
};

test("generates a single verified staging insert", () => {
  const sql = verifiedPayloadToSql(base);
  assert.match(sql, /INSERT INTO egypt_system_inventory_stage/);
  assert.match(sql, /TRANS_DETAILS_QTY/);
  assert.match(sql, /'VERIFIED'/);
  assert.match(sql, /POP-PDF-0316098ECE/);
});

test("rejects unverified payloads", () => {
  assert.throws(() => verifiedPayloadToSql({...base, lineage_status:"UNVERIFIED"}), /PAYLOAD_NOT_VERIFIED/);
});

test("rejects unsupported quantity sources", () => {
  assert.throws(() => verifiedPayloadToSql({...base, qty_source:"RPTTRANSACTIONS_QTY"}), /QTY_SOURCE_NOT_ALLOWED/);
});