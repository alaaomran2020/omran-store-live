/**
 * OMRAN private staff portal — standalone Cloudflare Worker.
 * Never included in the two public storefront bundles.
 * Every route verifies Access RS256 JWT + D1 staff status (fail closed).
 */
const HOST = "staff.digital-execution.cc";
const ROLES = Object.freeze({
  OWNER:"مالك",ADMIN:"مدير تشغيل",SALES_WAREHOUSE_MANAGER:"مدير المبيعات والمخزن",
  SALES_MANAGER:"مدير المبيعات",CASHIER:"كاشير",CATALOG_MANAGER:"مسؤول الكتالوج",
  INVENTORY_STAFF:"موظف مخزون",CONTENT_EDITOR:"محرر محتوى",VIEWER:"مشاهد"
});
const WORK = Object.freeze({
  OWNER:["إدارة الموظفين","الإشراف على المبيعات","متابعة المخزن","مراجعة التشغيل"],
  SALES_WAREHOUSE_MANAGER:["متابعة المبيعات","إدارة المخزن","مراجعة الأصناف","تقارير التشغيل"],
  SALES_MANAGER:["متابعة المبيعات","متابعة العملاء","تقارير المبيعات"],
  CASHIER:["المنتجات","التحقق من التوفر","تجهيز عمليات الكاشير"],
  ADMIN:["مراجعة التشغيل","المبيعات","المخزن"],
  CATALOG_MANAGER:["المنتجات","التصنيفات","مراجعة الجودة"],
  INVENTORY_STAFF:["مراجعة المخزون","جرد الأصناف"],
  CONTENT_EDITOR:["المحتوى التسويقي","مراجعة التصميمات"],
  VIEWER:["ملخص الحساب"]
});
const HEADERS = {
  "Cache-Control":"private, no-store, max-age=0",
  "X-Robots-Tag":"noindex, nofollow, noarchive",
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer",
  "X-Frame-Options":"DENY",
  "Cross-Origin-Resource-Policy":"same-origin"
};
const CSP="default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const enc = new TextDecoder();
function res(body,status=200,headers={}) {
  return new Response(body,{status,headers:{...HEADERS,...headers}});
}
function json(data,status=200){return res(JSON.stringify(data),status,{"Content-Type":"application/json; charset=utf-8"});}
function b64(input){
  if(!/^[A-Za-z0-9_-]+$/.test(input) || input.length>16000)throw Error("bad-base64");
  const s=input.replace(/-/g,"+").replace(/_/g,"/");
  return Uint8Array.from(atob(s.padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
}
async function verifiedEmail(request,env){
  const jwt=request.headers.get("Cf-Access-Jwt-Assertion");
  if(!jwt || jwt.length>12000 || !env.ACCESS_AUD || !env.ACCESS_TEAM)return null;
  try {
    const parts=jwt.split(".");
    if(parts.length!==3)return null;
    const head=JSON.parse(enc.decode(b64(parts[0])));
    const data=JSON.parse(enc.decode(b64(parts[1])));
    if(head.alg!=="RS256" || typeof head.kid!=="string")return null;
    const now=Math.floor(Date.now()/1000);
    const issuer=env.ACCESS_TEAM.replace(/\/$/,"");
    if(data.iss!==issuer || typeof data.exp!=="number" || data.exp<=now ||
       (typeof data.nbf==="number" && data.nbf>now+60) ||
       !(Array.isArray(data.aud)?data.aud:[data.aud]).includes(env.ACCESS_AUD) ||
       typeof data.email!=="string" || data.email.length>254)return null;
    const email=data.email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return null;
    const cert=await fetch(issuer+"/cdn-cgi/access/certs",{cf:{cacheTtl:300,cacheEverything:true}});
    if(!cert.ok)return null;
    const keys=(await cert.json()).keys;
    if(!Array.isArray(keys))return null;
    const jwk=keys.find(k=>k.kid===head.kid && k.kty==="RSA");
    if(!jwk)return null;
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,b64(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
    return valid?email:null;
  } catch {return null;}
}
async function identity(env,email) {
  if(!env.STAFF_DB)return null;
  const r=await env.STAFF_DB.prepare("SELECT id,full_name,access_email,role,status,created_at,updated_at FROM staff_accounts WHERE lower(access_email)=? LIMIT 1").bind(email).first();
  return r && r.status==="ACTIVE" && Object.hasOwn(ROLES,r.role)?r:null;
}
function record(x){return {employee_id:x.id,full_name:x.full_name,access_email:x.access_email,role:x.role,status:x.status,created_at:x.created_at,updated_at:x.updated_at};}
const HTML=String.raw`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#0b1736"><title>بوابة فريق عمران | داخلية</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;background:#f4f7fc;color:#0f213f}button,input,select{font:inherit}button,a{cursor:pointer}a{color:inherit;text-decoration:none}
.bar{background:#0b1736;color:white;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px max(18px,calc((100vw - 1120px)/2));flex-wrap:wrap}
.brand{font-weight:900;font-size:19px}.brand small{display:block;font-weight:500;font-size:11px;color:#a7c7fd;margin-top:4px}.bar nav{display:flex;flex-wrap:wrap;gap:8px}
.bar a{border:1px solid #42638e;padding:9px 12px;border-radius:10px;font-size:13px}.bar a:hover{background:#243c67}
main{max-width:1100px;margin:30px auto;padding:0 20px}.hero{background:linear-gradient(120deg,#0b1736,#24478e);color:white;padding:30px;border-radius:22px;box-shadow:0 12px 35px #152b5430}
.hero h1{font-size:clamp(21px,3vw,30px);margin:0 0 8px}.hero p{margin:0;line-height:1.85;color:#d7e6ff}.chips{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0}.chip{border:1px solid #c7d9f0;border-radius:99px;padding:6px 11px;font-size:12px;color:#203d6c;background:white}
h2{font-size:19px;margin:26px 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
.card{background:white;border:1px solid #dde6f1;border-radius:15px;padding:20px;box-shadow:0 2px 5px #213c5910}.card h3{margin:0 0 9px;font-size:16px}.card p{font-size:13px;color:#596f88;line-height:1.8;margin:0}
.info{margin-top:20px;padding:14px 18px;border:1px solid #c7d8ee;background:#ecf3ff;border-radius:12px;font-size:13px;line-height:1.9}
table{width:100%;border-collapse:collapse;text-align:right;min-width:620px}td,th{border-bottom:1px solid #e7edf6;padding:12px 8px;font-size:13px}th{color:#526983}td small{color:#8091a6}
.tablewrap{overflow:auto}.rowactions{display:flex;gap:6px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;border:0;background:#1d4ed8;color:white;border-radius:9px;padding:10px 13px;font-size:12px;font-weight:700;min-height:40px}.btn.light{background:#eaf1ff;color:#1c418c}.btn.warn{background:#ffedd5;color:#92400e}
form{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}input,select{min-height:44px;border:1px solid #c8d6e8;border-radius:9px;padding:9px 12px;background:white;flex:1;min-width:170px}
.muted{font-size:12px;color:#61758f}.status{font-weight:700;font-size:12px}.status.ACTIVE{color:#047857}.status.INVITED{color:#b45309}.status.SUSPENDED,.status.DISABLED{color:#b91c1c}
#notice{margin:10px 0;color:#a12b2b;font-size:13px}footer{margin:35px 0;color:#8091a6;text-align:center;font-size:11px}
</style><script defer src="/app.js"></script></head><body><header class="bar"><div class="brand">شركة عمران التجارية<small>البوابة الداخلية للموظفين • Digital Execution infrastructure</small></div><nav><a href="/admin/me">مساحتي</a><a href="/admin/users" id="nav-team" hidden>الموظفون</a><a href="/admin/settings" id="nav-settings" hidden>إعدادات الأمان</a><a href="/cdn-cgi/access/logout">خروج</a></nav></header>
<main><section class="hero"><h1 id="welcome">التحقق من حسابك...</h1><p id="subtitle">جاري تحميل صلاحياتك من النظام المحمي.</p></section><div id="notice" role="status"></div><section id="view" aria-live="polite"></section></main>
<footer>بوابة خاصة • لا تظهر للعملاء • صلاحيات مرتبطة بهوية Cloudflare Access</footer></body></html>`;
const SCRIPT=String.raw`const $=id=>document.getElementById(id);
const roleNames={OWNER:"مالك",ADMIN:"مدير تشغيل",SALES_WAREHOUSE_MANAGER:"مدير المبيعات والمخزن",SALES_MANAGER:"مدير المبيعات",CASHIER:"كاشير",CATALOG_MANAGER:"مسؤول الكتالوج",INVENTORY_STAFF:"موظف مخزون",CONTENT_EDITOR:"محرر محتوى",VIEWER:"مشاهد"};
const stateNames={ACTIVE:"نشط",INVITED:"بانتظار اعتماد",SUSPENDED:"موقوف",DISABLED:"معطّل"};
function elt(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function box(parent,...children){const n=elt("div","card");children.forEach(x=>n.append(x));parent.append(n);return n}
function clear(){const v=$("view");v.replaceChildren();return v}
async function request(path,opts){const r=await fetch(path,{credentials:"same-origin",cache:"no-store",...opts});const body=await r.json().catch(()=>({error:"Invalid response"}));if(!r.ok)throw Error(body.error||"تعذّر تنفيذ العملية");return body}
function note(message){$("notice").textContent=message}
function button(label,fn,cls="btn"){const b=elt("button",cls,label);b.type="button";b.addEventListener("click",fn);return b}
function showHome(me){const v=clear();v.append(elt("h2","", "مساحتي"));const grid=elt("div","grid");v.append(grid);
  const cards={OWNER:["إدارة حسابات الفريق","المبيعات","مراجعة المخزن","إعدادات البوابة"],SALES_WAREHOUSE_MANAGER:["متابعة المبيعات","مسؤوليات المخزن","التقارير"],SALES_MANAGER:["المبيعات","العملاء","التقارير"],CASHIER:["أصناف البيع","التحقق من التوفر","تشغيل الكاشير"],ADMIN:["العمليات"],CATALOG_MANAGER:["الكتالوج"],INVENTORY_STAFF:["المخزون"],CONTENT_EDITOR:["المحتوى"],VIEWER:["عرض المعلومات"]};
  for(const label of(cards[me.role]||cards.VIEWER)){box(grid,elt("h3","",label),elt("p","","قسم خاص بوظيفتك. أي عمليات مالية أو تغييرات مخزون تحتاج ربط النظام التشغيلي المعتمد."))}
  v.append(elt("p","info","هذه مساحة خاصة بك؛ لا يمكن فتح بيانات زميل أو تغيير صلاحيات موظف إلا بإذن المالك. المحتوى التشغيلي غير المتصل لا يعرض أرقامًا وهمية."));
}
function renderEmployeeRow(tbody,p){const tr=elt("tr");const a=elt("a","",p.full_name);a.href="/admin/users/"+encodeURIComponent(p.employee_id);const td1=elt("td");td1.append(a,elt("small","",p.access_email?" • بريد مسجل":" • بدون بريد"));
  tr.append(td1,elt("td","",roleNames[p.role]||"غير معروف"));const status=elt("span","status "+p.status,stateNames[p.status]||"غير معروف");const td3=elt("td");td3.append(status);tr.append(td3);
  const actions=elt("td");const row=elt("div","rowactions");
  row.append(button("تحديد بريد",async()=>{const email=prompt("البريد الإلكتروني الخاص بالموظف:",p.access_email||"");if(email===null)return;try{await request("/api/admin/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"assign_email",id:p.employee_id,email})});note("تم حفظ البريد. لا يفتح الحساب حتى إضافته إلى سياسة Cloudflare Access، ثم اعتماده.");await showTeam()}catch(e){note(e.message)}},"btn light"));
  if(p.status!=="ACTIVE")row.append(button("تفعيل",async()=>{if(!confirm("هل تأكدت من ربط البريد بسياسة Cloudflare Access والتحقق من الشخص؟"))return;try{await request("/api/admin/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_status",id:p.employee_id,status:"ACTIVE"})});note("تم تحديث حالة الموظف، ولا يسمح له Access بالدخول قبل إضافة بريده للسياسة.");await showTeam()}catch(e){note(e.message)}}));
  if(p.status==="ACTIVE")row.append(button("إيقاف",async()=>{if(!confirm("إيقاف حساب الموظف؟"))return;try{await request("/api/admin/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_status",id:p.employee_id,status:"SUSPENDED"})});await showTeam()}catch(e){note(e.message)}},"btn warn"));
  actions.append(row);tr.append(actions);tbody.append(tr)
}
async function showTeam(){const v=clear();v.append(elt("h2","","إدارة الموظفين"));const data=await request("/api/admin/employees");const tablewrap=elt("div","card tablewrap");
  const table=elt("table");const thead=elt("thead");const h=elt("tr");for(const label of["الاسم","الدور","الحالة","إجراءات المالك"])h.append(elt("th","",label));thead.append(h);table.append(thead);const tbody=elt("tbody");data.employees.forEach(x=>renderEmployeeRow(tbody,x));table.append(tbody);tablewrap.append(table);v.append(tablewrap);
  v.append(elt("h2","","إضافة موظف جديد"));const form=elt("form");const name=elt("input");name.placeholder="اسم الموظف";name.required=true;name.maxLength=100;const mail=elt("input");mail.type="email";mail.placeholder="بريده الإلكتروني (يمكن لاحقًا)";const role=elt("select");for(const [k,v] of Object.entries(roleNames)){if(k==="OWNER"||k==="ADMIN"||k==="SALES_WAREHOUSE_MANAGER"||k==="SALES_MANAGER"||k==="CASHIER"||k==="INVENTORY_STAFF"||k==="VIEWER"){const opt=elt("option","",v);opt.value=k;role.append(opt)}}role.value="VIEWER";const submit=button("حفظ كدعوة",()=>{});submit.type="submit";form.append(name,mail,role,submit);
  form.addEventListener("submit",async event=>{event.preventDefault();try{await request("/api/admin/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",full_name:name.value,email:mail.value,role:role.value})});note("تم تسجيل الدعوة، بدون تفعيل الدخول تلقائيًا.");await showTeam()}catch(e){note(e.message)}});v.append(form);
  v.append(elt("p","info","مهم: تسجيل بريد الموظف هنا لا يضيفه تلقائيًا إلى قائمة المسموح لهم في Cloudflare Access. التفعيل يحتاج موافقة المالك وإضافة البريد إلى سياسة الوصول."));
}
async function showEmployee(id){const v=clear();const data=await request("/api/admin/employees");const p=data.employees.find(x=>x.employee_id===id);v.append(elt("h2","",p?p.full_name:"الملف غير موجود"));if(!p)return;box(v,elt("h3","",roleNames[p.role]||p.role),elt("p","","الحالة: "+(stateNames[p.status]||p.status)),elt("p","",p.access_email||"لم يُربط بريد بعد"),elt("p","","ملف مستقل للموظف — يستطيع صاحب الحساب رؤية مساحته فقط عبر هويته المؤكدة."));}
function showSettings(me){const v=clear();v.append(elt("h2","","إعدادات الأمان"));box(v,elt("h3","","Cloudflare Access"),elt("p","","البوابة محمية بسياسة بريد مصرح به على الدومين كاملًا."));box(v,elt("h3","","حسابك"),elt("p","",me.full_name+" — "+me.access_email));v.append(elt("p","info","لا تدخل أسرار Cloudflare أو كلمات المرور في هذه الصفحة. إضافة البريد لسياسة Access تتم من لوحة Cloudflare المؤمنة، وليست من قاعدة البيانات وحدها."));}
async function main(){try{const payload=await request("/api/admin/me");const me=payload.employee;$("welcome").textContent="أهلاً، "+me.full_name;$("subtitle").textContent="المسمى الوظيفي: "+(roleNames[me.role]||me.role)+" • مساحة خاصة بموظفي شركة عمران التجارية";
  if(me.role==="OWNER"){$("nav-team").hidden=false;$("nav-settings").hidden=false;}
  const path=decodeURI(location.pathname);if(path==="/admin/users"||path==="/admin/users/")return await showTeam();if(path.startsWith("/admin/users/"))return await showEmployee(path.slice("/admin/users/".length));if(path==="/admin/settings")return showSettings(me);showHome(me);
}catch(e){$("welcome").textContent="الدخول غير متاح";$("subtitle").textContent="لا توجد جلسة موظف نشطة ومصرح بها.";note("تعذّر عرض بيانات الحساب: "+e.message);}}
main();`;
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    // No workers.dev, preview, alternate Host or app-mismatch bypass.
    if(url.hostname!==HOST || url.protocol!=="https:")return res("Not found",404,{"Content-Type":"text/plain"});
    if(!env.STAFF_DB)return res("Service unavailable",503);
    const email=await verifiedEmail(request,env);
    if(!email)return json({error:"Access identity not verified"},403);
    let me;
    try{me=await identity(env,email);}catch{return json({error:"Staff directory unavailable"},503);}
    if(!me)return json({error:"Account not active or not approved"},403);
    const path=url.pathname;
    const owner=me.role==="OWNER";
    if(path==="/api/admin/me" && request.method==="GET")return json({employee:record(me)});
    if(path==="/api/admin/employees" && request.method==="GET"){
      if(!owner)return json({error:"Owner only"},403);
      const q=await env.STAFF_DB.prepare("SELECT id,full_name,access_email,role,status,created_at,updated_at FROM staff_accounts ORDER BY CASE role WHEN 'OWNER' THEN 0 ELSE 1 END, created_at, id").all();
      return json({employees:(q.results||[]).map(record)});
    }
    if(path==="/api/admin/employees" && request.method==="POST"){
      if(!owner)return json({error:"Owner only"},403);
      if(request.headers.get("origin")!=="https://"+HOST || !request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Invalid origin or content type"},403);
      const raw=await request.text();if(raw.length>4096)return json({error:"Payload too large"},413);
      let body;try{body=JSON.parse(raw);}catch{return json({error:"Invalid JSON"},400);}
      const now=new Date().toISOString();
      try {
        if(body.action==="create"){
          const name=String(body.full_name||"").trim().slice(0,100);
          const role=String(body.role||"VIEWER");
          const mail=String(body.email||"").trim().toLowerCase();
          if(name.length<2||!Object.hasOwn(ROLES,role)||mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))return json({error:"Invalid staff record"},400);
          const id=crypto.randomUUID();
          await env.STAFF_DB.prepare("INSERT INTO staff_accounts (id,full_name,access_email,role,status,created_by,created_at,updated_at) VALUES (?,?,?,?, 'INVITED',?,?,?)").bind(id,name,mail||null,role,me.id,now,now).run();
          return json({ok:true,id,status:"INVITED"},201);
        }
        if(body.action==="assign_email"){
          const id=String(body.id||"").slice(0,100);
          const mail=String(body.email||"").trim().toLowerCase();
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||mail.length>254 || id===me.id)return json({error:"Invalid email or actor"},400);
          const target=await env.STAFF_DB.prepare("SELECT id,status FROM staff_accounts WHERE id=?").bind(id).first();
          if(!target || target.status==="ACTIVE")return json({error:"Only invited or suspended staff can change login email"},409);
          await env.STAFF_DB.prepare("UPDATE staff_accounts SET access_email=?,updated_at=? WHERE id=?").bind(mail,now,id).run();
          return json({ok:true});
        }
        if(body.action==="set_status"){
          const id=String(body.id||"").slice(0,100);
          const status=String(body.status||"");
          if(!["ACTIVE","SUSPENDED","DISABLED"].includes(status)||id===me.id)return json({error:"Invalid status or actor"},400);
          const target=await env.STAFF_DB.prepare("SELECT id,access_email,role,status FROM staff_accounts WHERE id=?").bind(id).first();
          if(!target)return json({error:"Employee not found"},404);
          if(status==="ACTIVE" && !target.access_email)return json({error:"Assign verified staff email before activation"},409);
          if(target.role==="OWNER" && status!=="ACTIVE" && target.status==="ACTIVE"){
            const count=await env.STAFF_DB.prepare("SELECT count(*) AS n FROM staff_accounts WHERE role='OWNER' AND status='ACTIVE'").first();
            if(Number(count.n)<=1)return json({error:"Cannot disable last owner"},409);
          }
          await env.STAFF_DB.prepare("UPDATE staff_accounts SET status=?,updated_at=? WHERE id=?").bind(status,now,id).run();
          return json({ok:true,status});
        }
        return json({error:"Unsupported action"},400);
      }catch{return json({error:"Could not complete employee change"},409);}
    }
    if(path.startsWith("/api/"))return json({error:"Not found"},404);
    if(!["GET","HEAD"].includes(request.method))return res("Method not allowed",405);
    if((path.startsWith("/admin/users") || path==="/admin/settings")&&!owner)return res("Forbidden",403);
    if(path==="/")return res(null,302,{Location:"/admin/me"});
    if(path==="/admin")return res(null,302,{Location:"/admin/me"});
    if(path==="/app.js")return res(SCRIPT,200,{"Content-Type":"text/javascript; charset=utf-8","Content-Security-Policy":CSP});
    if(!["/admin/me","/admin/settings","/admin/users"].includes(path) && !/^\/admin\/users\/[a-zA-Z0-9-]{1,100}$/.test(path))return res("Not found",404);
    return res(request.method==="HEAD"?null:HTML,200,{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":CSP});
  }
};