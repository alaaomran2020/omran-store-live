import { createSign } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const SHEET_ID = process.env.OMRAN_SHEET_ID || '1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc';
const PRODUCTS_RANGE = `'المنتجات الرئيسية'!A1:AQ2000`;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MAX_PRODUCTS = Number(process.env.MAX_AI_PRODUCTS || 10);

const AI_KEYS = [
  'ai_product_name', 'ai_short_description', 'ai_full_description', 'ai_category',
  'ai_age_group', 'ai_seo_title', 'ai_meta_description', 'ai_alt_text',
  'ai_whatsapp_message', 'ai_social_caption', 'ai_review_notes'
];

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function googleAccessToken() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(sa.private_key, 'base64url')}`;
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
  if (!res.ok) throw new Error(`Google OAuth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function sheetsRead(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status} ${await res.text()}`);
  return (await res.json()).values || [];
}

async function sheetsWrite(token, data) {
  if (!data.length) return;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  });
  if (!res.ok) throw new Error(`Sheets write failed: ${res.status} ${await res.text()}`);
}

async function enrichWithGemini(product) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const system = `You enrich product catalog text for Omran Trading Company in Egypt, children toys and gifts only. Return strict JSON only. Never invent prices, quantities, barcode, SKU, brand, dimensions, materials, age, safety claims, or technical specifications. If age is not explicitly known, ai_age_group must be empty. Use Egyptian-market Arabic suitable for retail. WhatsApp is the primary conversion channel. Keep uncertain facts out and explain uncertainty in ai_review_notes.`;
  const prompt = {
    product_id: product.product_id,
    name_ar: product.name_ar,
    category: product.category,
    description_ar: product.description_ar,
    image_url: product.image_url,
    requested_fields: AI_KEYS,
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(prompt) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini failed for ${product.product_id}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  const out = {};
  for (const key of AI_KEYS) out[key] = typeof parsed[key] === 'string' ? parsed[key].trim() : '';
  return out;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function truthy(value) {
  return String(value || '').trim().toUpperCase() === 'TRUE';
}

const token = await googleAccessToken();
const rows = await sheetsRead(token, PRODUCTS_RANGE);
if (rows.length < 2) throw new Error('Products sheet is empty');
const headers = rows[0];
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
const get = (row, name) => row[idx[name]] ?? '';

const candidates = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const productId = get(row, 'معرف المنتج');
  if (!productId || !get(row, 'الاسم بالعربية')) continue;
  if (get(row, 'ai_product_name')) continue;
  candidates.push({
    rowNumber: i + 1,
    product_id: productId,
    name_ar: get(row, 'الاسم بالعربية'),
    category: get(row, 'التصنيف'),
    description_ar: get(row, 'الوصف بالعربية'),
    image_url: get(row, 'الصورة الرئيسية'),
  });
  if (candidates.length >= MAX_PRODUCTS) break;
}

const updates = [];
for (const product of candidates) {
  const ai = await enrichWithGemini(product);
  const values = AI_KEYS.map(k => ai[k]);
  values.push(new Date().toISOString());
  updates.push({ range: `'المنتجات الرئيسية'!AD${product.rowNumber}:AO${product.rowNumber}`, values: [values] });
  console.log(`Gemini enrichment: ${product.product_id} OK`);
}
await sheetsWrite(token, updates);

const freshRows = updates.length ? await sheetsRead(token, PRODUCTS_RANGE) : rows;
const outHeaders = ['id','name','price','category','description','image','active','sort_order','product_prompt','workflow_status','qa_status','source_drive_id','processed_image','review_reason','sku','age_min','age_max'];
const output = [outHeaders.join(',')];
let publicCount = 0;
for (let i = 1; i < freshRows.length; i++) {
  const row = freshRows[i];
  const id = get(row, 'معرف المنتج');
  if (!id) continue;
  const approved = truthy(get(row, 'نشط')) && get(row, 'حالة سير العمل') === 'PUBLISHED' && get(row, 'حالة الجودة') === 'PASS' && get(row, 'بوابة النشر') === 'PUBLIC';
  if (!approved) continue;
  const values = [
    id,
    get(row, 'الاسم بالعربية') || get(row, 'ai_product_name'),
    get(row, 'سعر البيع بالجنيه'),
    get(row, 'التصنيف') || get(row, 'ai_category'),
    get(row, 'الوصف بالعربية') || get(row, 'ai_short_description'),
    get(row, 'الصورة الرئيسية'),
    'TRUE',
    get(row, 'ترتيب العرض'),
    '',
    'PUBLISHED',
    'PASS',
    get(row, 'معرف المصدر في درايف'),
    get(row, 'الصورة الرئيسية'),
    get(row, 'سبب المراجعة'),
    get(row, 'رمز المخزون'),
    get(row, 'العمر الأدنى'),
    get(row, 'العمر الأقصى'),
  ];
  output.push(values.map(csvCell).join(','));
  publicCount++;
}
if (!publicCount) throw new Error('Fail-closed: no approved PUBLIC products found');
await writeFile('public/catalog/products.csv', `${output.join('\n')}\n`, 'utf8');
console.log(`Master Data Pipeline PASS: ${updates.length} enriched, ${publicCount} public products`);
