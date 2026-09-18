import test from "node:test";
import assert from "node:assert/strict";
import { assertAdminInventoryAcceptance } from "./assert-admin-inventory.mjs";
const payload={canonical_product_id:"POP-PDF-0316098ECE",qty:2,lineage_status:"VERIFIED"};
test("accepts matching admin inventory",()=>{ assert.equal(assertAdminInventoryAcceptance(payload,{data:[{productId:"POP-PDF-0316098ECE",onHandQty:2}]}).accepted,true); });
test("rejects missing product",()=>{ assert.throws(()=>assertAdminInventoryAcceptance(payload,{data:[]}),/ADMIN_PRODUCT_NOT_FOUND/); });
test("rejects insufficient quantity",()=>{ assert.throws(()=>assertAdminInventoryAcceptance(payload,{data:[{productId:"POP-PDF-0316098ECE",onHandQty:1}]}),/ADMIN_QTY_MISMATCH/); });