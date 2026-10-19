const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const code = html.split('// === CORE START ===')[1]?.split('// === CORE END ===')[0];
assert.ok(code, 'CSV core missing');
const context = vm.createContext({});
vm.runInContext(code + ';globalThis.core={LIVE_HEADER,parseCsvStrict,toObject,serializeRow,createReviewRow,makeExport,makeProposalsCsv,validateDrafts}', context);
const c=context.core, cols=Array.from(c.LIVE_HEADER);
function product(id='T-001',more={}){return{id,name:'مكعبات أطفال',price:'350',category:'تعليمية',description:'وصف, فيه "اقتباس"',image:'product-t-001.webp',active:'TRUE',workflow_status:'PUBLISHED',qa_status:'PASS',sku:'SKU-001',age_min:'3',age_max:'8',...more};}
function makeCsv(rows){return '\uFEFF'+cols.join(',')+'\r\n'+rows.map(p=>c.serializeRow(p,cols)).join('\r\n')+'\r\n';}
test('no network code or external assets',()=>{assert.doesNotMatch(html,/<script[^>]*\bsrc=/i);assert.doesNotMatch(html,/<link[^>]*\bhref=/i);assert.doesNotMatch(html,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(/i);});
test('exact existing 17-column schema',()=>{assert.equal(cols.length,17);assert.equal(cols[0],'id');assert.equal(cols[16],'age_max');});
test('Arabic, quotes, commas and CRLF',()=>{const d=c.parseCsvStrict(makeCsv([product('T-001',{description:'عربي\nو, "اقتباس"'})]));assert.equal(d.hasBom,true);assert.equal(d.newline,'\r\n');assert.equal(c.toObject(d.rows[0],cols).description,'عربي\nو, "اقتباس"');});
test('untouched rows round-trip exactly',()=>{const s=makeCsv([product(),product('T-002',{sku:'SKU-002'})]);assert.equal(c.makeExport(c.parseCsvStrict(s),[]),s);});
test('edited and added products export as review-only',()=>{const d=c.parseCsvStrict(makeCsv([product()]));for(const text of [c.makeExport(d,[product('T-001',{name:'تعديل'})]),c.makeProposalsCsv(d,[product('T-002',{sku:'SKU-002'})])]){const rows=c.parseCsvStrict(text).rows;const p=c.toObject(rows[rows.length-1],cols);assert.equal(p.active,'FALSE');assert.equal(p.workflow_status,'REVIEW');assert.equal(p.qa_status,'NEEDS_REVIEW');}});
test('malformed rows are rejected',()=>{assert.throws(()=>c.parseCsvStrict(cols.join(',')+'\r\n"a'),/مغلقة/);assert.throws(()=>c.parseCsvStrict(makeCsv([product()])+'only,two\n'),/الأعمدة/);});
test('duplicate IDs, SKU, negative price and Excel formulas blocked',()=>{const bad=product('T-002',{sku:'SKU-001',price:'-5',name:'=2+2'});const x=c.validateDrafts([bad,bad],[product()],cols,new Map());assert.equal(x.valid,false);assert.ok(x.errors.some(s=>s.includes('مكرر')));assert.ok(x.errors.some(s=>s.includes('Excel')));assert.ok(x.errors.some(s=>s.includes('السعر')));});
test('new remote media is blocked, unmodified original provenance retained',()=>{const url='https://drive.google.com/uc?id=1';assert.equal(c.validateDrafts([product('T-002',{sku:'SKU-002',image:url})],[],cols,new Map()).valid,false);const old=product('T-001',{image:url});assert.equal(c.validateDrafts([old],[old],cols,new Map()).valid,true);});
test('unknown columns preserved in export',()=>{const header=cols.concat(['extra_column']),p={...product(),extra_column:'ملاحظة'};const input='\uFEFF'+header.join(',')+'\n'+c.serializeRow(p,header)+'\n';const d=c.parseCsvStrict(input);const next=c.parseCsvStrict(c.makeExport(d,[{...p,name:'جديد'}]));assert.equal(c.toObject(next.rows[0],header).extra_column,'ملاحظة');});
