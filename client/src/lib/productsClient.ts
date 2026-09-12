import type { Product as BaseProduct, ProductsPayload, QaStatus, WorkflowStatus } from "@shared/products";
import { makeCatalogUrl } from "./makeGateway";

export type ProductOptionGroup = {
  name: string;
  values: string[];
};

export type ProductAvailability = "available" | "unavailable" | "preorder" | "unknown";

export type Product = BaseProduct & {
  /** العمر الأدنى الموثق فقط؛ null يعني غير معروف ولا يدخل في فلترة العمر. */
  ageMin: number | null;
  /** العمر الأقصى الموثق فقط؛ null يعني غير معروف ولا يدخل في فلترة العمر. */
  ageMax: number | null;
  galleryImages: string[];
  videoUrl: string | null;
  videoPoster: string | null;
  videoDuration: string | null;
  /** خيارات منظمة اختيارية؛ المنتجات القديمة تظل مدعومة من الوصف. */
  options: ProductOptionGroup[];
  /** العلامة التجارية كما وردت في مصدر الكتالوج؛ لا يتم استنتاجها من الاسم. */
  brand: string | null;
  /** وسوم منظمة للبحث والفلترة فقط. */
  tags: string[];
  /** حالة التوفر الموثقة؛ unknown تعني أن المصدر لم يحددها. */
  availability: ProductAvailability;
  specifications: ProductSpecifications;
};

export type ProductSpecifications = {
  productLengthCm: number | null; productWidthCm: number | null; productHeightCm: number | null;
  packageLengthCm: number | null; packageWidthCm: number | null; packageHeightCm: number | null;
  weightKg: number | null; material: string | null; piecesCount: number | null;
  powerSource: string | null; assemblyRequired: boolean | null;
  boxContents: string | null; boxContentsItems: string[]; playInstructions: string | null;
};

const EMPTY_SPECIFICATIONS: ProductSpecifications = {
  productLengthCm: null, productWidthCm: null, productHeightCm: null,
  packageLengthCm: null, packageWidthCm: null, packageHeightCm: null,
  weightKg: null, material: null, piecesCount: null, powerSource: null,
  assemblyRequired: null, boxContents: null, boxContentsItems: [], playInstructions: null,
};

export type StorefrontProductsPayload = Omit<ProductsPayload, "products"> & {
  products: Product[];
};

const CATALOG_TIMEOUT_MS = 8_000;
const PRODUCT_COLUMNS = [
  "id", "name", "price", "category", "description", "image", "active", "sort_order",
  "product_prompt", "workflow_status", "qa_status", "source_drive_id", "processed_image",
  "review_reason", "sku", "age_min", "age_max",
  "gallery_images", "video_url", "video_poster", "video_duration",
  "colors", "sizes", "product_options", "brand", "tags", "availability",
  "product_length_cm", "product_width_cm", "product_height_cm",
  "package_length_cm", "package_width_cm", "package_height_cm", "weight_kg",
  "material", "pieces_count", "power_source", "assembly_required", "box_contents", "play_instructions",
] as const;

type CatalogColumn = (typeof PRODUCT_COLUMNS)[number];

const HEADER_ALIASES: Record<string, CatalogColumn> = {
  id: "id", product_id: "id", "معرف_المنتج": "id",
  sku: "sku", "رمز_المخزون": "sku",
  name: "name", product_name: "name", "الاسم_بالعربية": "name",
  price: "price", "سعر_البيع_بالجنيه": "price",
  category: "category", "التصنيف": "category",
  description: "description", "الوصف_بالعربية": "description",
  image: "image", "الصورة_الرئيسية": "image",
  active: "active", "نشط": "active",
  sort_order: "sort_order", "ترتيب_العرض": "sort_order",
  product_prompt: "product_prompt",
  workflow_status: "workflow_status", "حالة_سير_العمل": "workflow_status",
  qa_status: "qa_status", "حالة_الجودة": "qa_status",
  source_drive_id: "source_drive_id", "معرف_المصدر_في_درايف": "source_drive_id",
  processed_image: "processed_image",
  review_reason: "review_reason", "سبب_المراجعة": "review_reason",
  age_min: "age_min", min_age: "age_min", "العمر_الأدنى": "age_min",
  age_max: "age_max", max_age: "age_max", "العمر_الأقصى": "age_max",
  gallery_images: "gallery_images", "صور_إضافية": "gallery_images",
  video_url: "video_url", "رابط_الفيديو": "video_url",
  video_poster: "video_poster", "غلاف_الفيديو": "video_poster",
  video_duration: "video_duration", "مدة_الفيديو": "video_duration",
  colors: "colors", color: "colors", "الألوان": "colors", "الالوان": "colors",
  sizes: "sizes", size: "sizes", "المقاسات": "sizes", "المقاس": "sizes",
  product_options: "product_options", options: "product_options", "خيارات_المنتج": "product_options", "الخيارات": "product_options",
  brand: "brand", manufacturer: "brand", "العلامة_التجارية": "brand", "الماركة": "brand",
  tags: "tags", tag: "tags", "الوسوم": "tags", "الكلمات_المفتاحية": "tags",
  availability: "availability", stock_status: "availability", "التوفر": "availability", "حالة_التوفر": "availability",
  product_length_cm: "product_length_cm", product_width_cm: "product_width_cm", product_height_cm: "product_height_cm",
  package_length_cm: "package_length_cm", package_width_cm: "package_width_cm", package_height_cm: "package_height_cm",
  weight_kg: "weight_kg", material: "material", pieces_count: "pieces_count", power_source: "power_source",
  assembly_required: "assembly_required", box_contents: "box_contents", play_instructions: "play_instructions",
  components: "box_contents", component: "box_contents", "المكونات": "box_contents", "مكونات_المنتج": "box_contents",
};

