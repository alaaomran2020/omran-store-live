import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {handleProductIntake} from '../functions/admin/api/product-intake.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const issuer='https://test-team.cloudflareaccess.com',aud='test-aud',mail='staff@example.test';
const enc=s=>Buffer.from(JSON.stringify(s)).toString('base64url');
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',hash:'SHA-256',
  modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'key1'};
async function jwt(changes={}){
  const a=enc({alg:'RS256',kid:'key1'}),b=enc({iss:issuer,aud:[aud],email:mail,exp:Math.floor(Date.now()/1000)+3600,...changes});
  const signed=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(a+'.'+b));
  return a+'.'+b+'.'+Buffer.from(signed).toString('base64url');
}
function db(){
  const count=new Map(),records=new Map();
  return {prepare(sql){let args=[];return {bind(...a){args=a;return this},
    async first(){
      if(sql.startsWith('INSERT INTO product_intake_rate')){
        const k=args[0],v=(count.get(k)||0)+1;count.set(k,v);return {hits:v};
      }
      if(sql.startsWith('SELECT actor_email'))return records.get(args[0])||null;
      throw Error('unexpected query');
    },
    async run(){
      if(sql.startsWith('DELETE FROM product_intake_rate'))return {meta:{changes:0}};
      if(sql.startsWith('INSERT OR IGNORE INTO product_intake_requests')){
        if(records.has(args[0]))return {meta:{changes:0}};
        records.set(args[0],{actor_email:args[1],state:'PENDING'});return {meta:{changes:1}};
      }
      if(sql.startsWith('UPDATE product_intake_requests')){
        const id=args[2]||args[1],row=records.get(id);
        row.state=args[0];if(args[2])row.receipt_json=args[1];return {meta:{changes:1}};
      }
      throw Error('unexpected update');
    }
  }}};
}
const staffDb=(role='INVENTORY_STAFF',status='ACTIVE')=>({
  prepare(sql){assert.match(sql,/staff_accounts/);return {
    bind(email){assert.equal(email,mail);return this},
    async first(){return {full_name:'موظف معتمد',role,status}}
  }}
});
const env=(database=db(),role='INVENTORY_STAFF',status='ACTIVE')=>({
  INTAKE_DB:database,STAFF_DB:staffDb(role,status),
  ACCESS_TEAM_DOMAIN:issuer,ACCESS_AUD:aud,
  PRODUCT_INTAKE_WEBHOOK_URL:'https://hook.eu1.make.com/test-server-only'
});
const fakeImage=(ok=true)=>new File([new Uint8Array(ok?[137,80,78,71,13,10,26,10,0]:[1,2,3])],
  'test.png',{type:'image/png'});
function form(valid=true){
  const f=new FormData();
  const values={intake_id:'INT-20261024221304-ABCD0123',product_name_ar:'لعبة اطفال',
    category:'ألعاب',sku:'SKU1',barcode:'123',subcategory:'',brand:'',
    supplier:'',source:'Upload',source_reference:'',intake_notes:'',
    purchase_price_egp:'10',retail_price_egp:'20',wholesale_price_egp:'15'};
  for(const [k,v] of Object.entries(values))f.append(k,v);
  f.append('employee_name','اسم مزوّر');f.append('photo',fakeImage(valid));return f;
}
function req(token,options={}){
  return new Request('https://omrantoys.store/admin/api/product-intake',{
    method:'POST',body:form(options.valid!==false),
    headers:{origin:options.origin||'https://omrantoys.store',
      'cf-access-jwt-assertion':token||'','cf-connecting-ip':options.ip||'192.0.2.5'}
  });
}
function network(){
  let calls=0;
  return {get calls(){return calls},async send(url,options){
    if(String(url).endsWith('/cdn-cgi/access/certs'))return Response.json({keys:[jwk]});
    assert.equal(url,'https://hook.eu1.make.com/test-server-only');
    assert.equal(options.body.get('employee_name'),'موظف معتمد');
    calls++;return Response.json({ok:true,intake_id:options.body.get('intake_id')});
  }};
}
test('valid signature and role, server identity, needs-review and idempotency',async()=>{
  const e=env(),net=network(),signed=await jwt();
  const r=await handleProductIntake(req(signed),e,net.send);
  assert.equal(r.status,200);assert.equal((await r.json()).qa_status,'NEEDS_REVIEW');
  assert.equal((await handleProductIntake(req(signed),e,net.send)).status,200);
  assert.equal(net.calls,1);
});
test('missing, invalid, expired and bad-audience tokens fail',async()=>{
  const e=env(),net=network();
  assert.equal((await handleProductIntake(req(''),e,net.send)).status,401);
  const original=await jwt(),i=original.length-15;
  const changed=original.slice(0,i)+(original[i]==='A'?'B':'A')+original.slice(i+1);
  assert.equal((await handleProductIntake(req(changed),e,net.send)).status,401);
  assert.equal((await handleProductIntake(req(await jwt({aud:['other']})),e,net.send)).status,401);
  assert.equal((await handleProductIntake(req(await jwt({exp:1})),e,net.send)).status,401);
  assert.equal(net.calls,0);
});
test('inactive and viewer roles cannot send product',async()=>{
  const net=network(),signed=await jwt();
  assert.equal((await handleProductIntake(req(signed),env(db(),'VIEWER'),net.send)).status,403);
  assert.equal((await handleProductIntake(req(signed),env(db(),'INVENTORY_STAFF','DISABLED'),net.send)).status,403);
  assert.equal(net.calls,0);
});
test('invalid origin and missing configuration fail closed',async()=>{
  const signed=await jwt(),net=network();
  assert.equal((await handleProductIntake(req(signed,{origin:'https://evil.test'}),env(),net.send)).status,403);
  assert.equal((await handleProductIntake(req(signed),{},net.send)).status,503);
});
test('invalid PNG signature and oversized body do not reach Make',async()=>{
  const signed=await jwt(),net=network();
  assert.equal((await handleProductIntake(req(signed,{valid:false}),env(),net.send)).status,400);
  const r=req(signed);r.headers.set('content-length',String(11*1024*1024));
  assert.equal((await handleProductIntake(r,env(),net.send)).status,413);
  assert.equal(net.calls,0);
});
test('rate limit denies eleventh request per minute and IP',async()=>{
  const e=env(),net=network();
  for(let i=0;i<10;i++)assert.equal((await handleProductIntake(req(''),e,net.send)).status,401);
  const last=await handleProductIntake(req(await jwt()),e,net.send);
  assert.equal(last.status,429);assert.equal(last.headers.get('retry-after'),'60');
});
test('D1 failure returns 503 before external delivery',async()=>{
  const e=env(),net=network();e.INTAKE_DB.prepare=()=>{throw Error('offline')};
  assert.equal((await handleProductIntake(req(await jwt()),e,net.send)).status,503);
  assert.equal(net.calls,0);
});

test('staff directory outage fails closed',async()=>{
  const e=env(),net=network();
  e.STAFF_DB.prepare=()=>{throw Error('unavailable')};
  const result=await handleProductIntake(req(await jwt()),e,net.send);
  assert.equal(result.status,503);assert.equal(net.calls,0);
});
