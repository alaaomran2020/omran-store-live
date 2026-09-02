#!/usr/bin/env node
/**
 * مولّد n8n Workflow — OMRAN TOYS Product Pipeline.
 *
 * لماذا مولّد بدل JSON مكتوب يدويًا؟
 *   Code nodes داخل n8n تحتاج نسخة من دوال automation/n8n/lib/pipeline.mjs
 *   (المُختبَرة بـvitest). هذا السكربت يقرأ المصدر، يزيل `export`، ويضمّنه في
 *   كل Code node — فيستحيل أن يختلف الكود المُختبَر عن كود الـWorkflow.
 *
 * إعادة التوليد بعد أي تعديل:
 *   node automation/n8n/build-workflow.mjs
 *
 * الناتج: automation/n8n/omran-toys-product-pipeline.json (يُستورد في n8n).
 * لا أسرار هنا إطلاقًا: كل التوكنات تأتي من n8n Credentials و $env.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1) مكتبة الدوال المشتركة (مصدرها الوحيد lib/pipeline.mjs — مُختبَر بالكامل)
// ---------------------------------------------------------------------------
const LIB = readFileSync(join(here, "lib", "pipeline.mjs"), "utf8")
  .replace(/^export function /gm, "function ")
  .replace(/^export const /gm, "const ")
  .replace(/^export \{[^}]*\};?\s*$/gm, "");

// ---------------------------------------------------------------------------
// 2) System Prompt للـAI (نصًا كما ورد في المتطلبات)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `أنت مسؤول إدخال المنتجات في OMRAN TOYS.

حلل صورة المنتج والمعلومات المرسلة معها، وأنشئ بيانات منتج جاهزة للنشر في كتالوج ألعاب أطفال مصري.

القواعد:

1. لا تخترع أي معلومة غير واضحة.
2. إذا كانت المعلومة غير معروفة استخدم null.
3. لا تخمن العمر أو المقاس أو الخامة أو بلد المنشأ.
4. إذا أرسل المستخدم سعرًا، استخدمه كما هو.
5. لا تغير السعر الذي أدخله المستخدم إلا إذا طلب ذلك صراحة.
6. الاسم يكون واضحًا وقصيرًا وطبيعيًا.
7. الوصف يكون عربيًا مصريًا طبيعيًا ومناسبًا لمتجر ألعاب.
8. لا تستخدم مبالغات تسويقية غير حقيقية.
9. لا تستخدم Emoji داخل اسم المنتج.
10. حدد التصنيف الأقرب من التصنيفات الموجودة بالفعل في الموقع.
11. لا تنشئ تصنيفات جديدة إذا كان هناك تصنيف مناسب موجود.
12. حافظ على معلومات المنتج كما تظهر في الصورة.
13. إذا كانت العلامة التجارية واضحة استخرجها، وإلا اجعلها null.
14. لا تعتبر المعلومات الموجودة على الصورة حقيقة إذا كانت غير مقروءة بوضوح.
15. أنشئ slug ثابتًا ومناسبًا.
16. أعد JSON صالحًا فقط.
17. أضف confidence من 0 إلى 1.
18. إذا كانت الثقة منخفضة، اجعل المنتج REVIEW ولا تسمح بالنشر التلقائي.

JSON:

{
  "name": "",
  "price": null,
  "category": "",
  "description": "",
  "brand": null,
  "age_min": null,
  "age_max": null,
  "material": null,
  "dimensions": null,
  "color": null,
  "features": [],
  "keywords": [],
  "slug": "",
  "confidence": 0
}`;

const EDIT_SYSTEM_PROMPT = `أنت تعدّل بيانات منتج موجود في كتالوج OMRAN TOYS.
سيصلك المنتج الحالي كـJSON وتعليمة تعديل قصيرة من صاحب المتجر.
أعد JSON يحتوي فقط الحقول المطلوب تغييرها من: name, price, category, description.
لا تغيّر أي حقل لم يُطلب تغييره صراحة. لا تعد إنشاء المنتج بالكامل.
لا تخترع معلومات. أعد JSON صالحًا فقط بلا أي نص إضافي.`;

// ---------------------------------------------------------------------------
// 3) أكواد الـCode nodes (كل واحد يبدأ بنسخة المكتبة ثم منطقه الخاص)
// ---------------------------------------------------------------------------

const CODE_ROUTE = `${LIB}
// --- فرز تحديث Telegram + قائمة السماح ---
const allowed = ($env.TELEGRAM_ALLOWED_CHAT_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const out = [];
for (const item of $input.all()) {
  const u = item.json;
  let route = "ignore";
  let chatId = null;
  if (u.callback_query) {
    route = "callback";
    chatId = u.callback_query.message?.chat?.id ?? u.callback_query.from?.id;
  } else if (u.message) {
    chatId = u.message.chat?.id;
    if (Array.isArray(u.message.photo) && u.message.photo.length > 0) route = "photo";
    else if (typeof u.message.text === "string" && u.message.text.trim() !== "") route = "text";
  }
  // أمان: غير الموجود في قائمة السماح يُتجاهل بصمت (لا يُسجَّل محتواه)
  if (allowed.length > 0 && chatId != null && !allowed.includes(String(chatId))) route = "ignore";
  out.push({ json: { ...u, route, chatId } });
}
return out;`;

const CODE_AGGREGATE = `// --- تجميع صفوف الشيت في عنصر واحد (rows + categories + ids) ---
const rows = $input.all().map(i => i.json).filter(r => r && (r.id || r.name));
const categories = [...new Set(rows.map(r => String(r.category || "").trim()).filter(Boolean))];
return [{ json: {
  rows: rows.map(r => ({ id: r.id, name: r.name, category: r.category })),
  categories,
  ids: rows.map(r => String(r.id || "").trim()).filter(Boolean),
} }];`;

const CODE_PREPARE_AI = `${LIB}
// --- تجهيز طلب الـAI: caption + تصنيفات الموقع + الصورة (base64) ---
const catalog = $('تجميع الكتالوج').first().json;
const msg = $('فرز التحديث').first().json.message || {};
const parsed = parseCaption(msg.caption || "");
const buf = await this.helpers.getBinaryDataBuffer(0, 'data');
const b64 = buf.toString('base64');

const system = ${JSON.stringify(SYSTEM_PROMPT)} +
  "\\n\\nالتصنيفات الموجودة بالفعل في الموقع (اختر الأقرب منها فقط):\\n" +
  (catalog.categories.length ? catalog.categories.join("، ") : "(لا توجد تصنيفات بعد — اقترح تصنيفًا واحدًا بسيطًا)");

const infoLines = [
  parsed.price !== null ? \`السعر (من صاحب المتجر — استخدمه كما هو): \${parsed.price}\` : null,
  parsed.category ? \`القسم المطلوب: \${parsed.category}\` : null,
  parsed.name ? \`الاسم المطلوب: \${parsed.name}\` : null,
  parsed.notes.length ? \`ملاحظات إضافية: \${parsed.notes.join(" | ")}\` : null,
].filter(Boolean);
const userText = infoLines.length
  ? "معلومات مرسلة من صاحب المتجر:\\n" + infoLines.join("\\n")
  : "لا توجد معلومات إضافية — حلّل الصورة فقط.";

const aiRequestBody = {
  model: $env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.2,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: system },
    { role: "user", content: [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: \`data:image/jpeg;base64,\${b64}\`, detail: "low" } },
    ] },
  ],
};
return [{
  json: { parsedCaption: parsed, aiRequestBody, chatId: $('فرز التحديث').first().json.chatId },
  binary: $input.first().binary,
}];`;

const CODE_VALIDATE = `${LIB}
// --- Validation + توليد ID + كشف التكرار (الأقسام 6 و9 و10) ---
const catalog = $('تجميع الكتالوج').first().json;
const prep = $('تجهيز التحليل').first().json;

let raw = null;
try {
  let content = $json.choices?.[0]?.message?.content ?? "";
  content = String(content).replace(/^\\s*\`\`\`(?:json)?/i, "").replace(/\`\`\`\\s*$/i, "").trim();
  raw = JSON.parse(content);
} catch (e) { raw = null; }

const id = nextProductId(catalog.ids);
const v = validateAiProduct(raw, {
  categories: catalog.categories,
  userPrice: prep.parsedCaption.price,
  fallbackId: id,
});
const dup = findDuplicates({ id, name: v.product.name }, catalog.rows);

// timestamps (تُسجَّل في الشيت فقط — لا logging لأي أسرار)
const now = new Date().toISOString();
const row = {
  id,
  name: v.product.name || "",
  price: v.product.price === null ? "" : String(v.product.price),
  category: v.product.category || (prep.parsedCaption.category || ""),
  description: v.product.description || "",
  image: "", // يُملأ بعد رفع Google Drive
  active: "FALSE",              // إلزامي: الفارغ يعني معروضًا في الموقع
  sort_order: "",
  product_prompt: "",           // محفوظ للتوافق — لا يُخترع محتواه
  workflow_status: "REVIEW",
  created_at: now,
  updated_at: now,
};

return [{
  json: {
    ok: v.ok && raw !== null,
    problems: v.problems,
    lowConfidence: v.lowConfidence,
    duplicate: dup.duplicate,
    duplicateMatches: dup.matches,
    product: v.product,
    row,
    chatId: prep.chatId,
  },
  binary: $('تنزيل الصورة').first().binary,
}];`;

const CODE_FINAL_ROW = `${LIB}
// --- ربط رابط صورة Google Drive بالصف + بناء رسالة المعاينة ---
const base = $('فحص النتيجة').first().json;
let imageUrl = "";
let imageFailed = false;
try {
  const uploaded = $('رفع الصورة الأصلية').first().json;
  if (uploaded && uploaded.id && !uploaded.error) {
    imageUrl = \`https://drive.google.com/file/d/\${uploaded.id}/view\`;
  } else { imageFailed = true; }
} catch (e) { imageFailed = true; }

const row = { ...base.row, image: imageUrl };
let preview = buildPreviewMessage(base.product, {
  id: row.id,
  duplicateWarning: base.duplicate,
  duplicateMatches: base.duplicateMatches,
  lowConfidence: base.lowConfidence,
  problems: base.problems,
});
if (imageFailed) preview += "\\n\\n⚠️ تعذر حفظ الصورة. (أُنشئ المنتج بلا صورة — يمكن إضافتها لاحقًا في الشيت)";

// Logging آمن: بلا توكنات، بلا محتوى رسائل — معرف وحالة وخطوة فقط
console.log(JSON.stringify({ step: "sheet_append", product_id: row.id, workflow_status: row.workflow_status, at: row.created_at, image_failed: imageFailed }));

return [{ json: { row, preview, chatId: base.chatId, imageFailed } }];`;

const CODE_READ_BUTTON = `// --- قراءة زر Telegram (approve|id / edit|id / reject|id) ---
const q = $json.callback_query || {};
const parts = String(q.data || "").split("|");
const action = parts[0] || "";
const id = parts[1] || "";
const chatId = q.message?.chat?.id ?? q.from?.id;

if (action === "edit" && id) {
  const sd = $getWorkflowStaticData('global');
  sd.pendingEdits = sd.pendingEdits || {};
  sd.pendingEdits[String(chatId)] = id;
}
console.log(JSON.stringify({ step: "callback", action, product_id: id, at: new Date().toISOString() }));
return [{ json: { action, id, chatId, queryId: q.id || "" } }];`;

const CODE_CHECK_EDIT_MODE = `${LIB}
// --- رسالة نصية: هل هناك تعديل معلق لهذه المحادثة؟ ---
const sd = $getWorkflowStaticData('global');
const msg = $json.message || {};
const chatId = String(msg.chat?.id ?? "");
const pendingId = (sd.pendingEdits && sd.pendingEdits[chatId]) || null;
const text = String(msg.text || "").trim();
const quick = parseQuickEdit(text);
return [{ json: { pendingId, chatId, text, quick, hasPending: Boolean(pendingId) } }];`;

const CODE_PREPARE_EDIT = `${LIB}
// --- إيجاد صف المنتج وتجهيز التعديل (سريع بلا AI إن أمكن) ---
const rows = $input.all().map(i => i.json);
const ctx = $('فحص وضع التعديل').first().json;
const row = rows.find(r => String(r.id ?? "").trim() === String(ctx.pendingId ?? "").trim());
if (!row) return [{ json: { ...ctx, notFound: true, needsAi: false } }];

let fields = ctx.quick;
let needsAi = false;
let aiRequestBody = null;
if (!fields) {
  needsAi = true;
  aiRequestBody = {
    model: $env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ${JSON.stringify(EDIT_SYSTEM_PROMPT)} },
      { role: "user", content:
        "المنتج الحالي:\\n" + JSON.stringify({
          name: row.name, price: row.price, category: row.category, description: row.description,
        }) + "\\n\\nالتعديل المطلوب:\\n" + ctx.text },
    ],
  };
}
return [{ json: { ...ctx, row, fields, needsAi, aiRequestBody, notFound: false } }];`;

const CODE_MERGE_EDIT = `${LIB}
// --- دمج التعديل (سريع أو من AI) في الصف الموجود — لا إعادة إنشاء ---
let ctx, fields;
if ($json.choices) {
  ctx = $('تجهيز التعديل').first().json;
  let content = $json.choices?.[0]?.message?.content ?? "{}";
  content = String(content).replace(/^\\s*\`\`\`(?:json)?/i, "").replace(/\`\`\`\\s*$/i, "").trim();
  try { fields = JSON.parse(content); } catch (e) { fields = {}; }
} else {
  ctx = $json;
  fields = ctx.fields || {};
}

const row = { ...ctx.row };
for (const key of ["name", "category", "description"]) {
  const v = fields[key];
  if (v !== undefined && v !== null && String(v).trim() !== "") row[key] = String(v).trim();
}
if (fields.price !== undefined && fields.price !== null) {
  const p = parsePrice(fields.price);
  if (p !== null) row.price = String(p);
}
row.active = "FALSE";              // يظل تحت المراجعة حتى الضغط على نشر
row.workflow_status = "REVIEW";
row.updated_at = new Date().toISOString();

const sd = $getWorkflowStaticData('global');
if (sd.pendingEdits) delete sd.pendingEdits[String(ctx.chatId)];

const preview = buildPreviewMessage(
  { name: row.name, price: row.price === "" ? null : Number(row.price), category: row.category, description: row.description, confidence: 1 },
  { id: row.id }
) + "\\n\\n✏️ (بعد التعديل — راجع ثم اضغط نشر)";

console.log(JSON.stringify({ step: "edit_merge", product_id: row.id, workflow_status: row.workflow_status, at: row.updated_at }));
return [{ json: { row, id: row.id, chatId: ctx.chatId, preview } }];`;

// ---------------------------------------------------------------------------
// 4) مساعدات بناء الـnodes
// ---------------------------------------------------------------------------

let nodeIdCounter = 0;
const nodes = [];
const connections = {};

function addNode(node) {
  nodeIdCounter += 1;
  nodes.push({ id: `node-${String(nodeIdCounter).padStart(2, "0")}`, ...node });
  return node.name;
}

function connect(from, to, { fromOutput = 0, toInput = 0 } = {}) {
  connections[from] ??= { main: [] };
  const main = connections[from].main;
  while (main.length <= fromOutput) main.push([]);
  main[fromOutput].push({ node: to, type: "main", index: toInput });
}

const SHEET_DOC = {
  __rl: true,
  value: "={{ $env.PRODUCTS_SHEET_ID }}",
  mode: "id",
};
const SHEET_TAB = {
  __rl: true,
  value: "={{ $env.PRODUCTS_SHEET_TAB || \"products\" }}",
  mode: "name",
};

const CHAT_FROM_TRIGGER = "={{ $('فرز التحديث').first().json.chatId }}";

function telegramMessage(name, position, text, extra = {}) {
  return {
    name,
    type: "n8n-nodes-base.telegram",
    typeVersion: 1.2,
    position,
    parameters: {
      chatId: extra.chatId ?? CHAT_FROM_TRIGGER,
      text,
      additionalFields: {},
      ...(extra.parameters ?? {}),
    },
    ...(extra.node ?? {}),
  };
}

function previewKeyboard(idExpr) {
  return {
    replyMarkup: "inlineKeyboard",
    inlineKeyboard: {
      rows: [
        {
          row: {
            buttons: [
              { text: "✅ نشر", additionalFields: { callback_data: `=approve|{{ ${idExpr} }}` } },
              { text: "✏️ تعديل", additionalFields: { callback_data: `=edit|{{ ${idExpr} }}` } },
              { text: "❌ رفض", additionalFields: { callback_data: `=reject|{{ ${idExpr} }}` } },
            ],
          },
        },
      ],
    },
  };
}

const OPENAI_HTTP = body => ({
  method: "POST",
  url: '={{ ($env.OPENAI_BASE_URL || "https://api.openai.com/v1") + "/chat/completions" }}',
  sendHeaders: true,
  headerParameters: {
    parameters: [
      { name: "Authorization", value: "=Bearer {{ $env.OPENAI_API_KEY }}" },
      { name: "Content-Type", value: "application/json" },
    ],
  },
  sendBody: true,
  specifyBody: "json",
  jsonBody: body,
  options: { timeout: 90000 },
});

// ---------------------------------------------------------------------------
// 5) الـnodes بالترتيب
// ---------------------------------------------------------------------------

addNode({
  name: "Telegram Trigger",
  type: "n8n-nodes-base.telegramTrigger",
  typeVersion: 1.1,
  position: [200, 380],
  parameters: { updates: ["message", "callback_query"], additionalFields: {} },
});

addNode({
  name: "فرز التحديث",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [420, 380],
  parameters: { jsCode: CODE_ROUTE },
});

addNode({
  name: "مسار التحديث",
  type: "n8n-nodes-base.switch",
  typeVersion: 1,
  position: [640, 380],
  parameters: {
    dataType: "string",
    value1: "={{ $json.route }}",
    rules: {
      rules: [
        { value2: "photo", output: 0 },
        { value2: "callback", output: 1 },
        { value2: "text", output: 2 },
      ],
    },
    fallbackOutput: 3,
  },
});

// ---------- مسار الصورة (منتج جديد) ----------

addNode({
  name: "قراءة الكتالوج",
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4.5,
  position: [880, 80],
  parameters: { operation: "read", documentId: SHEET_DOC, sheetName: SHEET_TAB, options: {} },
  onError: "continueErrorOutput",
});

addNode({
  name: "تجميع الكتالوج",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1100, 80],
  parameters: { jsCode: CODE_AGGREGATE },
});

addNode({
  name: "تنزيل الصورة",
  type: "n8n-nodes-base.telegram",
  typeVersion: 1.2,
  position: [1320, 80],
  parameters: {
    resource: "file",
    fileId:
      "={{ $('فرز التحديث').first().json.message.photo[$('فرز التحديث').first().json.message.photo.length - 1].file_id }}",
    additionalFields: {},
  },
  onError: "continueErrorOutput",
});

addNode({
  name: "تجهيز التحليل",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1540, 80],
  parameters: { jsCode: CODE_PREPARE_AI },
});

addNode({
  name: "تحليل المنتج AI",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [1760, 80],
  parameters: OPENAI_HTTP("={{ JSON.stringify($json.aiRequestBody) }}"),
  onError: "continueErrorOutput",
});

addNode({
  name: "فحص النتيجة",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1980, 80],
  parameters: { jsCode: CODE_VALIDATE },
});

addNode({
  name: "هل التحليل صالح؟",
  type: "n8n-nodes-base.if",
  typeVersion: 1,
  position: [2200, 80],
  parameters: { conditions: { boolean: [{ value1: "={{ $json.ok }}", value2: true }] } },
});

addNode({
  name: "رفع الصورة الأصلية",
  type: "n8n-nodes-base.googleDrive",
  typeVersion: 3,
  position: [2420, 20],
  parameters: {
    operation: "upload",
    inputDataFieldName: "data",
    name: "={{ $json.row.id }}-original.jpg",
    driveId: { __rl: true, value: "My Drive", mode: "list" },
    folderId: { __rl: true, value: "={{ $env.DRIVE_ORIGINALS_FOLDER_ID }}", mode: "id" },
    options: {},
  },
  onError: "continueRegularOutput",
});

addNode({
  name: "مشاركة الصورة",
  type: "n8n-nodes-base.googleDrive",
  typeVersion: 3,
  position: [2640, 20],
  parameters: {
    resource: "file",
    operation: "share",
    fileId: { __rl: true, value: "={{ $json.id }}", mode: "id" },
    permissionsUi: { permissionsValues: { role: "reader", type: "anyone" } },
    options: {},
  },
  onError: "continueRegularOutput",
});

addNode({
  name: "تجهيز الصف النهائي",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [2860, 80],
  parameters: { jsCode: CODE_FINAL_ROW },
});

addNode({
  name: "إضافة المنتج",
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4.5,
  position: [3080, 80],
  parameters: {
    operation: "append",
    documentId: SHEET_DOC,
    sheetName: SHEET_TAB,
    columns: {
      mappingMode: "defineBelow",
      value: {
        id: "={{ $json.row.id }}",
        name: "={{ $json.row.name }}",
        price: "={{ $json.row.price }}",
        category: "={{ $json.row.category }}",
        description: "={{ $json.row.description }}",
        image: "={{ $json.row.image }}",
        active: "={{ $json.row.active }}",
        sort_order: "={{ $json.row.sort_order }}",
        product_prompt: "={{ $json.row.product_prompt }}",
        workflow_status: "={{ $json.row.workflow_status }}",
        created_at: "={{ $json.row.created_at }}",
        updated_at: "={{ $json.row.updated_at }}",
      },
      matchingColumns: [],
    },
    options: {},
  },
  onError: "continueErrorOutput",
});

addNode(
  telegramMessage(
    "معاينة المنتج",
    [3300, 80],
    "={{ $('تجهيز الصف النهائي').first().json.preview }}",
    {
      chatId: "={{ $('تجهيز الصف النهائي').first().json.chatId }}",
      parameters: previewKeyboard("$('تجهيز الصف النهائي').first().json.row.id"),
    }
  )
);

// ---------- مسار الأزرار (نشر/تعديل/رفض) ----------

addNode({
  name: "قراءة الزر",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [880, 380],
  parameters: { jsCode: CODE_READ_BUTTON },
});

addNode({
  name: "إيقاف مؤشر الزر",
  type: "n8n-nodes-base.telegram",
  typeVersion: 1.2,
  position: [1100, 380],
  parameters: {
    resource: "callback",
    queryId: "={{ $json.queryId }}",
    additionalFields: {},
  },
  onError: "continueRegularOutput",
});

addNode({
  name: "الإجراء",
  type: "n8n-nodes-base.switch",
  typeVersion: 1,
  position: [1320, 380],
  parameters: {
    dataType: "string",
    value1: "={{ $('قراءة الزر').first().json.action }}",
    rules: {
      rules: [
        { value2: "approve", output: 0 },
        { value2: "reject", output: 1 },
        { value2: "edit", output: 2 },
      ],
    },
  },
});

const APPROVE_ID = "={{ $('قراءة الزر').first().json.id }}";

addNode({
  name: "نشر المنتج",
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4.5,
  position: [1540, 300],
  parameters: {
    operation: "appendOrUpdate",
    documentId: SHEET_DOC,
    sheetName: SHEET_TAB,
    columns: {
      mappingMode: "defineBelow",
      value: {
        id: APPROVE_ID,
        active: "TRUE",
        workflow_status: "PUBLISHED",
        updated_at: "={{ new Date().toISOString() }}",
      },
      matchingColumns: ["id"],
    },
    options: {},
  },
  onError: "continueErrorOutput",
});

addNode(
  telegramMessage(
    "تأكيد النشر",
    [1760, 300],
    `=✅ تم نشر المنتج {{ $('قراءة الزر').first().json.id }}.

سيظهر على omrantoys.store خلال ~5 دقائق كحد أقصى (مدة كاش Cloudflare الحالية — لا حاجة لأي Deploy).`,
    { chatId: "={{ $('قراءة الزر').first().json.chatId }}" }
  )
);

addNode({
  name: "رفض المنتج",
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4.5,
  position: [1540, 460],
  parameters: {
    operation: "appendOrUpdate",
    documentId: SHEET_DOC,
    sheetName: SHEET_TAB,
    columns: {
      mappingMode: "defineBelow",
      value: {
        id: APPROVE_ID,
        active: "FALSE",
        workflow_status: "REJECTED",
        updated_at: "={{ new Date().toISOString() }}",
      },
      matchingColumns: ["id"],
    },
    options: {},
  },
  onError: "continueErrorOutput",
});

addNode(
  telegramMessage(
    "تأكيد الرفض",
    [1760, 460],
    "=❌ تم رفض المنتج {{ $('قراءة الزر').first().json.id }} — لن يظهر على الموقع.",
    { chatId: "={{ $('قراءة الزر').first().json.chatId }}" }
  )
);

addNode(
  telegramMessage(
    "طلب التعديل",
    [1540, 620],
    `=✏️ أرسل التعديل المطلوب على {{ $('قراءة الزر').first().json.id }} في رسالة واحدة.

أمثلة:
السعر 399
غير الاسم إلى عروسة أميرة بفستان وردي
القسم: عرائس`,
    { chatId: "={{ $('قراءة الزر').first().json.chatId }}" }
  )
);

// ---------- مسار النص (تنفيذ التعديل) ----------

addNode({
  name: "فحص وضع التعديل",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [880, 700],
  parameters: { jsCode: CODE_CHECK_EDIT_MODE },
});

addNode({
  name: "يوجد تعديل معلق؟",
  type: "n8n-nodes-base.if",
  typeVersion: 1,
  position: [1100, 700],
  parameters: { conditions: { boolean: [{ value1: "={{ $json.hasPending }}", value2: true }] } },
});

addNode({
  name: "قراءة صف المنتج",
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4.5,
  position: [1320, 700],
  parameters: { operation: "read", documentId: SHEET_DOC, sheetName: SHEET_TAB, options: {} },
  onError: "continueErrorOutput",
});

addNode({
  name: "تجهيز التعديل",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1540, 780],
  parameters: { jsCode: CODE_PREPARE_EDIT },
});

addNode({
  name: "المنتج موجود؟",
  type: "n8n-nodes-base.if",
  typeVersion: 1,
  position: [1760, 780],
  parameters: { conditions: { boolean: [{ value1: "={{ $json.notFound }}", value2: false }] } },
});

addNode({
  name: "يحتاج AI؟",
  type: "n8n-nodes-base.if",
  typeVersion: 1,
  position: [1980, 780],
  parameters: { conditions: { boolean: [{ value1: "={{ $json.needsAi }}", value2: true }] } },
});

addNode({
  name: "تحليل التعديل AI",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [2200, 860],
  parameters: OPENAI_HTTP("={{ JSON.stringify($json.aiRequestBody) }}"),
  onError: "continueErrorOutput",
});

addNode({
  name: "دمج التعديل",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [2420, 780],
  parameters: { jsCode: CODE_MERGE_EDIT },
});

addNode({
  name: "تحديث المنتج",
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4.5,
  position: [2640, 780],
  parameters: {
    operation: "appendOrUpdate",
    documentId: SHEET_DOC,
    sheetName: SHEET_TAB,
    columns: {
      mappingMode: "defineBelow",
      value: {
        id: "={{ $json.row.id }}",
        name: "={{ $json.row.name }}",
        price: "={{ $json.row.price }}",
        category: "={{ $json.row.category }}",
        description: "={{ $json.row.description }}",
        image: "={{ $json.row.image }}",
        active: "={{ $json.row.active }}",
        sort_order: "={{ $json.row.sort_order }}",
        product_prompt: "={{ $json.row.product_prompt }}",
        workflow_status: "={{ $json.row.workflow_status }}",
        created_at: "={{ $json.row.created_at }}",
        updated_at: "={{ $json.row.updated_at }}",
      },
      matchingColumns: ["id"],
    },
    options: {},
  },
  onError: "continueErrorOutput",
});

addNode(
  telegramMessage(
    "معاينة بعد التعديل",
    [2860, 780],
    "={{ $('دمج التعديل').first().json.preview }}",
    {
      chatId: "={{ $('دمج التعديل').first().json.chatId }}",
      parameters: previewKeyboard("$('دمج التعديل').first().json.row.id"),
    }
  )
);

// ---------- رسائل الأخطاء والمساعدة ----------

addNode(telegramMessage("خطأ استقبال الصورة", [1540, -120], "⚠️ تعذر استقبال الصورة. حاول إرسالها مرة أخرى."));
addNode(telegramMessage("خطأ تحليل المنتج", [2200, -120], "⚠️ تعذر تحليل المنتج. حاول مرة أخرى بعد قليل."));
addNode(telegramMessage("خطأ قراءة الشيت", [880, -120], "⚠️ تعذر الوصول إلى Google Sheets. لم يُفقد شيء — أعد الإرسال بعد قليل."));
addNode(
  telegramMessage(
    "خطأ حفظ المنتج",
    [3300, -120],
    `=⚠️ تعذر إضافة المنتج إلى Google Sheets.

بيانات المنتج (احتفظ بها وأعد المحاولة):
{{ JSON.stringify($('تجهيز الصف النهائي').first().json.row) }}`,
    { chatId: "={{ $('تجهيز الصف النهائي').first().json.chatId }}" }
  )
);
addNode(
  telegramMessage(
    "خطأ النشر",
    [1760, 160],
    "⚠️ تم حفظ المنتج لكن لم يظهر بعد على الموقع. اضغط ✅ نشر مرة أخرى بعد قليل.",
    { chatId: "={{ $('قراءة الزر').first().json.chatId }}" }
  )
);
addNode(
  telegramMessage(
    "خطأ تحديث المنتج",
    [2640, 940],
    "⚠️ تعذر تحديث المنتج في Google Sheets. أعد المحاولة بعد قليل."
  )
);
addNode(
  telegramMessage(
    "رسالة مساعدة",
    [1320, 560],
    `🧸 لإضافة منتج جديد: أرسل صورة المنتج.

اختياريًا أضف في التعليق:
السعر: 350
القسم: ألعاب بنات`
  )
);
addNode(telegramMessage("المنتج غير موجود", [1980, 940], "⚠️ المنتج غير موجود في الشيت. اضغط ✏️ تعديل من رسالة المعاينة مرة أخرى."));

addNode({
  name: "تجاهل",
  type: "n8n-nodes-base.noOp",
  typeVersion: 1,
  position: [880, 560],
  parameters: {},
});

// ---------------------------------------------------------------------------
// 6) التوصيلات
// ---------------------------------------------------------------------------

connect("Telegram Trigger", "فرز التحديث");
connect("فرز التحديث", "مسار التحديث");
connect("مسار التحديث", "قراءة الكتالوج", { fromOutput: 0 });
connect("مسار التحديث", "قراءة الزر", { fromOutput: 1 });
connect("مسار التحديث", "فحص وضع التعديل", { fromOutput: 2 });
connect("مسار التحديث", "تجاهل", { fromOutput: 3 });

// مسار الصورة
connect("قراءة الكتالوج", "تجميع الكتالوج");
connect("قراءة الكتالوج", "خطأ قراءة الشيت", { fromOutput: 1 });
connect("تجميع الكتالوج", "تنزيل الصورة");
connect("تنزيل الصورة", "تجهيز التحليل");
connect("تنزيل الصورة", "خطأ استقبال الصورة", { fromOutput: 1 });
connect("تجهيز التحليل", "تحليل المنتج AI");
connect("تحليل المنتج AI", "فحص النتيجة");
connect("تحليل المنتج AI", "خطأ تحليل المنتج", { fromOutput: 1 });
connect("فحص النتيجة", "هل التحليل صالح؟");
connect("هل التحليل صالح؟", "رفع الصورة الأصلية", { fromOutput: 0 });
connect("هل التحليل صالح؟", "خطأ تحليل المنتج", { fromOutput: 1 });
connect("رفع الصورة الأصلية", "مشاركة الصورة");
connect("مشاركة الصورة", "تجهيز الصف النهائي");
connect("تجهيز الصف النهائي", "إضافة المنتج");
connect("إضافة المنتج", "معاينة المنتج");
connect("إضافة المنتج", "خطأ حفظ المنتج", { fromOutput: 1 });

// مسار الأزرار
connect("قراءة الزر", "إيقاف مؤشر الزر");
connect("إيقاف مؤشر الزر", "الإجراء");
connect("الإجراء", "نشر المنتج", { fromOutput: 0 });
connect("الإجراء", "رفض المنتج", { fromOutput: 1 });
connect("الإجراء", "طلب التعديل", { fromOutput: 2 });
connect("نشر المنتج", "تأكيد النشر");
connect("نشر المنتج", "خطأ النشر", { fromOutput: 1 });
connect("رفض المنتج", "تأكيد الرفض");
connect("رفض المنتج", "خطأ تحديث المنتج", { fromOutput: 1 });

// مسار النص (التعديل)
connect("فحص وضع التعديل", "يوجد تعديل معلق؟");
connect("يوجد تعديل معلق؟", "قراءة صف المنتج", { fromOutput: 0 });
connect("يوجد تعديل معلق؟", "رسالة مساعدة", { fromOutput: 1 });
connect("قراءة صف المنتج", "تجهيز التعديل");
connect("قراءة صف المنتج", "خطأ قراءة الشيت", { fromOutput: 1 });
connect("تجهيز التعديل", "المنتج موجود؟");
connect("المنتج موجود؟", "يحتاج AI؟", { fromOutput: 0 });
connect("المنتج موجود؟", "المنتج غير موجود", { fromOutput: 1 });
connect("يحتاج AI؟", "تحليل التعديل AI", { fromOutput: 0 });
connect("يحتاج AI؟", "دمج التعديل", { fromOutput: 1 });
connect("تحليل التعديل AI", "دمج التعديل");
connect("تحليل التعديل AI", "خطأ تحليل المنتج", { fromOutput: 1 });
connect("دمج التعديل", "تحديث المنتج");
connect("تحديث المنتج", "معاينة بعد التعديل");
connect("تحديث المنتج", "خطأ تحديث المنتج", { fromOutput: 1 });

// ---------------------------------------------------------------------------
// 7) تحقق بنيوي + كتابة الملف
// ---------------------------------------------------------------------------

const names = new Set(nodes.map(n => n.name));
if (names.size !== nodes.length) throw new Error("أسماء nodes مكررة");
for (const [from, def] of Object.entries(connections)) {
  if (!names.has(from)) throw new Error(`توصيلة من node غير موجود: ${from}`);
  for (const outputs of def.main) {
    for (const target of outputs) {
      if (!names.has(target.node))
        throw new Error(`توصيلة إلى node غير موجود: ${target.node}`);
    }
  }
}
// كل node (عدا الرسائل النهائية/الترigger) يجب أن يكون موصولًا
const referenced = new Set(["Telegram Trigger"]);
for (const def of Object.values(connections))
  for (const outputs of def.main) for (const t of outputs) referenced.add(t.node);
for (const n of nodes) {
  if (!referenced.has(n.name))
    throw new Error(`node غير موصول بأي مدخل: ${n.name}`);
}

const workflow = {
  name: "OMRAN TOYS — Product Pipeline (Telegram → AI → Drive → Sheets)",
  active: false,
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  meta: {
    description:
      "إضافة منتجات OMRAN TOYS من Telegram: تحليل AI، حفظ الصورة في Google Drive، صف REVIEW في Google Sheets (active=FALSE)، ثم نشر بزر ✅ (active=TRUE) — والموقع يلتقطه عبر آلية Google Sheets → Cloudflare Worker الحالية بلا أي Deploy.",
  },
};

const outPath = join(here, "omran-toys-product-pipeline.json");
writeFileSync(outPath, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log(
  `✔ generated ${outPath} — ${nodes.length} nodes, ${Object.keys(connections).length} connection sources`
);