type SnapshotBundle = {
  toys: BaseProduct[];
  popup: BaseProduct[];
};

let snapshotBundle: SnapshotBundle | null = null;

/**
 * The last-known-good snapshots are loaded on demand (dynamic import) instead
 * of shipping inside the critical products chunk: they back the offline
 * fallback and the local-image stabilization pass, both of which run after the
 * HTML is painted, while the module loads in parallel with the live catalog
 * network request.
 */
async function loadProductSnapshots(): Promise<SnapshotBundle> {
  if (snapshotBundle) return snapshotBundle;
  const [toysModule, popupModule] = await Promise.all([
    import("./publicProductsSnapshot"),
    import("./popupProductsSnapshot"),
  ]);
  snapshotBundle = {
    toys: toysModule.PUBLIC_PRODUCTS_SNAPSHOT,
    popup: popupModule.POPUP_PRODUCTS_SNAPSHOT,
  };
  return snapshotBundle;
}

function normalizeHeader(value: unknown): string {
  return text(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function snapshotPayload(toys: BaseProduct[], popup: BaseProduct[]): StorefrontProductsPayload {
  return {
    products: [...toys, ...popup].map(product => ({
      ...product,
      ageMin: null,
      ageMax: null,
      galleryImages: [], videoUrl: null, videoPoster: null, videoDuration: null,
      options: [], brand: null, tags: [], availability: "unknown",
      specifications: EMPTY_SPECIFICATIONS,
    })),
    status: "ok",
    fetchedAt: new Date().toISOString(),
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim().replace(/\s+/g, " ")).filter(Boolean)));
}

function parsePrice(value: unknown): number | null {
  const normalized = text(value).replace(/[٬,\s]/g, "").replace(/٫/g, ".").replace(/[^0-9.-]/g, "");
  if (!normalized) return null;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function parseAge(value: unknown): number | null {
  const normalized = text(value)
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[^0-9.]/g, "");
  if (!normalized) return null;
  const age = Number(normalized);
  return Number.isFinite(age) && age >= 0 && age <= 99 ? age : null;
}

function parseActive(value: unknown): boolean {
  const normalized = text(value).toLowerCase();
  return !["false", "0", "no", "n", "off", "لا", "مخفي", "غير متاح"].includes(normalized);
}

function parseSortOrder(value: unknown): number | null {
  const normalized = text(value);
  if (!normalized) return null;
  const sortOrder = Number(normalized);
  return Number.isFinite(sortOrder) ? sortOrder : null;
}

