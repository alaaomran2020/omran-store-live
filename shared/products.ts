/**
 * OMRAN TOYS — كتالوج المنتجات من Google Sheets (CSV منشور للويب).
 *
 * وحدة واحدة مشتركة تعمل في كل البيئات بلا تعديل:
 *   - المتصفح (client/src/lib/productsClient.ts)
 *   - Cloudflare Worker (worker/index.ts)  → /api/products
 *   - Express dev/VPS   (server/products.ts) → /api/products
 * لذلك تستخدم Web APIs فقط (fetch / AbortController / URL) — بلا Node وبلا DOM.
 *
 * قواعد التصميم:
 *   1. لا مفاتيح API ولا OAuth ولا Service Account: المصدر الوحيد هو رابط
 *      "Publish to web → CSV" العام من Google Sheets.
 *   2. لا قاعدة بيانات ولا لوحة تحكم: الصف في الشيت هو المنتج.
 *   3. لا شيء يكسر الموقع: كل صف تالف يُتجاهل بصمت، وكل حقل ناقص له سلوك آمن.
 */

// ---------------------------------------------------------------------------
// النوع الموحّد
// ---------------------------------------------------------------------------

/**
 * حالة نشر المنتج (first-class field من الشيت).
 * فقط `PUBLISHED` تستوفي شرط النشر؛ أي قيمة أخرى (فارغة/غير معروفة) تُعامل
 * كغير منشورة (Fail-Closed).
 */
export type ProductWorkflowStatus =
  | ""
  | "PUBLISHED"
  | "REVIEW"
  | "NEEDS_REVIEW"
  | "REJECTED"
  | "DRAFT";

/** حالة مراجعة الجودة (first-class field من الشيت). فقط `PASS` تُنشر. */
export type ProductQaStatus =
  | ""
  | "PASS"
  | "NEEDS_REVIEW"
  | "REVIEW"
  | "PENDING"
  | "FAILED";

/** منتج واحد بعد التطبيع — مطابق تمامًا لأعمدة Google Sheet. */
export type Product = {
  /** عمود `id`؛ يُولَّد من رقم الصف إن كان فارغًا. فريد دائمًا. */
  id: string;
  /** عمود `name` — مطلوب (الصف بلا اسم يُعتبر تالفًا ويُتجاهل). */
  name: string;
  /** عمود `price` بعد التحويل لرقم؛ `null` إذا كان فارغًا أو غير صالح. */
  price: number | null;
  /** عمود `category`؛ سلسلة فارغة إذا لم يُحدَّد. */
  category: string;
  /** عمود `description`؛ سلسلة فارغة إذا لم يُحدَّد. */
  description: string;
  /** عمود `image` بعد تحويل روابط Google Drive لصيغة عرض مباشرة؛ `null` إن لم توجد صورة. */
  image: string | null;
  /** رابط الصورة كما كُتب في الشيت (للتشخيص وللبديل عند فشل التحميل). */
  imageSource: string | null;
  /** عمود `active`؛ الفارغ = معروض (اكتب FALSE لإخفاء المنتج). */
  active: boolean;
  /** عمود `sort_order`؛ `null` إذا كان فارغًا/غير رقمي → يُرتَّب حسب ترتيب الشيت. */
  sortOrder: number | null;
  /** عمود `product_prompt` — تشغيلي فقط (تجهيز الصورة بالـAI)، لا يُعرض للزائر. */
  productPrompt: string;
  /**
   * عمود `workflow_status` — أول-فئة. حالة نشر المنتج من الشيت.
   * لا تُشتق من product_prompt مطلقًا (Fail-Closed).
   */
  workflowStatus: ProductWorkflowStatus;
  /**
   * عمود `qa_status` — أول-فئة. حالة مراجعة الجودة من الشيت.
   * لا يُفترض PASS عند غيابها (Fail-Closed).
   */
  qaStatus: ProductQaStatus;
  /** عمود `source_drive_id` — مُعرّف ملف/صورة المصدر في Google Drive (إن وُثّق). */
  sourceDriveId: string | null;
  /** عمود `processed_image` — رابط/مسار الصورة المعالَجة المعتمدة (إن وُثّق). */
  processedImage: string | null;
  /** عمود `review_reason` — سبب المراجعة/الرفض (تشخيصي، لا يُعرض للزائر). */
  reviewReason: string;
  /** رقم الصف في الشيت (1 = أول صف بيانات) — يحفظ الترتيب الطبيعي. */
  rowIndex: number;
};

