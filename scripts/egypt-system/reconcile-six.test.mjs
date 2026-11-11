import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {reconcile} from "./reconcile-six.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
function fixture(){
 const i={products:[{intake_ref:"PHOTO-02",name_ar:"طقم مطبخ ألعاب للأطفال 47 قطعة",active:false,workflow_status:"REVIEW",qa_status:"NEEDS_REVIEW"}]};
 const q={source:"EGYPT_SYSTEM_READ_ONLY_EXPORT",status:"REVIEW_REQUIRED",export_id:"test",snapshot_timestamp_utc:new Date().toISOString(),records:[{item_id:"370",item_package_id:"91",arabic_name:"مطبخ علبه بني 46 ق"}]};
 return {i,q:{...q,queue_digest:sha(JSON.stringify(q))}};
}
test("September 46 piece kitchen never becomes verified 47 piece product",()=>{
 const {i,q}=fixture();
 const legacy=[{Item_Id:"370",Item_Package_Id:"91",Item_Name_AR:"مطبخ علبه بني 46 ق"}];
 const r=reconcile(i,q,legacy);
 assert.equal(r.counts.verified,0);
 assert.equal(r.products[0].verified_item_id,null);
 assert.equal(r.products[0].status,"HOLD_UNTIL_BARCODE_PACKAGE_AND_PHOTO_QA");
 assert.equal(r.products[0].september_legacy_candidates[0].caution,"DIFFERENT_PRINTED_PIECE_COUNT");
});
test("tampering, old exports and published intake fail closed",()=>{
 const {i,q}=fixture();
 assert.throws(()=>reconcile(i,{...q,records:[]}),/integrity/);
 const old={...q,snapshot_timestamp_utc:"2026-09-24T15:41:37Z"};
 const {queue_digest,...body}=old; old.queue_digest=sha(JSON.stringify(body));
 assert.throws(()=>reconcile(i,old),/Fresh current export/);
 assert.throws(()=>reconcile({products:[{...i.products[0],active:true}]},q),/private REVIEW/);
});