function parseNumber(value: unknown): number | null {
  const normalized = text(value).replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseOptionalBoolean(value: unknown): boolean | null {
  const normalized = text(value).toLowerCase();
  if (["true", "1", "yes", "نعم", "مطلوب"].includes(normalized)) return true;
  if (["false", "0", "no", "لا", "غير مطلوب"].includes(normalized)) return false;
  return null;
}

function parseAvailability(value: unknown): ProductAvailability {
  const normalized = text(value).toLowerCase().replace(/[\s_-]+/g, " ");
  if (!normalized) return "unknown";
  if (["available", "in stock", "instock", "متاح", "متوفر", "موجود", "yes", "نعم"].includes(normalized)) return "available";
  if (["unavailable", "out of stock", "outofstock", "غير متاح", "غير متوفر", "نفد", "نفذت الكمية", "no", "لا"].includes(normalized)) return "unavailable";
  if (["preorder", "pre order", "طلب مسبق", "حجز مسبق"].includes(normalized)) return "preorder";
  return "unknown";
}

function parseMediaList(value: unknown): string[] {
  return uniqueList(text(value).split(/[\n,|]+/));
}

function parseSimpleList(value: unknown): string[] {
  return uniqueList(text(value).split(/[\n،,|/]+/));
}

function parseBoxContents(value: unknown): string[] {
  return uniqueList(text(value).split(/[\n،,|;+]+/));
}

function parseOptionGroups(value: unknown): ProductOptionGroup[] {
  const raw = text(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => {
          if (!item || typeof item !== "object") return null;
          const record = item as { name?: unknown; values?: unknown };
          const name = text(record.name);
          const values = Array.isArray(record.values) ? uniqueList(record.values.map(text)) : parseSimpleList(record.values);
          return name && values.length > 0 ? { name, values } : null;
        })
        .filter((group): group is ProductOptionGroup => Boolean(group));
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([name, values]) => ({ name: text(name), values: Array.isArray(values) ? uniqueList(values.map(text)) : parseSimpleList(values) }))
        .filter(group => group.name && group.values.length > 0);
    }
  } catch {
    // Fall through to the human-editable `name: a|b; name2: c|d` format.
  }

  return raw
    .split(/[;\n]+/)
    .map(segment => {
      const separator = segment.indexOf(":");
      if (separator < 1) return null;
      const name = text(segment.slice(0, separator));
      const values = parseSimpleList(segment.slice(separator + 1));
      return name && values.length > 0 ? { name, values } : null;
    })
    .filter((group): group is ProductOptionGroup => Boolean(group));
}

function mergeOptionGroups(...groups: ProductOptionGroup[][]): ProductOptionGroup[] {
  const merged = new Map<string, ProductOptionGroup>();
  for (const list of groups) {
    for (const group of list) {
      const key = group.name.trim().toLowerCase();
      const existing = merged.get(key);
      merged.set(key, { name: existing?.name ?? group.name, values: uniqueList([...(existing?.values ?? []), ...group.values]) });
    }
  }
  return Array.from(merged.values());
}

function workflowStatus(value: unknown): WorkflowStatus | null {
  const normalized = text(value).toUpperCase();
  return ["REVIEW", "PUBLISHED", "REJECTED", "DRAFT", "ERROR"].includes(normalized) ? (normalized as WorkflowStatus) : null;
}

function qaStatus(value: unknown): QaStatus | null {
  const normalized = text(value).toUpperCase();
  return ["PASS", "NEEDS_REVIEW", "FAIL"].includes(normalized) ? (normalized as QaStatus) : null;
}

function canonicalHeader(row: unknown[]): CatalogColumn[] {
  return row.map(value => {
    const normalized = normalizeHeader(value);
    return HEADER_ALIASES[normalized] ?? (normalized as CatalogColumn);
  });
}

function mapRow(row: unknown[], rowIndex: number, header: CatalogColumn[], snapshotById: Map<string, BaseProduct>): Product | null {
  const values = Object.fromEntries(PRODUCT_COLUMNS.map(column => {
    const index = header.indexOf(column);
    return [column, index >= 0 ? row[index] : undefined];
  })) as Record<CatalogColumn, unknown>;

  const name = text(values.name);
  if (!name) return null;

  const ageMin = parseAge(values.age_min);
  const ageMax = parseAge(values.age_max);
  const colors = parseSimpleList(values.colors);
  const sizes = parseSimpleList(values.sizes);
  const structuredOptions = parseOptionGroups(values.product_options);
  const options = mergeOptionGroups(
    colors.length ? [{ name: "اللون", values: colors }] : [],
    sizes.length ? [{ name: "المقاس", values: sizes }] : [],
    structuredOptions
  );
  const boxContents = nullableText(values.box_contents);

  const liveProduct: Product = {
    id: text(values.id) || `row-${rowIndex}`,
    sku: nullableText(values.sku),
    name,
    price: parsePrice(values.price),
    category: text(values.category),
    description: text(values.description),
    image: nullableText(values.image),
    imageSource: nullableText(values.image),
    active: parseActive(values.active),
    sortOrder: parseSortOrder(values.sort_order),
    productPrompt: text(values.product_prompt),
    workflowStatus: workflowStatus(values.workflow_status),
    qaStatus: qaStatus(values.qa_status),
    sourceDriveId: nullableText(values.source_drive_id),
    processedImage: nullableText(values.processed_image),
    reviewReason: nullableText(values.review_reason),
    ageMin,
    ageMax: ageMax !== null && ageMin !== null && ageMax < ageMin ? null : ageMax,
    galleryImages: parseMediaList(values.gallery_images),
    videoUrl: nullableText(values.video_url), videoPoster: nullableText(values.video_poster), videoDuration: nullableText(values.video_duration),
    options,
    brand: nullableText(values.brand),
    tags: parseSimpleList(values.tags),
    availability: parseAvailability(values.availability),
    specifications: {
      productLengthCm: parseNumber(values.product_length_cm), productWidthCm: parseNumber(values.product_width_cm), productHeightCm: parseNumber(values.product_height_cm),
      packageLengthCm: parseNumber(values.package_length_cm), packageWidthCm: parseNumber(values.package_width_cm), packageHeightCm: parseNumber(values.package_height_cm),
      weightKg: parseNumber(values.weight_kg), material: nullableText(values.material), piecesCount: parseNumber(values.pieces_count),
      powerSource: nullableText(values.power_source), assemblyRequired: parseOptionalBoolean(values.assembly_required),
      boxContents, boxContentsItems: parseBoxContents(values.box_contents), playInstructions: nullableText(values.play_instructions),
    },
    rowIndex,
  };

  const snapshot = snapshotById.get(liveProduct.id);
  const stableImage = snapshot?.image?.startsWith("/") ? snapshot.image : null;
  const stableProcessedImage = snapshot?.processedImage?.startsWith("/") ? snapshot.processedImage : stableImage;
  if (!stableImage) return liveProduct;
  return { ...liveProduct, image: stableImage, processedImage: stableProcessedImage, imageSource: liveProduct.imageSource ?? snapshot?.imageSource ?? stableImage };
}