export type ProductsStatus = "ok" | "not_configured" | "error";

/** الحمولة التي يستهلكها الواجهة (نفس الشكل من الـWorker أو Express أو مباشرة). */
export type ProductsPayload = {
  products: Product[];
  status: ProductsStatus;
  /** وقت تجميع الحمولة (ISO-8601). */
  fetchedAt: string;
};

/** أسماء أعمدة الشيت بالترتيب المتفق عليه (تُستخدم أيضًا كترتيب افتراضي بلا رأس). */
export const PRODUCT_COLUMNS = [
  "id",
  "name",
  "price",
  "category",
  "description",
  "image",
  "active",
  "sort_order",
  "product_prompt",
  "workflow_status",
  "qa_status",
  "source_drive_id",
  "processed_image",
  "review_reason",
] as const;

/** مهلة طلب الشيت — يجب ألا يُعلَّق تحميل الصفحة أبدًا. */
export const SHEET_TIMEOUT_MS = 8_000;

/** عمر الكاش على الخادم/الحافة: منتج جديد يظهر خلال هذه المدة بلا أي Deploy. */
export const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// 1) محلل CSV (RFC 4180): يدعم الاقتباس، الفواصل والأسطر داخل الحقول، و"" الهاربة
// ---------------------------------------------------------------------------

/** يفكك نص CSV إلى صفوف/خلايا. لا يرمي استثناءً أبدًا حتى مع نص تالف. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, ""); // BOM من Google
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // تجاهل الأسطر الفارغة تمامًا
    if (row.some(cell => cell.trim() !== "")) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      endField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      // \r\n أو \r وحدها
      endRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (field !== "" || row.length > 0) endRow();
  return rows;
}

// ---------------------------------------------------------------------------
// 2) تطبيع القيم
// ---------------------------------------------------------------------------

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/** يحوّل الأرقام العربية/الفارسية إلى لاتينية ليقبلها Number(). */
export function toLatinDigits(value: string): string {
  let out = "";
  for (const ch of value) {
    const a = ARABIC_INDIC.indexOf(ch);
    if (a !== -1) {
      out += String(a);
      continue;
    }
    const p = EXTENDED_ARABIC_INDIC.indexOf(ch);
    out += p !== -1 ? String(p) : ch;
  }
  return out;
}

const clean = (value: string | undefined): string => (value ?? "").trim();

/**
 * سعر آمن: يقبل "250" و"250.50" و"1,250" و"٢٥٠" و"250 ج.م".
 * أي شيء آخر (فارغ، نص، سالب) → null، ويعرضه الموقع كـ"للاستفسار والكميات".
 */
