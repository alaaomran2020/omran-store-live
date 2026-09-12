/**
 * حالة فهرسة صفحات الكتالوج — state machine نقية (قابلة للاختبار بدون DOM).
 *
 * قاعدة منع index bloat:
 *   - حالة البحث/الفلتر/الفرز (`?search=...`، `?category=...`، `?age=...`،
 *     `?sort=...` ...) هي "temporary filtered state" وليست صفحات لاندنق →
 *     `noindex,follow` (المستخدم يستخدمها طبيعياً، ولا نمنع متصفحات من
 *     اتباع الروابط).
 *   - رابط منتج حقيقي (`?product=<id>`) موجود في الكتالوج → indexable.
 *   - `?product=<id>` غير موجود أو يخص الكتالوج الآخر (alias/soft-404) →
 *     `noindex,follow` — أفضل سلوك client-side ممكن بدون Backend جديد.
 *   - رابط الكتالوج الصافي → indexable.
 */

const TRANSIENT_PARAMS = new Set([
  "search",
  "category",
  "age",
  "brand",
  "tag",
  "availability",
  "sort",
]);

export type CatalogIndexingInput = {
  /** params الحالية في URL (قيم فارغة = غائبة). */
  urlParams: Readonly<Record<string, string | null>>;
  /** dialog منتج مفتوح (المنتج موجود في هذا الكتالوج). */
  productOpen: boolean;
  /** هل تم تحميل الكتالوج؟ null قبل التحميل (لا حسم بعد). */
  catalogLoaded: boolean;
  /** هل رابط `?product=` الحالي يشير إلى منتج موجود في هذا الكتالوج؟ */
  productFoundInCatalog: boolean;
};

export type CatalogIndexingState = {
  robots: "index,follow" | "noindex,follow";
  /** true عندما يكون السبب noindex — لتوثيق السبب في الاختبارات. */
  reason: "product-open" | "missing-product-param" | "transient-filters" | "clean";
};

export function resolveCatalogIndexing(input: CatalogIndexingInput): CatalogIndexingState {
  const params = input.urlParams;
  const productParam = (params.product ?? "").trim();

  if (productOpen(input, productParam)) {
    return { robots: "index,follow", reason: "product-open" };
  }

  if (productParam) {
    if (input.catalogLoaded && !input.productFoundInCatalog) {
      return { robots: "noindex,follow", reason: "missing-product-param" };
    }
    // قيد التحميل: لا نقرر بعد (يبقى الافتراضي indexable لحظياً حتى يثبت العكس).
    return { robots: "index,follow", reason: "product-open" };
  }

  for (const key of Object.keys(params)) {
    const value = (params[key] ?? "").trim();
    if (value && TRANSIENT_PARAMS.has(key)) {
      return { robots: "noindex,follow", reason: "transient-filters" };
    }
  }

  return { robots: "index,follow", reason: "clean" };
}

function productOpen(input: CatalogIndexingInput, productParam: string): boolean {
  return input.productOpen || Boolean(productParam && input.catalogLoaded && input.productFoundInCatalog);
}
