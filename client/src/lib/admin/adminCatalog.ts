/**
 * طبقة وصول الإدارة للكتالوج الكامل. الإدارة تعتمد على البوابة الحية فقط؛
 * يمكن للبوابة إرجاع صفوف SQL-shaped أو مصفوفة values القديمة أثناء الانتقال.
 * لا يستخدم Admin ملف CSV المضمّن أو snapshots كبديل قابل للتعديل.
 */
import {
  parseCsv,
  parseProductsCsv,
  type Product,
} from "@shared/products";
import { MAKE_GATEWAY_URL } from "@/lib/makeGateway";
import { inferSourceBrand, type ImageReadiness, type SourceBrand } from "@shared/catalogQuality";
import { mapSqlProductRow } from "@shared/sqlCoreEntities";

export type AdminAvailability =
  | "available"
  | "unavailable"
  | "preorder"
  | "unknown";

export type AdminProduct = Product & {
  tags: string[];
  availability: AdminAvailability;
  sourceBrand: SourceBrand;
  imageReadiness: ImageReadiness;
  /** قيمة workflow_status الخام كما وردت (لرصد القيم غير المعتمدة). */
  rawWorkflow: string | null;
};

export type AdminCatalogSource = "live-gateway" | "unavailable";

export type AdminCatalogPayload = {
  products: AdminProduct[];
  source: AdminCatalogSource;
  fetchedAt: string;
  error?: string;
};

const ADMIN_TIMEOUT_MS = 10_000;

/** RFC 4180: يحوّل صفوف قيم من بوابة JSON إلى نص CSV يعيد استخدامه محلل الشيت. */
function rowsToCsv(rows: readonly (readonly unknown[])[]): string {
  return rows
    .map(row =>
      row
        .map(cell => {
          const text = cell === null || cell === undefined ? "" : String(cell);
          if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
          return text;
        })
        .join(",")
    )
    .join("\r\n");
}

function splitList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n،,|/]+/)
        .map(v => v.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    )
  );
}

export function parseAvailability(value: string | null | undefined): AdminAvailability {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!normalized) return "unknown";
  if (["available", "in stock", "instock", "متاح", "متوفر", "موجود", "نعم", "yes"].includes(normalized)) {
    return "available";
  }
  if (["unavailable", "out of stock", "outofstock", "غير متاح", "غير متوفر", "نفد", "نفذت الكمية", "لا", "no"].includes(normalized)) {
    return "unavailable";
  }
  if (["preorder", "pre order", "طلب مسبق", "حجز مسبق"].includes(normalized)) return "preorder";
  return "unknown";
}

function imageReadinessOf(product: Product): ImageReadiness {
  const candidate = product.processedImage || product.image || "";
  if (!candidate) return "none";
  if (candidate.startsWith("/")) return "local";
  if (/drive\.google\.com/.test(candidate)) return "drive";
  return "local";
}

function enrich(
  product: Product,
  extras: { tags?: string[]; availability?: AdminAvailability; rawWorkflow?: string | null }
): AdminProduct {
  const sourceBrand = inferSourceBrand(product);
  return {
    ...product,
    tags: extras.tags ?? [],
    availability: extras.availability ?? "unknown",
    sourceBrand,
    imageReadiness: imageReadinessOf(product),
    rawWorkflow: extras.rawWorkflow ?? product.workflowStatus ?? null,
  };
}

const RAW_HEADER_ALIASES: Record<string, string> = {
  availability: "availability",
  stock_status: "availability",
  "حالة التوفر": "availability",
  "التوفر": "availability",
  tags: "tags",
  "الوسوم": "tags",
  "الكلمات المفتاحية": "tags",
  workflow_status: "workflow_status",
  "حالة النشر": "workflow_status",
};

