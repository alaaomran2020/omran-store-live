import type { Product as BaseProduct, ProductsPayload, QaStatus, WorkflowStatus } from "@shared/products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";
import { makeCatalogUrl } from "./makeGateway";

export type Product = BaseProduct & {
  /** العمر الأدنى الموثق فقط؛ null يعني غير معروف ولا يدخل في فلترة العمر. */
  ageMin: number | null;
  /** العمر الأقصى الموثق فقط؛ null يعني غير معروف ولا يدخل في فلترة العمر. */
  ageMax: number | null;
};

export type StorefrontProductsPayload = Omit<ProductsPayload, "products"> & {
  products: Product[];
};

const CATALOG_TIMEOUT_MS = 8_000;
const PRODUCT_COLUMNS = [
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
  "sku",
  "age_min",
  "age_max",
] as const;

type CatalogColumn = (typeof PRODUCT_COLUMNS)[number];

const HEADER_ALIASES: Record<string, CatalogColumn> = {
  id: "id",
  product_id: "id",
  "معرف_المنتج": "id",
  sku: "sku",
  "رمز_المخزون": "sku",
  name: "name",
  product_name: "name",
  "الاسم_بالعربية": "name",
  price: "price",
  "سعر_البيع_بالجنيه": "price",
  category: "category",
  "التصنيف": "category",
  description: "description",
  "الوصف_بالعربية": "description",
  image: "image",
  "الصورة_الرئيسية": "image",
  active: "active",
  "نشط": "active",
  sort_order: "sort_order",
  "ترتيب_العرض": "sort_order",
  product_prompt: "product_prompt",
  workflow_status: "workflow_status",
  "حالة_سير_العمل": "workflow_status",
  qa_status: "qa_status",
  "حالة_الجودة": "qa_status",
  source_drive_id: "source_drive_id",
  "معرف_المصدر_في_درايف": "source_drive_id",
  processed_image: "processed_image",
  review_reason: "review_reason",
  "سبب_المراجعة": "review_reason",
  age_min: "age_min",
  min_age: "age_min",
  "العمر_الأدنى": "age_min",
  age_max: "age_max",
  max_age: "age_max",
  "العمر_الأقصى": "age_max",
};

const snapshotById = new Map(PUBLIC_PRODUCTS_SNAPSHOT.map(product => [product.id, product]));

function normalizeHeader(value: unknown): string {
  return text(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function snapshotPayload(): StorefrontProductsPayload {
  return {
    products: PUBLIC_PRODUCTS_SNAPSHOT.map(product => ({
      ...product,
      ageMin: null,
      ageMax: null,
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

function parsePrice(value: unknown): number | null {
  const normalized = text(value)
    .replace(/[٬,\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/[^0-9.-]/g, "");
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

function workflowStatus(value: unknown): WorkflowStatus | null {
  const normalized = text(value).toUpperCase();
  return ["REVIEW", "PUBLISHED", "REJECTED", "DRAFT", "ERROR"].includes(normalized)
    ? (normalized as WorkflowStatus)
    : null;
}

function qaStatus(value: unknown): QaStatus | null {
  const normalized = text(value).toUpperCase();
  return ["PASS", "NEEDS_REVIEW", "FAIL"].includes(normalized)
    ? (normalized as QaStatus)
    : null;
}

function canonicalHeader(row: unknown[]): CatalogColumn[] {
  return row.map(value => {
    const normalized = normalizeHeader(value);
    return HEADER_ALIASES[normalized] ?? (normalized as CatalogColumn);
  });
}

function mapRow(row: unknown[], rowIndex: number, header: CatalogColumn[]): Product | null {
  const values = Object.fromEntries(
    PRODUCT_COLUMNS.map(column => {
      const index = header.indexOf(column);
      return [column, index >= 0 ? row[index] : undefined];
    })
  ) as Record<CatalogColumn, unknown>;

  const name = text(values.name);
  if (!name) return null;

  const ageMin = parseAge(values.age_min);
  const ageMax = parseAge(values.age_max);

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
    rowIndex,
  };

  // Production should prefer the verified same-origin asset bundled with the
  // storefront whenever that product already exists in the last-known-good
  // snapshot. Live catalog data remains authoritative for name/category/price/
  // age/status, while the snapshot supplies a stable image path and prevents
  // Drive/CDN/browser failures from producing blank cards.
  const snapshot = snapshotById.get(liveProduct.id);
  const stableImage = snapshot?.image?.startsWith("/") ? snapshot.image : null;
  const stableProcessedImage = snapshot?.processedImage?.startsWith("/")
    ? snapshot.processedImage
    : stableImage;

  if (!stableImage) return liveProduct;

  return {
    ...liveProduct,
    image: stableImage,
    processedImage: stableProcessedImage,
    imageSource: liveProduct.imageSource ?? snapshot?.imageSource ?? stableImage,
  };
}

function normalizeCatalogPayload(payload: unknown): Product[] {
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
    .map((row, index) => mapRow(row, index + 1, header))
    .filter((product): product is Product => product !== null)
    .filter(product => product.active && product.workflowStatus === "PUBLISHED" && product.qaStatus === "PASS")
    .sort((a, b) => {
      if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
      if (a.sortOrder !== null) return -1;
      if (b.sortOrder !== null) return 1;
      return a.rowIndex - b.rowIndex;
    });
}

async function fetchLiveCatalog(): Promise<StorefrontProductsPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);

  try {
    const response = await fetch(makeCatalogUrl(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Catalog gateway returned ${response.status}`);

    const body = await response.json();
    const products = normalizeCatalogPayload(body);

    return {
      products,
      status: products.length > 0 ? "ok" : "not_configured",
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Loads the live publication catalog. If the live source is temporarily
 * unavailable, the bundled snapshot remains a fail-safe fallback. Snapshot
 * products deliberately carry null ages unless age data was explicitly
 * verified in the source; unknown age is never inferred from descriptions.
 */
export async function fetchProducts(): Promise<StorefrontProductsPayload> {
  try {
    const live = await fetchLiveCatalog();
    if (live.products.length > 0) return live;
  } catch {
    // Fall through to the bundled production snapshot.
  }

  return snapshotPayload();
}
