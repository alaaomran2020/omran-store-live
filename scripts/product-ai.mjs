import crypto from 'node:crypto';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc';
const INTAKE_RANGE = "'إدخال منتج جديد'!A1:AE1500";
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const MAX_ROWS = Number(process.env.MAX_AI_ROWS || 10);

const REQUIRED_AI_FIELDS = [
  'ai_product_name',
  'ai_short_description',
  'ai_full_description',
  'ai_category',
  'ai_age_group',
  'ai_seo_title',
  'ai_meta_description',
  'ai_alt_text',
  'ai_whatsapp_message',
  'ai_social_caption',
  'ai_review_notes'
];

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON secret');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) throw new Error(`Google OAuth failed: ${response.status} ${await response.text()}`);
  const json = await response.json();
  return json.access_token;
}

async function sheetsGet(accessToken, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Sheets read failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function sheetsBatchUpdateValues(accessToken, data) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ valueInputOption: 'RAW', data })
  });
  if (!response.ok) throw new Error(`Sheets write failed: ${response.status} ${await response.text()}`);
  return response.json();
}

function mapRows(values) {
  const [headers = [], ...rows] = values || [];
  return rows.map((row, idx) => {
    const item = { __row: idx + 2 };
    headers.forEach((h, i) => { item[h] = row[i] ?? ''; });
    return item;
  });
}

function shouldGenerate(row) {
  if (!row.product_id || !row.product_name || !row.category) return false;
  if (String(row.ai_generated_at || '').trim()) return false;
  if (String(row.promotion_status || '').toUpperCase() === 'PROMOTED') return false;
  return true;
}

function buildPrompt(row) {
  return `أنت مساعد المحتوى التشغيلي لشركة عمران التجارية Omran Trading في مصر، المتخصصة في لعب الأطفال والهدايا.\n\n` +
    `اكتب بيانات منتج دقيقة فقط من المعلومات المتاحة. ممنوع اختراع سعر أو كمية أو مواصفات أو خامات أو وظائف غير مذكورة. عند نقص أي معلومة اذكر ذلك داخل ai_review_notes. اللغة الموجهة للعملاء: عربية مصرية احترافية. WhatsApp هو قناة التحويل الأساسية. السوق: مصر. العملة: EGP.\n\n` +
    `بيانات المنتج الحالية:\n` +
    `product_id: ${row.product_id}\n` +
    `sku: ${row.sku || ''}\n` +
    `product_name: ${row.product_name}\n` +
    `category: ${row.category}\n` +
    `brand: ${row.brand || ''}\n` +
    `age_group: ${row.age_group || ''}\n` +
    `description: ${row.description || ''}\n` +
    `price: ${row.price || ''}\n` +
    `available_qty: ${row.available_qty || ''}\n` +
    `image: ${row.image || ''}\n\n` +
    `أرجع JSON فقط بدون Markdown وبالمفاتيح التالية حرفيًا:\n` +
    JSON.stringify({
      ai_product_name: '',
      ai_short_description: '',
      ai_full_description: '',
      ai_category: '',
      ai_age_group: '',
      ai_seo_title: '',
      ai_meta_description: '',
      ai_alt_text: '',
      ai_whatsapp_message: '',
      ai_social_caption: '',
      ai_review_notes: ''
    }, null, 2) +
    `\n\nقواعد إضافية: ai_whatsapp_message رسالة قصيرة تبدأ بطلب الاستفسار عن المنتج ولا تفترض توفر السعر أو الكمية. ai_seo_title مختصر. ai_meta_description طبيعية وغير محشوة بالكلمات المفتاحية.`;
}

async function generateWithGemini(row) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY secret');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(row) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    })
  });
  if (!response.ok) throw new Error(`Gemini failed for ${row.product_id}: ${response.status} ${await response.text()}`);
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) throw new Error(`Gemini returned no text for ${row.product_id}`);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned invalid JSON for ${row.product_id}: ${text.slice(0, 300)}`);
  }

  for (const field of REQUIRED_AI_FIELDS) {
    if (!(field in parsed)) parsed[field] = '';
  }
  return parsed;
}

function normalize(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function buildWrite(rowNumber, ai) {
  const values = [[
    normalize(ai.ai_product_name),
    normalize(ai.ai_short_description),
    normalize(ai.ai_full_description),
    normalize(ai.ai_category),
    normalize(ai.ai_age_group),
    normalize(ai.ai_seo_title),
    normalize(ai.ai_meta_description),
    normalize(ai.ai_alt_text),
    normalize(ai.ai_whatsapp_message),
    normalize(ai.ai_social_caption),
    normalize(ai.ai_review_notes),
    new Date().toISOString()
  ]];
  return { range: `'إدخال منتج جديد'!R${rowNumber}:AC${rowNumber}`, values };
}

async function main() {
  const serviceAccount = parseServiceAccount();
  const accessToken = await getGoogleAccessToken(serviceAccount);
  const sheet = await sheetsGet(accessToken, INTAKE_RANGE);
  const rows = mapRows(sheet.values);
  const candidates = rows.filter(shouldGenerate).slice(0, MAX_ROWS);

  if (!candidates.length) {
    console.log('No products require AI generation.');
    return;
  }

  console.log(`Generating AI content for ${candidates.length} product(s) with ${GEMINI_MODEL}.`);
  const writes = [];
  for (const row of candidates) {
    try {
      const ai = await generateWithGemini(row);
      writes.push(buildWrite(row.__row, ai));
      console.log(`Prepared ${row.product_id}`);
    } catch (error) {
      console.error(`Skipped ${row.product_id}:`, error.message);
    }
  }

  if (!writes.length) throw new Error('All Gemini generations failed; nothing was written.');
  await sheetsBatchUpdateValues(accessToken, writes);
  console.log(`Wrote AI fields for ${writes.length} product(s). Products remain pending human approval.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
