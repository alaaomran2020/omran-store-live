import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root=process.cwd();
const base=resolve(root,"docs/product-intake/2026-11-10-six-products");
const catalog=await readFile(resolve(root,"public/catalog/products.csv"),"utf8");
const list=JSON.parse(await readFile(resolve(base,"review-catalog.json"),"utf8"));
const original=JSON.parse(await readFile(resolve(base,"products.pending.json"),"utf8"));
const rows=catalog.split(/\r?\n/).filter(r=>r.startsWith("OMR-INTAKE-20261112-"));
const seen=new Set();

test("all six provisional review records are inactive and unique",()=>{
 assert.equal(rows.length,6);
 assert.equal(list.products.length,6);
 for(const [i,r] of rows.entries()){
   const tag=String(i+1).padStart(2,"0");
   assert.ok(r.startsWith("OMR-INTAKE-20261112-"+tag+","));
   assert.ok(r.includes(",FALSE,") && r.includes(",REVIEW,NEEDS_REVIEW,"));
   assert.ok(!r.includes(",TRUE,")&&!r.includes(",PUBLISHED,PASS,"));
   assert.ok(!seen.has(tag));
   seen.add(tag);
 }
});
test("source photographs and review labels are accounted for",()=>{
 const known=original.products.map(x=>x.original_sha256);
 assert.deepEqual(list.products.map(x=>x.original_sha256),known);
 for(const p of list.products){
   assert.equal(p.active,false);
   assert.equal(p.ready_for_publication,false);
   assert.equal(p.qa_status,"NEEDS_REVIEW");
   assert.equal(p.workflow_status,"REVIEW");
   assert.equal(p.barcode,null);
   assert.equal(p.price,null);
   assert.equal(p.stock,null);
   assert.equal(p.sku,null);
 }
});
test("six source-faithful image files are present and non-empty",async()=>{
 for(const p of list.products){
   assert.match(p.image_path,/^\/products\/processed\/toys-20261112\/photo-\d\d-original\.webp$/);
   const full=resolve(root,"public"+p.image_path);
   const data=await readFile(full);
   assert.ok((await stat(full)).size>10000);
   assert.equal(data.toString("ascii",0,4),"RIFF");
   assert.equal(data.toString("ascii",8,12),"WEBP");
 }
});
test("public customer snapshot does not include any provisional IDs",async()=>{
 const snapshot=await readFile(resolve(root,"client/src/lib/publicProductsSnapshot.ts"),"utf8");
 assert.equal(snapshot.includes("OMR-INTAKE-20261112-"),false);
});
test("review gallery is independent of customer routes",async()=>{
 const html=await readFile(resolve(base,"review-gallery.html"),"utf8");
 assert.ok(html.includes('name="robots" content="noindex,nofollow"'));
 for(const p of list.products)assert.ok(html.includes(p.image_path));
});