/** إثراء إضافي للأعمدة الموسّعة (availability/tags) من صفوف البوابة الخام. */
function extrasFromRows(rows: readonly (readonly unknown[])[]): Map<string, { tags: string[]; availability: AdminAvailability; rawWorkflow: string | null }> {
  const extras = new Map<string, { tags: string[]; availability: AdminAvailability; rawWorkflow: string | null }>();
  if (rows.length === 0) return extras;
  const header = rows[0].map(cell =>
    String(cell ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  );
  const index = (name: string) => header.indexOf(name);
  const idIndex = index("id");
  const availabilityIndex = index(RAW_HEADER_ALIASES.availability);
  const tagsIndex = index("tags");
  const workflowIndex = index("workflow_status");
  for (const row of rows.slice(1)) {
    const id = idIndex >= 0 ? String(row[idIndex] ?? "").trim() : "";
    if (!id) continue;
    extras.set(id, {
      tags: tagsIndex >= 0 ? splitList(String(row[tagsIndex] ?? "")) : [],
      availability:
        availabilityIndex >= 0
          ? parseAvailability(String(row[availabilityIndex] ?? ""))
          : "unknown",
      rawWorkflow: workflowIndex >= 0 ? String(row[workflowIndex] ?? "").trim() : null,
    });
  }
  return extras;
}

/** يحوّل حمولة البوابة {values: [[...]]} إلى منتجات إدارية (بلا فلترة نشر). */
export function normalizeAdminGatewayPayload(payload: unknown): AdminProduct[] {
  if (!payload || typeof payload !== "object") return [];

  const sqlRows = (payload as { products?: unknown }).products;
  if (Array.isArray(sqlRows)) {
    return sqlRows.flatMap(row => {
      const product = mapSqlProductRow(row);
      if (!product) return [];
      const record = row && typeof row === "object" ? row as Record<string, unknown> : {};
      return [enrich(product, {
        tags: Array.isArray(record.tags) ? record.tags.map(String) : [],
        availability: parseAvailability(typeof record.availability === "string" ? record.availability : null),
        rawWorkflow: typeof record.workflow_status === "string" ? record.workflow_status : null,
      })];
    });
  }

  const values = (payload as { values?: unknown }).values;
  if (!Array.isArray(values) || values.length === 0) return [];
  const rows = values.filter(Array.isArray) as unknown[][];
  if (rows.length === 0) return [];

  const extrasMap = extrasFromRows(rows);
  const csv = rowsToCsv(rows);
  const parsed = parseProductsCsv(csv, { includeInactive: true });
  return parsed.map(product => {
    const extras = extrasMap.get(product.id);
    return enrich(product, {
      tags: extras?.tags,
      availability: extras?.availability,
      rawWorkflow: extras?.rawWorkflow,
    });
  });
}

async function fetchGatewayCatalog(signal?: AbortSignal): Promise<AdminProduct[]> {
  const url = new URL(MAKE_GATEWAY_URL);
  url.searchParams.set("action", "catalog");
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`gateway_http_${response.status}`);
  const body = await response.json();
  const products = normalizeAdminGatewayPayload(body);
  if (products.length === 0) throw new Error("gateway_empty_catalog");
  return products;
}

/**
 * Admin operations use the live gateway only. Storefront fallbacks remain separate
 * and are never treated as an editable Admin source.
 */
export async function fetchAdminCatalog(): Promise<AdminCatalogPayload> {
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ADMIN_TIMEOUT_MS);
  try {
    const live = await fetchGatewayCatalog(controller.signal);
    return { products: live, source: "live-gateway", fetchedAt: new Date().toISOString() };
  } catch (error) {
    return {
      products: [],
      source: "unavailable",
      fetchedAt,
      error: error instanceof Error ? error.message : "live_gateway_unavailable",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** عدد صفوف بيانات CSV خام — فائدة اختبارية/تشخيصية. */
export function countCsvDataRows(csv: string): number {
  const rows = parseCsv(csv);
  return rows.length > 0 ? rows.length - 1 : 0;
}
