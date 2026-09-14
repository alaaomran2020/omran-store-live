/**
 * OMRAN TOYS — اشتقاق مؤشرات لوحة التحكم التشغيلية.
 *
 * كل الأرقام هنا مشتقة من بيانات حقيقية فقط:
 *   - الكتالوج الكامل (بما فيه غير المنشور) للمنتجات/الأقسام/الجودة/المخزون.
 *   - سجلّات الأحداث الواردة من بوابة التحليلات لضغطات واتساب والنشاط.
 *
 * لا تُشتق هنا أي قيم مالية (مبيعات/أرباح/طلبات) — ليست موجودة في مصادر
 * المتجر الحالية، وغيابها يُعبَّر عنه بصدق بدل اختراعه.
 */

import { isPubliclyVisible, type Product } from "./products";
import {
  runCatalogQuality,
  type QualityInput,
  type SourceBrand,
} from "./catalogQuality";

export type InventoryBucket =
  | "available"
  | "unavailable"
  | "preorder"
  | "unknown";

export type AdminProductLike = Product &
  QualityInput & {
    availability?: string | null;
    sourceBrand?: SourceBrand | null;
  };

export type CatalogKpis = {
  total: number;
  omranTotal: number;
  popupTotal: number;
  published: number;
  inReview: number;
  drafts: number;
  rejected: number;
  hidden: number;
  missingWorkflow: number;
  qaPass: number;
  qaNeedsReview: number;
  qaFail: number;
  qaUnverified: number;
  categories: number;
  withPrice: number;
  inquiryOnly: number;
  inventory: Record<InventoryBucket, number>;
  quality: { critical: number; warning: number; info: number; total: number };
};

function inventoryBucket(product: AdminProductLike): InventoryBucket {
  const value = (product.availability ?? "unknown").trim().toLowerCase();
  if (value === "available" || value === "in_stock" || value === "instock") return "available";
  if (value === "unavailable" || value === "out_of_stock" || value === "outofstock") return "unavailable";
  if (value === "preorder" || value === "pre_order") return "preorder";
  return "unknown";
}

export function summarizeCatalog(products: readonly AdminProductLike[]): CatalogKpis {
  const kpis: CatalogKpis = {
    total: products.length,
    omranTotal: 0,
    popupTotal: 0,
    published: 0,
    inReview: 0,
    drafts: 0,
    rejected: 0,
    hidden: 0,
    missingWorkflow: 0,
    qaPass: 0,
    qaNeedsReview: 0,
    qaFail: 0,
    qaUnverified: 0,
    categories: 0,
    withPrice: 0,
    inquiryOnly: 0,
    inventory: { available: 0, unavailable: 0, preorder: 0, unknown: 0 },
    quality: { critical: 0, warning: 0, info: 0, total: 0 },
  };

  const categoryNames = new Set<string>();
  for (const product of products) {
    const brand = product.sourceBrand ?? (/^pop(up)?[-_]/i.test(product.id) ? "POPUP" : "OMRAN");
    if (brand === "POPUP") kpis.popupTotal += 1;
    else kpis.omranTotal += 1;

    if (isPubliclyVisible(product)) kpis.published += 1;
    if (!product.active) kpis.hidden += 1;

    switch (product.workflowStatus) {
      case "REVIEW":
        kpis.inReview += 1;
        break;
      case "DRAFT":
        kpis.drafts += 1;
        break;
      case "REJECTED":
      case "ERROR":
        kpis.rejected += 1;
        break;
      case null:
      case undefined:
        kpis.missingWorkflow += 1;
        break;
      // PUBLISHED: لا عدّ إضافي
    }

    switch (product.qaStatus) {
      case "PASS":
        kpis.qaPass += 1;
        break;
      case "NEEDS_REVIEW":
        kpis.qaNeedsReview += 1;
        break;
      case "FAIL":
        kpis.qaFail += 1;
        break;
      default:
        kpis.qaUnverified += 1;
    }

    const category = product.category.trim();
    if (category) categoryNames.add(`${brand}:${category}`);

    if (product.price !== null && product.price !== undefined && Number.isFinite(product.price)) {
      kpis.withPrice += 1;
    } else if (isPubliclyVisible(product)) {
      kpis.inquiryOnly += 1;
    }

    kpis.inventory[inventoryBucket(product)] += 1;
  }

  kpis.categories = categoryNames.size;

  const quality = runCatalogQuality(products).counts;
  kpis.quality = {
    critical: quality.critical,
    warning: quality.warning,
    info: quality.info,
    total: quality.total,
  };

  return kpis;
}

export type DistributionSlice = { key: string; label: string; count: number };

/** توزيع حالات النشر (للرسم الدائري). */
export function workflowDistribution(products: readonly AdminProductLike[]): DistributionSlice[] {
  const buckets: Record<string, number> = {
    PUBLISHED: 0,
    REVIEW: 0,
    DRAFT: 0,
    REJECTED: 0,
    MISSING: 0,
  };
  for (const product of products) {
    if (product.workflowStatus === null) buckets.MISSING += 1;
    else if (product.workflowStatus === "ERROR") buckets.REJECTED += 1;
    else buckets[product.workflowStatus] += 1;
  }
  const labels: Record<string, string> = {
    PUBLISHED: "منشور",
    REVIEW: "تحت المراجعة",
    DRAFT: "مسودة",
    REJECTED: "مرفوض/خطأ",
    MISSING: "غير موثّق",
  };
  return Object.entries(buckets)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, label: labels[key], count }));
}

