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
 * أي شيء آخر (فارغ، نص، سالب) → null، ويعرضه الموقع كـ"السعر عند الطلب".
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
  // نقبل http/https فقط؛ أي شيء آخر (javascript:, data:) يُرفض.
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
 * برابط صورة تالف — لا يوقف بقية الكتالوج. `includeInactive` للاختبار/التشخيص
 * فقط؛ الموقع العام يستدعيها بالوضع الافتراضي (المعروض فقط).
 */
export function parseProductsCsv(
  csv: string,
  options: { includeInactive?: boolean } = {}
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

  const seen = new Set<string>();
  const products: Product[] = [];

  dataRows.forEach((row, i) => {
    const rowIndex = i + 1;
    const name = at(row, "name");
    // صف تالف/فارغ: بلا اسم لا يوجد منتج يمكن عرضه أو الاستفسار عنه.
    if (name === "") return;

    const active = parseActive(at(row, "active"));
    if (!active && !options.includeInactive) return;

    const rawId = at(row, "id");
    let id = rawId === "" ? `row-${rowIndex}` : rawId;
    while (seen.has(id)) id = `${id}-${rowIndex}`; // معرّفات مكررة في الشيت
    seen.add(id);

    const imageSource = at(row, "image") || null;

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
      productPrompt: at(row, "product_prompt"),
      rowIndex,
    });
  });

  return sortProducts(products);
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
