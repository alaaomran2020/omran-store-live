#!/usr/bin/env node
// Fail-closed comparison only. No SQL connection or publication.
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./review-import.mjs";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const privateDir = join(root, "automation", "egypt-system", "private-review");
const sha = text => createHash("sha256").update(text).digest("hex");
function norm(text) {
 return String(text ?? "").toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,"")
   .replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه")
   .replace(/[^a-z0-9\u0621-\u064a]+/g," ").trim();
}
const stop = new Set(["العاب","اطفال","الاطفال","للاطفال","طقم","بتصميم","مجموعه","صغير","صغيره","شكل","للعب","لعبه","مع","علي","لعب","pcs","mini"]);
const parts = text => [...new Set(norm(text).split(/\s+/).filter(x=>x.length>=3&&!stop.has(x)))];
const pieceCount = text => {
 const m=norm(text).match(/\b(\d{2,3})\s*(?:قطعه|ق|pcs)/i);
 return m?Number(m[1]):null;
};
function candidates(name, rows) {
 const a=parts(name);const count=pieceCount(name);
 return rows.map(r=>{
   const title=r.arabic_name??r.Item_Name_AR??"";
   const matches=a.filter(x=>parts(title).includes(x));
   const otherCount=pieceCount(title);
   return {item_id:String(r.item_id??r.Item_Id??""),item_package_id:String(r.item_package_id??r.Item_Package_Id??""),name_ar:title,matched_keywords:matches,
    caution:count!==null&&otherCount!==null&&count!==otherCount?"DIFFERENT_PRINTED_PIECE_COUNT":"NAME_ONLY_NOT_VERIFIED"};
 }).filter(r=>r.matched_keywords.length).sort((a,b)=>b.matched_keywords.length-a.matched_keywords.length).slice(0,5);
}
export function reconcile(intake,queue,legacy=[]) {
 if(!Array.isArray(intake?.products)||!intake.products.length)throw Error("Missing photo intake");
 if(queue?.source!=="EGYPT_SYSTEM_READ_ONLY_EXPORT"||queue.status!=="REVIEW_REQUIRED"||!Array.isArray(queue.records))throw Error("Verified review queue required");
 const {queue_digest,...q}=queue;
 if(sha(JSON.stringify(q))!==queue_digest)throw Error("Queue integrity mismatch");
 const ts=Date.parse(queue.snapshot_timestamp_utc??"");
 if(!Number.isFinite(ts)||ts>Date.now()+300000||Date.now()-ts>86400000)throw Error("Fresh current export required, not September backup");
 const seen=new Set();
 const products=intake.products.map(p=>{
  if(!p.intake_ref||seen.has(p.intake_ref))throw Error("Duplicate intake reference");
  seen.add(p.intake_ref);
  if(p.active!==false||p.workflow_status!=="REVIEW"||p.qa_status!=="NEEDS_REVIEW")throw Error("Only private REVIEW intake allowed");
  return {intake_ref:p.intake_ref,name_ar:p.name_ar,status:"HOLD_UNTIL_BARCODE_PACKAGE_AND_PHOTO_QA",verified_item_id:null,verified_package_id:null,
   current_candidates:candidates(p.name_ar,queue.records),september_legacy_candidates:candidates(p.name_ar,legacy)};
 });
 return {kind:"OMRAN_SIX_PRODUCTS_READ_ONLY",status:"REVIEW_ONLY_NOT_PUBLISHED",export_id:queue.export_id,counts:{intake:products.length,verified:0,blocked:products.length},products};
}
async function main(){
 const args=process.argv.slice(2);
 const option=x=>{const i=args.indexOf(x);return i<0?null:args[i+1];};
 const queueFile=option("--queue");
 if(!queueFile)throw Error("Usage: node scripts/egypt-system/reconcile-six.mjs --queue PRIVATE_QUEUE.json [--legacy PRIVATE_LEGACY.csv]");
 const intake=JSON.parse(await readFile(join(root,"docs","product-intake","2026-11-10-six-products","products.pending.json"),"utf8"));
 const queue=JSON.parse(await readFile(resolve(queueFile),"utf8"));
 const legacyFile=option("--legacy");
 const legacy=legacyFile?parseCsv(await readFile(resolve(legacyFile),"utf8")):[];
 for(const r of legacy)if(!("Item_Id" in r)||!("Item_Package_Id" in r)||!("Item_Name_AR" in r))throw Error("Legacy CSV requires Item_Id, Item_Package_Id, Item_Name_AR");
 const output=reconcile(intake,queue,legacy);
 await mkdir(privateDir,{recursive:true});
 const target=join(privateDir,"reconcile-six-"+queue.export_id+".json");
 await writeFile(target,JSON.stringify(output,null,2)+"\n",{flag:"wx"});
 console.log(JSON.stringify({status:output.status,counts:output.counts,private_file:target}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error("SAFE BLOCK: "+e.message);process.exitCode=1;});
}
