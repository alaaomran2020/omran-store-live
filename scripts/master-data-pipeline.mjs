import { readFile } from 'node:fs/promises';

const CATALOG_PATH = 'public/catalog/products.csv';
const TEST_PRODUCT_ID = process.env.TEST_PRODUCT_ID || '';

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ''));
}

const raw = await readFile(CATALOG_PATH, 'utf8');
const rows = parseCsv(raw);
if (rows.length < 2) throw new Error('Fail-closed: catalog has no product rows');

const headers = rows[0];
const required = ['id','name','active','workflow_status','qa_status'];
for (const key of required) if (!headers.includes(key)) throw new Error(`Missing required catalog column: ${key}`);

const products = rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
const ids = products.map(p => p.id).filter(Boolean);
if (ids.length !== new Set(ids).size) throw new Error('Fail-closed: duplicate product IDs found');

const approved = products.filter(p =>
  String(p.active).toUpperCase() === 'TRUE' &&
  p.workflow_status === 'PUBLISHED' &&
  p.qa_status === 'PASS'
);
if (!approved.length) throw new Error('Fail-closed: no approved products');

if (TEST_PRODUCT_ID) {
  const p = approved.find(x => x.id === TEST_PRODUCT_ID);
  if (!p) throw new Error(`Test product is not approved or missing: ${TEST_PRODUCT_ID}`);
  if (!p.name) throw new Error(`Test product has no name: ${TEST_PRODUCT_ID}`);
  if (!p.image && !p.processed_image) throw new Error(`Test product has no image: ${TEST_PRODUCT_ID}`);
  console.log(`Single-product validation PASS: ${TEST_PRODUCT_ID} — ${p.name}`);
}

console.log(`API-free Master Data Pipeline PASS: ${approved.length}/${products.length} approved products`);
console.log('Validation is local-only and does not mutate the catalog.');
