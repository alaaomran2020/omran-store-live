import test from "node:test";
import assert from "node:assert/strict";
import { verifyFirstSkuCsv } from "./verify-first-sku.mjs";

const headers = "Header_Id,Transaction_No,Transaction_Date,Transaction_Type,Detail_Id,Item_Id,Item_Package_Id,Item_Name_AR,Store_Id,ToStore_Id,Color_Id,Qty,CalcQty,Content,Price,Item_Backage_Barcode";

test("promotes exactly matching live ids to VERIFIED", () => {
  const csv = `${headers}\nH16,16,2026-05-14,1,D1603,I77,IP77,سبورة بروجيكتور,S1,,000,2,0,1,310,123456\n`;
  const result = verifyFirstSkuCsv(csv);
  assert.equal(result.lineage_status, "VERIFIED");
  assert.equal(result.qty_source, "TRANS_DETAILS_QTY");
  assert.equal(result.source_transaction_id, "H16");
  assert.equal(result.source_detail_id, "D1603");
  assert.equal(result.source_item_package_id, "IP77");
  assert.equal(result.store_id, "S1");
});

test("fails closed when any required operational id is missing", () => {
  const csv = `${headers}\nH16,16,2026-05-14,1,,I77,IP77,سبورة بروجيكتور,S1,,000,2,0,1,310,123456\n`;
  assert.throws(() => verifyFirstSkuCsv(csv), /REQUIRED_IDS_MISSING/);
});

test("fails closed on non-exact business evidence", () => {
  const csv = `${headers}\nH16,16,2026-05-14,1,D1603,I77,IP77,سبورة بروجيكتور,S1,,000,3,0,1,310,123456\n`;
  assert.throws(() => verifyFirstSkuCsv(csv), /MATCH_COUNT_INVALID/);
});