/** المنتجات حسب القسم (أعلى N)، مع فصل المصدر. */
export function productsByCategory(
  products: readonly AdminProductLike[],
  options: { brand?: SourceBrand; limit?: number } = {}
): DistributionSlice[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    const brand = product.sourceBrand ?? (/^pop(up)?[-_]/i.test(product.id) ? "POPUP" : "OMRAN");
    if (options.brand && brand !== options.brand) continue;
    const category = product.category.trim();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ar"))
    .slice(0, options.limit ?? 12);
}

/** توزيع حالات المخزون/التوفر. */
export function inventoryDistribution(
  products: readonly AdminProductLike[]
): DistributionSlice[] {
  const labels: Record<InventoryBucket, string> = {
    available: "متوفر",
    unavailable: "نفد من المخزون",
    preorder: "طلب مسبق",
    unknown: "بلا بيانات مخزون",
  };
  const buckets: Record<InventoryBucket, number> = {
    available: 0,
    unavailable: 0,
    preorder: 0,
    unknown: 0,
  };
  for (const product of products) buckets[inventoryBucket(product)] += 1;
  return (Object.keys(buckets) as InventoryBucket[])
    .filter(key => buckets[key] > 0)
    .map(key => ({ key, label: labels[key], count: buckets[key] }));
}

/** توزيع قرارات الجودة. */
export function qaDistribution(products: readonly AdminProductLike[]): DistributionSlice[] {
  const buckets = { PASS: 0, NEEDS_REVIEW: 0, FAIL: 0, UNVERIFIED: 0 };
  for (const product of products) {
    if (product.qaStatus === "PASS") buckets.PASS += 1;
    else if (product.qaStatus === "NEEDS_REVIEW") buckets.NEEDS_REVIEW += 1;
    else if (product.qaStatus === "FAIL") buckets.FAIL += 1;
    else buckets.UNVERIFIED += 1;
  }
  const labels: Record<keyof typeof buckets, string> = {
    PASS: "اجتاز",
    NEEDS_REVIEW: "يحتاج مراجعة",
    FAIL: "راسب",
    UNVERIFIED: "بلا قرار جودة",
  };
  return Object.entries(buckets)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, label: labels[key as keyof typeof buckets], count }));
}

// ---------------------------------------------------------------------------
// السلاسل الزمنية (أحداث حقيقية فقط من بوابة التحليلات/التدقيق)
// ---------------------------------------------------------------------------

export type DatedEvent = { occurredAt: string | Date; name?: string };

export type TimeSeriesPoint = { date: string; label: string; count: number };

/**
 * يبني سلسلة يومية لعدد الأحداث آخر N يومًا. الأيام بلا أحداث = صفر بوضوح
 * (لا تُخترَع بيانات). المدخلات يجب أن تكون أحداثًا حقيقية من البوابة.
 */
export function dailyEventSeries(
  events: readonly DatedEvent[],
  days: number,
  now: Date = new Date()
): TimeSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const date = new Date(event.occurredAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const points: TimeSeriesPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - offset);
    date.setUTCHours(12, 0, 0, 0); // ثبات ضد إزاحة اليوم
    const key = date.toISOString().slice(0, 10);
    points.push({
      date: key,
      label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
      count: counts.get(key) ?? 0,
    });
  }
  return points;
}

export type CountedItem = { key: string; label: string; count: number };

/** أعلى العناصر تكرارًا من أحداث ذات مفتاح (مثل product_id في ضغطات واتساب). */
export function topItems(
  events: ReadonlyArray<Record<string, unknown>>,
  key: string,
  labelKey: string | null,
  limit = 8
): CountedItem[] {
  const counts = new Map<string, { count: number; label: string }>();
  for (const event of events) {
    const value = event[key];
    if (value === null || value === undefined || String(value).trim() === "") continue;
    const id = String(value);
    const label = labelKey ? String(event[labelKey] ?? id) : id;
    const existing = counts.get(id);
    if (existing) existing.count += 1;
    else counts.set(id, { count: 1, label: label || id });
  }
  return [...counts.entries()]
    .map(([keyName, value]) => ({ key: keyName, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ar"))
    .slice(0, limit);
}

/** يلخّص ضغطات واتساب من سجل أحداث حقيقي. */
export function summarizeWhatsAppClicks(events: ReadonlyArray<Record<string, unknown>>, now: Date = new Date()) {
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  let today = 0;
  let last7 = 0;
  const dated: DatedEvent[] = [];
  for (const event of events) {
    const time = Date.parse(String(event.occurredAt ?? event.event_at ?? ""));
    if (Number.isNaN(time)) continue;
    dated.push({ occurredAt: new Date(time) });
    if (time >= dayAgo) today += 1;
    if (time >= weekAgo) last7 += 1;
  }
  return {
    total: events.length,
    today,
    last7,
    trend: dailyEventSeries(dated, 14, now),
    topProducts: topItems(events, "product_id", "product_name", 8),
    topCategories: topItems(events, "category", null, 8),
  };
}