export function parsePrice(raw: string | undefined): number | null {
  const text = toLatinDigits(clean(raw))
    .replace(/[٬,\s]/g, "")
    .replace(/[٫]/g, ".");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * حالة الظهور. TRUE/true/1/yes/y/نعم/متاح → معروض،
 * FALSE/0/no/n/لا/مخفي → مخفي، والفارغ → معروض (الصف موجود فمن المفترض عرضه).
 */
export function parseActive(raw: string | undefined): boolean {
  const text = toLatinDigits(clean(raw)).toLowerCase();
  if (text === "") return true;
  if (["false", "0", "no", "n", "لا", "مخفي", "غير متاح", "off"].includes(text))
    return false;
  return true;
}

/** ترتيب اختياري: رقم صحيح؛ الفارغ/غير الرقمي → null (يحتفظ بترتيب الشيت). */
export function parseSortOrder(raw: string | undefined): number | null {
  const text = toLatinDigits(clean(raw));
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------
// 3-bis) حقول النشر First-Class (workflow_status / qa_status / source evidence)
//
// Fail-Closed هو القاعدة الوحيدة:
//   - غياب القيمة أو قيمة غير معروفة → "" (تُستبعد لاحقًا من Public API).
//   - لا نعرّف "منشور" افتراضيًا لأي صف — حتى لو كان active=true.
// ---------------------------------------------------------------------------

const WORKFLOW_STATUSES: ReadonlySet<string> = new Set([
  "PUBLISHED",
  "REVIEW",
  "NEEDS_REVIEW",
  "REJECTED",
  "DRAFT",
]);

/** يحوّل نص workflow_status إلى قيمة معتمدة؛ غير المعروف → "" (Fail-Closed). */
export function parseWorkflowStatus(
  raw: string | undefined
): ProductWorkflowStatus {
  const text = clean(raw).toUpperCase();
  if (text === "") return "";
  return WORKFLOW_STATUSES.has(text)
    ? (text as ProductWorkflowStatus)
    : "";
}

const QA_STATUSES: ReadonlySet<string> = new Set([
  "PASS",
  "NEEDS_REVIEW",
  "REVIEW",
  "PENDING",
  "FAILED",
]);

/** يحوّل نص qa_status إلى قيمة معتمدة؛ غير المعروف → "" (Fail-Closed). */
export function parseQaStatus(raw: string | undefined): ProductQaStatus {
  const text = clean(raw).toUpperCase();
  if (text === "") return "";
  return QA_STATUSES.has(text) ? (text as ProductQaStatus) : "";
}

/**
 * استخراج tokens قديمة من product_prompt (طبقة compatibility محافظة فقط):
 *   source_drive_id=<id>; qa=PASS; processed=file.webp
 *
 * تُستخدم فقط عند غياب العمود First-Class المقابل، وكل قيمة تُمرَّر عبر نفس
 * مصادقة القيم (parseQaStatus). لا تُشتق workflow_status من هنا أبدًا:
 * النشر يتطلب عمود `workflow_status` صريحًا في الشيت.
 */
export function parseLegacyPromptMetadata(
  productPrompt: string
): {
  sourceDriveId: string | null;
  qaStatus: ProductQaStatus;
  processedImage: string | null;
} {
  const prompt = clean(productPrompt);
  const sourceDriveId =
    prompt.match(/source_drive_id=([A-Za-z0-9_-]{10,})/)?.[1] ?? null;
  const processedImage =
    prompt.match(/processed=([^\s;]+)/)?.[1] ?? null;
  const qaStatus =
    parseQaStatus(prompt.match(/qa=(PASS|NEEDS_REVIEW|REVIEW|PENDING|FAILED)/i)?.[1]) ??
    "";
  return { sourceDriveId, qaStatus, processedImage };
}

/**
 * بوابة النشر النهائية — آخر خطوة قبل أي Public response.
 *
 * PUBLIC PRODUCT = active === true
 *                  AND workflowStatus === "PUBLISHED"
 *                  AND qaStatus === "PASS"
 *
 * كل شيء آخر يُستبعد. تعمل فوق أي مجموعة منتجات (بعد Overrides أيضًا) ولا
 * يمكن لأي تجاوز تجاوزها لأنها لا تقبل حقول نشر — فقط تصفية صارمة.
 */
export function applyPublicationGate(products: readonly Product[]): Product[] {
  return products.filter(
    product =>
      product.active === true &&
      product.workflowStatus === "PUBLISHED" &&
      product.qaStatus === "PASS"
  );
}

// الأعمدة التشغيلية تُقرأ بأسمائها من خريطة العناوين — لا فهارس ثابتة مطلوبة.

// ---------------------------------------------------------------------------
// 3) صور Google Drive
// ---------------------------------------------------------------------------

const DRIVE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]{10,})/, // /file/d/ID/view
  /\/d\/([a-zA-Z0-9_-]{10,})/, // /d/ID
  /[?&]id=([a-zA-Z0-9_-]{10,})/, // ?id=ID  (open / uc / usercontent)
];

