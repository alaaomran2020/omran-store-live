import {readFile,writeFile,stat} from "node:fs/promises";
import {resolve} from "node:path";
const root=process.cwd();
const d=resolve(root,"docs/product-intake/2026-11-10-six-products");
const source=JSON.parse(await readFile(resolve(d,"products.pending.json"),"utf8"));
const catalog=resolve(root,"public/catalog/products.csv");
const current=await readFile(catalog,"utf8");
const columns=current.split(/\r?\n/,1)[0].replace(/^\uFEFF/,"").split(",");
const expected=["id","name","price","category","description","image","active","sort_order","product_prompt","workflow_status","qa_status","source_drive_id","processed_image","review_reason","sku","age_min","age_max"];
if(columns.join(",")!==expected.join(","))throw Error("Catalog schema changed");
if(source.products.length!==6)throw Error("Source count changed");
const prior={
  "PHOTO-01":["OMR-RAW-006","OMR-RAW-007","OMR-RAW-019","OMR-RAW-029"],
  "PHOTO-02":["OMR-RAW-013","OMR-IG-KIT-46","OMR-IG-HC-104"],
  "PHOTO-03":["OMR-RAW-015"],
  "PHOTO-04":["OMR-RAW-012"],
  "PHOTO-05":[],
  "PHOTO-06":["OMR-RAW-011"]
};
const notes={
 "PHOTO-01":"افحص اختلافها عن العرائس القديمة والمقاس.",
 "PHOTO-02":"تظهر على العبوة 47 PCS و CUTLERY SET؛ لا تخلطها بمطبخ 46 قطعة.",
 "PHOTO-03":"افحص مكونات علبة سيارة الريموت وتفاصيل التشغيل.",
 "PHOTO-04":"لا تفترض بصمة إلكترونية أو قفل برمز قبل التجربة.",
 "PHOTO-05":"لا يُعرض للبيع قبل فحص تعليمات الأمان وتصنيف 14+ ومحتويات العبوة.",
 "PHOTO-06":"تحقق من عدد الطائرات وآلية الإطلاق ومحتويات العبوة."
};
function csv(v){const s=String(v??"");return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
let append="";const review=[];
for(let i=0;i<6;i++){
 const p=source.products[i],tag=String(i+1).padStart(2,"0");
 if(p.intake_ref!=="PHOTO-"+tag||p.active!==false||p.workflow_status!=="REVIEW"||p.qa_status!=="NEEDS_REVIEW")throw Error("Unsafe source record");
 const id="OMR-INTAKE-20261112-"+tag;
 const image="/products/processed/toys-20261112/photo-"+tag+"-original.webp";
 const info=await stat(resolve(root,"public"+image));if(info.size<2000)throw Error("Missing image "+image);
 const magic=await readFile(resolve(root,"public"+image));
 if(magic.toString("ascii",0,4)!=="RIFF"||magic.toString("ascii",8,12)!=="WEBP")throw Error("Bad WebP "+image);
 const existing=current.split(/\r?\n/).filter(line=>line.startsWith(id+","));
 if(existing.length>1)throw Error("Duplicate review ID: "+id);
 if(existing.length===1 && (!existing[0].includes(",FALSE,")||!existing[0].includes(",REVIEW,NEEDS_REVIEW,")))throw Error("Unsafe previously-staged review row: "+id);
 const row={id,name:p.name_ar,price:"",category:p.category_ar,description:p.description_ar,image,active:"FALSE",sort_order:String(3001+i),product_prompt:"",workflow_status:"REVIEW",qa_status:"NEEDS_REVIEW",source_drive_id:"",processed_image:image,review_reason:"للمراجعة فقط: لم يتم تأكيد عدم التكرار أو بيانات العبوة/السلامة",sku:"",age_min:"",age_max:""};
 if(existing.length===0)append+=columns.map(k=>csv(row[k])).join(",")+"\n";
 review.push({intake_ref:p.intake_ref,provisional_web_id:id,not_egypt_system_id:true,name_ar:p.name_ar,category_ar:p.category_ar,description_ar:p.description_ar,short_description_ar:p.short_description_ar,image_path:image,original_sha256:p.original_sha256,possible_inactive_duplicates:prior[p.intake_ref],qa_note:notes[p.intake_ref],item_id:null,barcode:null,sku:null,price:null,stock:null,active:false,workflow_status:"REVIEW",qa_status:"NEEDS_REVIEW",ready_for_publication:false});
}
if(append)await writeFile(catalog,current.replace(/\s*$/,"\n")+append,"utf8");
await writeFile(resolve(d,"review-catalog.json"),JSON.stringify({kind:"OMRAN_SIX_TOYS_REVIEW_ONLY",date:"2026-11-12",source_photos_drive_archive:"https://drive.google.com/file/d/1r1isqY0ffitbBlDZR36lm85PKvwTGR_b/view",egypt_system_operational:false,ready_for_publication:false,products:review},null,2)+"\n","utf8");
const cards=review.map(p=>'<article class="product"><img src="../../../public'+esc(p.image_path)+'" alt="'+esc(p.name_ar)+'"><div class="body"><small>'+esc(p.intake_ref)+' — مراجعة فقط</small><h2>'+esc(p.name_ar)+'</h2><p class="category">'+esc(p.category_ar)+'</p><p>'+esc(p.short_description_ar)+'</p><p class="warn">'+esc(p.qa_note)+'</p><p class="small">معرف موقع مؤقت: '+esc(p.provisional_web_id)+'<br>مرشحو التكرار: '+esc(p.possible_inactive_duplicates.join("، ")||"لا يوجد اسم واضح")+'</p></div></article>').join("\n");
const html=[
'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<meta name="robots" content="noindex,nofollow"><title>شركة عمران | معاينة ست ألعاب</title>',
'<style>:root{font-family:Alexandria,Cairo,"Segoe UI",Tahoma,sans-serif;color:#172033;background:#f7f9fc}*{box-sizing:border-box}body{margin:0}header{background:#123b6d;color:white;padding:28px 5%}header p{color:#e3ecf9;line-height:1.8}h1{font-size:clamp(23px,4vw,36px)}main{max-width:1200px;margin:auto;padding:24px}.alert{background:#fff;border-right:5px solid #ffc83d;padding:18px 22px;margin:12px 0 24px;border-radius:10px;line-height:1.9}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.product{background:white;border:1px solid #e4e9ef;border-radius:14px;overflow:hidden;box-shadow:0 7px 20px #123b6d08}.product img{display:block;width:100%;height:330px;object-fit:contain;background:#edf1f7}.body{padding:20px}h2{font-size:19px;line-height:1.6}.category{color:#1769e0;font-weight:bold}.body p{line-height:1.8}.warn{background:#fff8e9;color:#5b4418;padding:11px;border-radius:7px}.small,small{font-size:12px;color:#65758a;overflow-wrap:anywhere}@media(max-width:760px){.grid{grid-template-columns:1fr}}</style></head>',
'<body><header><h1>عمران التجارية — 6 ألعاب جديدة</h1><p>معرض مراجعة محلي على فرع التطوير فقط. صور أصلية من تصوير الشركة مع تحويل تنسيق إلى WebP دون تغيير العناصر.</p></header>',
'<main><div class="alert"><strong>غير منشور على المتجر الحالي.</strong> لا توجد أسعار أو باركود أو كميات مخزون معتمدة. راجع الأصناف القديمة المشابهة ومحتويات العبوات والسلامة قبل إتاحة المنتجات للعملاء.</div><section class="grid">',
cards,'</section></main></body></html>'
].join("\n");
await writeFile(resolve(d,"review-gallery.html"),html,"utf8");
console.log("Staged six inactive product rows, JSON QA manifest, and local six-image review gallery.");
