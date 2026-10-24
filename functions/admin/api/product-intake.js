// Server-only Cloudflare Pages Function. Protect /admin* with Cloudflare Access too.
const MAX_PHOTO = 10 * 1024 * 1024;
const MAX_BODY = MAX_PHOTO + 256 * 1024;
const encoder = new TextEncoder();
const reply = (status, data, extra={}) => new Response(JSON.stringify(data), {
  status, headers: {'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',...extra}
});
const fail = (status,code) => reply(status,{ok:false,error:code});
const email = x => String(x||'').trim().toLowerCase();
function bytes(part) {
  if (!/^[\w-]+$/.test(part)) throw Error('JWT encoding');
  const raw=atob(part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
const decoded = part => JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes(part)));
export async function verifyAccessJWT(request,env,fetcher=fetch) {
  const token=request.headers.get('cf-access-jwt-assertion')||'';
  const issuer=String(env.ACCESS_TEAM_DOMAIN||'').replace(/\/+$/,'');
  const aud=String(env.ACCESS_AUD||'');
  let url;
  try{url=new URL(issuer)}catch{return null}
  if(token.length<50||token.length>16000||url.protocol!=='https:'||
     !url.hostname.endsWith('.cloudflareaccess.com')||url.pathname!=='/'||
     url.search||url.hash||!aud)return null;
  try{
    const p=token.split('.');
    if(p.length!==3)return null;
    const h=decoded(p[0]),c=decoded(p[1]),now=Math.floor(Date.now()/1000);
    if(h?.alg!=='RS256'||typeof h.kid!=='string'||h.kid.length>128||
       c?.iss!==issuer||!(Array.isArray(c.aud)?c.aud.includes(aud):c.aud===aud)||
       !Number.isInteger(c.exp)||c.exp<=now||c.exp>now+86400||
       (c.nbf!==undefined&&(!Number.isInteger(c.nbf)||c.nbf>now))||
       (c.iat!==undefined&&(!Number.isInteger(c.iat)||c.iat>now+60))||
       typeof c.email!=='string')return null;
    const keysResponse=await fetcher(issuer+'/cdn-cgi/access/certs',
      {headers:{accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!keysResponse.ok)return null;
    const jwks=await keysResponse.json();
    const matches=Array.isArray(jwks?.keys)?jwks.keys.filter(k=>k?.kid===h.kid&&
      k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&typeof k.n==='string'&&typeof k.e==='string'):[];
    if(matches.length!==1)return null;
    const {n,e}=matches[0];
    const key=await crypto.subtle.importKey('jwk',{kty:'RSA',n,e,alg:'RS256',ext:true},
      {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(p[2]),encoder.encode(p[0]+'.'+p[1]));
    const name=email(c.email);
    return ok&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)?{email:name}:null;
  }catch{return null}
}
async function allowedStaff(name,env){
  if(!env.STAFF_DB)return null;
  const row=await env.STAFF_DB.prepare(
    "SELECT full_name,role,status FROM staff_accounts WHERE lower(access_email)=?"
  ).bind(name).first();
  if(!row)return null;
  const allowedRoles=['OWNER','ADMIN','CATALOG_MANAGER','INVENTORY_STAFF','SALES_WAREHOUSE_MANAGER'];
  return row.status==='ACTIVE'&&allowedRoles.includes(row.role)&&
    typeof row.full_name==='string'&&row.full_name.trim()&&row.full_name.length<=140
    ?row.full_name.trim():null;
}

function endpoint(env){
  try{
    const u=new URL(String(env.PRODUCT_INTAKE_WEBHOOK_URL||''));
    return u.protocol==='https:'&&/^hook\.[a-z0-9-]+\.make\.com$/.test(u.hostname)&&
      !u.username&&!u.password&&!u.hash?u.href:null;
  }catch{return null}
}
async function countRequest(db,ip){
  const minute=Math.floor(Date.now()/60000);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(ip)));
  const hash=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
  const key=minute+':'+hash;
  const row=await db.prepare('INSERT INTO product_intake_rate(key,minute,hits) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits')
    .bind(key,minute).first();
  if(minute%60===0)await db.prepare('DELETE FROM product_intake_rate WHERE minute<?')
    .bind(minute-1440).run().catch(()=>{});
  return Number(row?.hits)<=10;
}
async function parseLimited(request){
  const declared=Number(request.headers.get('content-length')||0);
  if(declared>MAX_BODY)throw Error('SIZE');
  if(!request.body)throw Error('DATA');
  const reader=request.body.getReader(),parts=[];
  let length=0;
  for(;;){
    const {done,value}=await reader.read();
    if(done)break;
    length+=value.byteLength;
    if(length>MAX_BODY){await reader.cancel().catch(()=>{});throw Error('SIZE')}
    parts.push(value);
  }
  const data=new Uint8Array(length);
  let pos=0;for(const part of parts){data.set(part,pos);pos+=part.length}
  const copy=new Request(request.url,{method:'POST',
    headers:{'content-type':request.headers.get('content-type')},body:data});
  return copy.formData();
}
function field(form,key,max,mandatory=false){
  const rows=form.getAll(key);
  if(rows.length!==1||typeof rows[0]!=='string')throw Error('DATA');
  const value=rows[0].trim();
  if(value.length>max||(mandatory&&!value)||/[\x00-\x08\x0e-\x1f]/.test(value))throw Error('DATA');
  return value;
}
function price(s){
  if(!s)return '';
  if(!/^\d{1,8}(\.\d{1,2})?$/.test(s)||Number(s)>10000000)throw Error('DATA');
  return s;
}
async function validated(form){
  const id=field(form,'intake_id',60,true);
  if(!/^INT-[0-9]{14}-[A-F0-9]{8}$/.test(id))throw Error('DATA');
  const source=field(form,'source',35,true);
  if(!['Facebook','Instagram','WhatsApp','Telegram','Upload','Camera','Sync'].includes(source))throw Error('DATA');
  const fields={
    intake_id:id,received_at:new Date().toISOString(),
    product_name_ar:field(form,'product_name_ar',180,true),
    category:field(form,'category',100,true),
    sku:field(form,'sku',80),
    barcode:field(form,'barcode',80),
    subcategory:field(form,'subcategory',100),
    brand:field(form,'brand',100),
    supplier:field(form,'supplier',140),
    purchase_price_egp:price(field(form,'purchase_price_egp',30)),
    retail_price_egp:price(field(form,'retail_price_egp',30)),
    wholesale_price_egp:price(field(form,'wholesale_price_egp',30)),
    source,
    source_reference:field(form,'source_reference',300),
    intake_notes:field(form,'intake_notes',1200)
  };
  if(form.getAll('photo').length!==1)throw Error('PHOTO');
  const file=form.get('photo');
  if(!(file instanceof File)||!file.size||file.size>MAX_PHOTO)throw Error('PHOTO');
  const mime=file.type.toLowerCase();
  if(!['image/png','image/jpeg','image/webp'].includes(mime))throw Error('PHOTO');
  const b=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const text=(a,z)=>String.fromCharCode(...b.slice(a,z));
  const ok=mime==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v):
    mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:
      text(0,4)==='RIFF'&&text(8,12)==='WEBP';
  if(!ok)throw Error('PHOTO');
  return {id,fields,file};
}
export async function handleProductIntake(request,env,fetcher=fetch) {
  if(request.method!=='POST')return fail(405,'method_not_allowed');
  if(!request.headers.get('origin')||request.headers.get('origin')!==new URL(request.url).origin)
    return fail(403,'invalid_origin');
  if(!env?.INTAKE_DB||!env.STAFF_DB||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!endpoint(env))return fail(503,'not_configured');
  try{
    const ip=(request.headers.get('cf-connecting-ip')||'unknown').slice(0,80);
    if(!await countRequest(env.INTAKE_DB,ip))
      return reply(429,{ok:false,error:'rate_limited'},{'retry-after':'60'});
  }catch{return fail(503,'security_unavailable')}
  const identity=await verifyAccessJWT(request,env,fetcher);
  if(!identity)return fail(401,'unauthenticated');
  let actor;
  try{actor=await allowedStaff(identity.email,env)}catch{return fail(503,'staff_directory_unavailable')}
  if(!actor)return fail(403,'forbidden');
  if(Number(request.headers.get('content-length')||0)>MAX_BODY)return fail(413,'too_large');
  if(!/^multipart\/form-data;\s*boundary=/.test(request.headers.get('content-type')||''))
    return fail(415,'unsupported_media_type');
  let item;
  try{item=await validated(await parseLimited(request))}
  catch(e){return fail(e.message==='SIZE'?413:400,'invalid_payload')}
  const form=new FormData();
  for(const [k,v] of Object.entries(item.fields)){
    const isText=!['intake_id','received_at','purchase_price_egp','retail_price_egp','wholesale_price_egp'].includes(k);
    form.append(k,isText&&/^[=+@-]/.test(v)?"'"+v:v);
  }
  form.append('employee_name',actor);
  form.append('photo',item.file,item.file.name||item.id+'.jpg');
  try{
    const inserted=await env.INTAKE_DB.prepare("INSERT OR IGNORE INTO product_intake_requests(intake_id,actor_email,state,created_at) VALUES(?,?,'PENDING',?)")
      .bind(item.id,identity.email,new Date().toISOString()).run();
    if(inserted.meta?.changes!==1){
      const old=await env.INTAKE_DB.prepare('SELECT actor_email,state,receipt_json FROM product_intake_requests WHERE intake_id=?').bind(item.id).first();
      if(old?.actor_email===identity.email&&old.state==='SENT'&&old.receipt_json)return reply(200,JSON.parse(old.receipt_json));
      return fail(409,'already_submitted');
    }
  }catch{return fail(503,'security_unavailable')}
  try{
    const upstream=await fetcher(endpoint(env),{method:'POST',body:form,redirect:'error',
      signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}});
    if(upstream.ok){
      const receipt=await upstream.json().catch(()=>null);
      if(receipt?.ok===true&&receipt.intake_id===item.id){
        const result={ok:true,intake_id:item.id,workflow_status:'NEEDS_REVIEW',qa_status:'NEEDS_REVIEW'};
        if(typeof receipt.drive_file_id==='string'&&receipt.drive_file_id.length<=160)result.drive_file_id=receipt.drive_file_id;
        await env.INTAKE_DB.prepare('UPDATE product_intake_requests SET state=?,receipt_json=? WHERE intake_id=?')
          .bind('SENT',JSON.stringify(result),item.id).run();
        return reply(200,result);
      }
    }
  }catch{ /* Never assume an uncertain upstream write failed. */ }
  try{await env.INTAKE_DB.prepare('UPDATE product_intake_requests SET state=? WHERE intake_id=?')
    .bind('UNKNOWN',item.id).run()}catch{}
  return fail(502,'intake_unconfirmed');
}
export function onRequest(context) {return handleProductIntake(context.request,context.env)}