/** يستخرج معرّف ملف Google Drive من أي صيغة رابط شائعة، أو null. */
export function driveFileId(url: string): string | null {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (
    !/(^|\.)drive\.google\.com$|(^|\.)drive\.usercontent\.google\.com$/.test(
      host
    )
  )
    return null;
  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * يحوّل رابط Google Drive إلى صيغة صالحة للعرض داخل `<img>`.
 *
 * روابط المشاركة (`/file/d/ID/view`) تُرجع صفحة HTML لا صورة، و`uc?export=view`
 * تتحول كثيرًا إلى صفحة تحذير. نقطة `thumbnail` هي الصيغة الوحيدة التي تخدم
 * بايتات الصورة مباشرةً لأي ملف "Anyone with the link"، وتقبل تحديد العرض.
 * أي رابط آخر (Cloudflare/https عادي) يُعاد كما هو.
 */
export function toDisplayableImageUrl(
  rawUrl: string | null | undefined,
  width = 1000
): string | null {
  const url = clean(rawUrl ?? "");
  if (url === "") return null;
  const id = driveFileId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  // نقبل http/https والمسارات النسبية من نفس الأصل (مثل /products/...) — تُستخدم للصور المعالجة المُستضافة على Workers Assets
  if (url.startsWith("/")) return url;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

/**
 * بديل ثانٍ عند فشل رابط الـthumbnail (حصص Drive أحيانًا). نفس الملف عبر
 * نطاق googleusercontent — نجرّبه في المتصفح قبل عرض الأيقونة البديلة.
 */
export function fallbackImageUrl(
  rawUrl: string | null | undefined,
  width = 1000
): string | null {
  const id = driveFileId(clean(rawUrl ?? ""));
  return id ? `https://lh3.googleusercontent.com/d/${id}=w${width}` : null;
}

// ---------------------------------------------------------------------------
// 4) من CSV إلى Product[]
// ---------------------------------------------------------------------------

const normalizeHeader = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[\s-]+/g, "_");

/** مرادفات عربية/إنجليزية لأسماء الأعمدة، حتى لا يكسر الشيت بسبب تسمية مختلفة. */
const HEADER_ALIASES: Record<string, (typeof PRODUCT_COLUMNS)[number]> = {
  id: "id",
  code: "id",
  sku: "id",
  الرقم: "id",
  الكود: "id",
  name: "name",
  title: "name",
  product: "name",
  product_name: "name",
  الاسم: "name",
  المنتج: "name",
  price: "price",
  السعر: "price",
  category: "category",
  cat: "category",
  التصنيف: "category",
  القسم: "category",
  description: "description",
  desc: "description",
  الوصف: "description",
  image: "image",
  image_url: "image",
  img: "image",
  photo: "image",
  الصورة: "image",
  active: "active",
  visible: "active",
  published: "active",
  الحالة: "active",
  متاح: "active",
  sort_order: "sort_order",
  sort: "sort_order",
  order: "sort_order",
  الترتيب: "sort_order",
  product_prompt: "product_prompt",
  prompt: "product_prompt",
  البرومبت: "product_prompt",
  workflow_status: "workflow_status",
  workflow: "workflow_status",
  workflow_status_en: "workflow_status",
  حالة_النشر: "workflow_status",
  حالة_الموافقة: "workflow_status",
  qa_status: "qa_status",
  qa: "qa_status",
  qa_status_en: "qa_status",
  حالة_المراجعة: "qa_status",
  حالة_الجودة: "qa_status",
  source_drive_id: "source_drive_id",
  drive_id: "source_drive_id",
  source_drive_file_id: "source_drive_id",
  معرف_المصدر: "source_drive_id",
  processed_image: "processed_image",
  processed_image_url: "processed_image",
  processed: "processed_image",
  الصورة_المعالجة: "processed_image",
  review_reason: "review_reason",
  hold_reason: "review_reason",
  reason: "review_reason",
  سبب_المراجعة: "review_reason",
  سبب_الرفض: "review_reason",
};

/** هل يبدو الصف الأول رأسًا للأعمدة؟ (وإلا نفترض الترتيب القياسي). */
function isHeaderRow(row: string[]): boolean {
  const known = row.filter(
    cell => HEADER_ALIASES[normalizeHeader(cell)]
  ).length;
  return known >= 2;
}

/** خريطة اسم العمود → رقم الخانة. */
function columnIndex(row: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  row.forEach((cell, index) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

const DEFAULT_INDEX: Record<string, number> = Object.fromEntries(
  PRODUCT_COLUMNS.map((name, index) => [name, index])
);

/**
 * يحوّل نص CSV إلى منتجات مطبَّعة.
 *
 * متسامح عمدًا: صف بلا اسم، أو بأعمدة ناقصة/زائدة، أو بسعر غير صالح، أو
 * برابط صورة تالف — لا يوقف بقية الكتالوج.
 *
 * الوضع الافتراضي = PUBLIC MODE: لا يعيد إلا
 *   active === true AND workflow_status === "PUBLISHED" AND qa_status === "PASS"
 * أي صف بلا حالة نشر صريحة أو بلا PASS يُستبعد (Fail-Closed).
 *
 * وضع التشخيص/الإدارة (يقرأ كل الصفوف بلا بوابة النشر):
 *   - `includeInactive: true`  (متوافق مع الاستخدام التاريخي للاختبار)
 *   - `includeNonPublished: true`
 * يستخدمان فقط في admin/diagnostics — أبدًا في Public API.
 */
export function parseProductsCsv(
  csv: string,
  options: { includeInactive?: boolean; includeNonPublished?: boolean } = {}
): Product[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];

  const hasHeader = isHeaderRow(rows[0]);
  const index = hasHeader ? columnIndex(rows[0]) : DEFAULT_INDEX;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const at = (row: string[], key: string): string => {
    const position = index[key];
    return position === undefined ? "" : clean(row[position]);
  };

  const diagnostics =
    options.includeInactive === true || options.includeNonPublished === true;
  const seen = new Set<string>();
  const products: Product[] = [];

  dataRows.forEach((row, i) => {
    const rowIndex = i + 1;
    const name = at(row, "name");
    // صف تالف/فارغ: بلا اسم لا يوجد منتج يمكن عرضه أو الاستفسار عنه.
    if (name === "") return;

    const active = parseActive(at(row, "active"));
    if (!diagnostics && !active) return;

    const rawId = at(row, "id");
    let id = rawId === "" ? `row-${rowIndex}` : rawId;
    while (seen.has(id)) id = `${id}-${rowIndex}`; // معرّفات مكررة في الشيت
    seen.add(id);

    const imageSource = at(row, "image") || null;
    const productPrompt = at(row, "product_prompt");
    // أول-فئة من الشيت؛ الطبقة القديمة من product_prompt تُستخدم فقط عندما
    // يكون العمود الفعلي فارغًا، ولا تمنح أبدًا حالة نشر.
    const workflowStatus = parseWorkflowStatus(at(row, "workflow_status"));
    const rawQa = at(row, "qa_status");
    const legacy = parseLegacyPromptMetadata(productPrompt);
    // عمود غير فارغ لكن قيمته غير معتمدة = غير معروف (لا نكمل وراءه بالطبقة القديمة).
    const qaStatus = rawQa === "" ? legacy.qaStatus : parseQaStatus(rawQa);

    products.push({
      id,
      name,
      price: parsePrice(at(row, "price")),
      category: at(row, "category"),
      description: at(row, "description"),
      image: toDisplayableImageUrl(imageSource),
      imageSource,
      active,
      sortOrder: parseSortOrder(at(row, "sort_order")),
      productPrompt,
      workflowStatus,
      qaStatus,
      sourceDriveId: at(row, "source_drive_id") || legacy.sourceDriveId,
      processedImage: at(row, "processed_image") || legacy.processedImage,
      reviewReason: at(row, "review_reason"),
      rowIndex,
    });
  });

  const sorted = sortProducts(products);
  return diagnostics ? sorted : applyPublicationGate(sorted);
}

/**
 * ترتيب: `sort_order` تصاعديًا أولًا، ثم الصفوف بلا ترتيب حسب ترتيبها في الشيت.
 * ثابت (stable) — تساوي الأرقام يحافظ على ترتيب الشيت.
 */
export function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    if (a.sortOrder !== null && b.sortOrder !== null) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.rowIndex - b.rowIndex;
    }
    if (a.sortOrder !== null) return -1;
    if (b.sortOrder !== null) return 1;
    return a.rowIndex - b.rowIndex;
  });
}