function normalizeCatalogPayload(payload: unknown, snapshotById: Map<string, BaseProduct>): Product[] {
  if (!payload || typeof payload !== "object") return [];
  const values = (payload as { values?: unknown }).values;
  if (!Array.isArray(values) || values.length === 0) return [];
  const rows = values.filter(Array.isArray) as unknown[][];
  if (rows.length === 0) return [];
  const firstRow = canonicalHeader(rows[0]);
  const hasHeader = firstRow.some(value => PRODUCT_COLUMNS.includes(value));
  const header = hasHeader ? firstRow : [...PRODUCT_COLUMNS];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows
    .map((row, index) => mapRow(row, index + 1, header, snapshotById))
    .filter((product): product is Product => product !== null)
    .filter(product => product.active && product.workflowStatus === "PUBLISHED" && product.qaStatus === "PASS")
    .sort((a, b) => {
      if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
      if (a.sortOrder !== null) return -1;
      if (b.sortOrder !== null) return 1;
      return a.rowIndex - b.rowIndex;
    });
}

async function fetchLiveCatalogBody(): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
  try {
    const response = await fetch(makeCatalogUrl(), { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Catalog gateway returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function mergePopupProducts(liveProducts: Product[], popupProducts: BaseProduct[]): Product[] {
  const merged = new Map<string, Product>();
  for (const product of liveProducts) merged.set(product.id, product);
  for (const product of popupProducts) {
    if (!merged.has(product.id)) {
      merged.set(product.id, {
        ...product,
        ageMin: null,
        ageMax: null,
        galleryImages: [], videoUrl: null, videoPoster: null, videoDuration: null,
        options: [], brand: null, tags: [], availability: "unknown",
        specifications: EMPTY_SPECIFICATIONS,
      });
    }
  }
  return Array.from(merged.values()).sort((a, b) => {
    if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
    if (a.sortOrder !== null) return -1;
    if (b.sortOrder !== null) return 1;
    return a.rowIndex - b.rowIndex;
  });
}

/**
 * Loads the live publication catalog. POP UP products are merged with the live
 * catalog until the public gateway reflects the newly published sheet rows.
 * This keeps toys authoritative from the live source while preventing POP UP
 * from disappearing because of an upstream publication/cache lag.
 *
 * The local snapshots load in parallel with the network request (dynamic
 * import), so the offline fallback stays available without shipping ~30KB of
 * catalog text inside the critical JS path.
 */
export async function fetchProducts(): Promise<StorefrontProductsPayload> {
  try {
    const [snapshots, liveBody] = await Promise.all([loadProductSnapshots(), fetchLiveCatalogBody()]);
    const snapshotById = new Map<string, BaseProduct>(
      [...snapshots.toys, ...snapshots.popup].map(product => [product.id, product])
    );
    const products = normalizeCatalogPayload(liveBody, snapshotById);
    if (products.length > 0) {
      return {
        products: mergePopupProducts(products, snapshots.popup),
        status: "ok",
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    // Fall through to the bundled production snapshot.
  }
  const snapshots = await loadProductSnapshots();
  return snapshotPayload(snapshots.toys, snapshots.popup);
}