/** التصنيفات الموجودة فعلًا، بترتيب أول ظهور (لرقائق الفلترة). */
export function productCategories(products: Product[]): string[] {
  const out: string[] = [];
  for (const product of products) {
    const category = product.category.trim();
    if (category && !out.includes(category)) out.push(category);
  }
  return out;
}

/** بحث بسيط في الاسم/الوصف/التصنيف — بلا حساسية لحالة الأحرف. */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (q === "") return products;
  return products.filter(product =>
    [product.name, product.description, product.category]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

// ---------------------------------------------------------------------------
// 5) الجلب + الكاش
// ---------------------------------------------------------------------------

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> }
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/**
 * يقبل رابط "Publish to web" (`/pub?output=csv`) كما هو، ويصلح لصقًا خاطئًا
 * شائعًا: رابط تحرير الشيت العادي (`/edit#gid=0`) يُحوَّل إلى `/export?format=csv`.
 * أي رابط https آخر (استضافة CSV بديلة) يُمرَّر كما هو؛ ما ليس http(s) يُرفض،
 * و http يُقبل فقط على العنوان المحلي (اختبار/تطوير).
 */
export function normalizeSheetUrl(
  raw: string | undefined | null
): string | null {
  const url = clean(raw ?? "");
  if (url === "") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
    parsed.hostname
  );
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && isLoopback)
  )
    return null;
  if (parsed.hostname !== "docs.google.com") return parsed.toString();

  // رابط منشور بالفعل كـCSV
  if (parsed.searchParams.get("output") === "csv") return parsed.toString();
  if (parsed.pathname.endsWith("/export")) {
    parsed.searchParams.set("format", "csv");
    return parsed.toString();
  }
  // .../pub  أو  .../pubhtml → أضف output=csv
  if (/\/pub(html)?$/.test(parsed.pathname)) {
    parsed.pathname = parsed.pathname.replace(/\/pub(html)?$/, "/pub");
    parsed.searchParams.set("output", "csv");
    return parsed.toString();
  }
  // .../edit#gid=123 → /export?format=csv&gid=123
  const editMatch = parsed.pathname.match(
    /^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  );
  if (editMatch) {
    const gid =
      parsed.searchParams.get("gid") ??
      parsed.hash.match(/gid=(\d+)/)?.[1] ??
      null;
    const out = new URL(
      `https://docs.google.com/spreadsheets/d/${editMatch[1]}/export`
    );
    out.searchParams.set("format", "csv");
    if (gid) out.searchParams.set("gid", gid);
    return out.toString();
  }
  return parsed.toString();
}

/** يجلب الـCSV ويحوّله لحمولة جاهزة. يرمي عند فشل الشبكة/HTTP ليتكفل الكاش بالبديل. */
export async function fetchProductsPayload(
  sheetUrl: string | undefined | null,
  fetchImpl: FetchLike,
  options: { timeoutMs?: number; includeInactive?: boolean } = {}
): Promise<ProductsPayload> {
  const url = normalizeSheetUrl(sheetUrl);
  if (!url) {
    return {
      products: [],
      status: "not_configured",
      fetchedAt: new Date().toISOString(),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? SHEET_TIMEOUT_MS
  );
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: "text/csv,text/plain;q=0.9,*/*;q=0.8" },
    });
    if (!response.ok) throw new Error(`sheet_http_${response.status}`);
    const csv = await response.text();
    // شيت غير منشور يرد بصفحة HTML بحالة 200 — لا نعتبرها كتالوجًا فارغًا.
    if (/^\s*<(!doctype|html)/i.test(csv))
      throw new Error("sheet_not_published");
    return {
      products: parseProductsCsv(csv, options),
      status: "ok",
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 6) تجاوزات المدراء (Admin Overrides)
//
// الشيت يبقى مصدر الحقيقة للبنية والترتيب والمنتجات الجديدة، لكن لوحة الإدارة
// تسمح للمدراء بتعديل حقول محددة (الاسم/السعر/الوصف/الصورة/الظهور) تُخزَّن
// في قاعدة البيانات وتُدمج فوق بيانات الشيت عند القراءة — فيبقى التعديل
// ساريًا حتى لو غُيّر الشيت، ويظهر للزوار خلال مدة كاش المنتجات.
//
// قاعدة الدمج: الحقل غير null في التجاوز يعلو قيمة الشيت. إفراغ حقل في
// الواجهة = "لا تغيير" (لا يمكن مسح قيمة من الشيت عبر اللوحة — يُعدَّل الشيت).
// ---------------------------------------------------------------------------

/** صف تجاوز واحد كما يأتي من قاعدة البيانات/الـmanifest. */
export type ProductOverride = {
  productId: string;
  name?: string | null;
  price?: number | null;
  description?: string | null;
  image?: string | null;
  active?: boolean | null;
  updatedAt?: string | Date | null;
};

/** حمولة الـmanifest العام الذي تقرأه حافة Cloudflare من الأصل. */
export type OverridesManifest = {
  overrides: ProductOverride[];
  fetchedAt: string;
};

/**
 * يدمج تجاوزات المدراء فوق كتالوج الشيت. الحقل `null`/غير الموجود في التجاوز
 * يعني "بلا تعديل" فيبقى من الشيت. `active` يمكنه إخفاء منتج (false) أو
 * نظريًا إظهاره (true)، لكن Final Publication Guard يُطبَّق بعد الدمج فورًا:
 * لا يستطيع Override تحويل NEEDS_REVIEW / REVIEW / qa≠PASS / بلا PUBLISHED
 * إلى منتج Public — التجاوز ليس مجالًا لبيانات النشر.
 */
export function applyOverridesToProducts(
  products: Product[],
  overrides: readonly ProductOverride[]
): Product[] {
  if (overrides.length === 0) return products;
  const map = new Map<string, ProductOverride>();
  for (const o of overrides) map.set(o.productId, o);

  const out: Product[] = [];
  for (const product of products) {
    const o = map.get(product.id);
    if (!o) {
      out.push(product);
      continue;
    }
    // إخفاء عبر اللوحة: يُحذف من الكتالوج العام (يبقى في الـadmin بعلامة —
    // Gate يُطبق لاحقًا على المسار العام فقط، واللوحة تحتاج رؤية المخفي).
    if (o.active === false) continue;

    out.push({
      ...product,
      name: o.name ?? product.name,
      price: o.price !== undefined && o.price !== null ? o.price : product.price,
      description: o.description ?? product.description,
      image: o.image !== undefined && o.image !== null
        ? toDisplayableImageUrl(o.image)
        : product.image,
      imageSource: o.image !== undefined && o.image !== null ? o.image : product.imageSource,
      active: o.active === true ? true : product.active,
    });
  }
  // ملاحظة أمنية: هذه الدالة دمج فقط (تُستخدم أيضًا في admin/diagnostics).
  // Final Publication Guard تُطبق على المسار العام بعدها — worker/index.ts
  // و fetchProductsPayload (وضع public) — ولا يمكن لأي Override اجتيازها.
  return out;
}

/**
 * كاش TTL في الذاكرة مع منع الطلبات المتزامنة المكررة، ويقدّم النسخة القديمة
 * إذا فشل التحديث (stale-while-error) — الموقع لا يفرغ لمجرد تعثّر Google.
 */
export function createProductsCache(
  ttlMs: number = PRODUCTS_CACHE_TTL_MS,
  now: () => number = Date.now
) {
  let cached: ProductsPayload | null = null;
  let expiresAt = 0;
  let inflight: Promise<ProductsPayload> | null = null;

  return {
    async get(
      refresh: () => Promise<ProductsPayload>
    ): Promise<ProductsPayload> {
      if (cached && now() < expiresAt) return cached;
      inflight ??= refresh()
        .then(payload => {
          cached = payload;
          expiresAt = now() + ttlMs;
          return payload;
        })
        .catch(err => {
          if (cached) return cached; // النسخة القديمة أفضل من صفحة فارغة
          throw err;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    clear() {
      cached = null;
      expiresAt = 0;
    },
  };
}
