/**
 * OMRAN TOYS — مركز جودة الكتالوج (Data Quality Center).
 *
 * قواعد ميكانيكية مشتقة بالكامل من بيانات المنتجات الفعلية — لا تقدير ولا
 * اجتهاد بصري. كل قاعدة لها severity وثابتة وقابلة للاختبار:
 *
 *   CRITICAL — منتج منشور للجمهور فيه خلل يمنع البيع/الثقة، أو تعارض نشر.
 *   WARNING — بيانات ناقصة تضعف العرض/البحث لكنها لا تمنع النشر وحدها.
 *   INFO    — تحسينات توثيق/تشغيل.
 *
 * لا تُخترع مشاكل: البيانات الغائبة يُعبَّر عنها كغائبة فقط.
 */

import {
  isPubliclyVisible,
  normalizeProductName,
  type Product,
  type QaStatus,
  type WorkflowStatus,
} from "./products";

export type SourceBrand = "OMRAN" | "POPUP";

export type QualityRule =
  | "MISSING_TITLE"
  | "MISSING_IMAGE"
  | "BROKEN_IMAGE_REFERENCE"
  | "MISSING_CATEGORY"
  | "MISSING_DESCRIPTION"
  | "MISSING_TAGS"
  | "MISSING_SKU"
  | "DUPLICATE_SKU"
  | "INVALID_SKU"
  | "DUPLICATE_PUBLIC_NAME"
  | "MISSING_WORKFLOW_STATUS"
  | "INVALID_WORKFLOW_STATUS"
  | "PUBLISHED_WITHOUT_QA_PASS"
  | "PUBLICATION_CONFLICT"
  | "HIDDEN_PUBLIC_RECORD"
  | "NO_INVENTORY_DATA"
  | "BRAND_SOURCE_MISMATCH";

export type QualitySeverity = "CRITICAL" | "WARNING" | "INFO";

export type QualityIssue = {
  rule: QualityRule;
  severity: QualitySeverity;
  productId: string;
  productName: string;
  sourceBrand: SourceBrand;
  message: string;
  /** رمز ثابت للمسار داخل اللوحة. */
  anchor: string;
};

export type ImageReadiness = "local" | "drive" | "none";

export type QualityInput = Product & {
  tags?: readonly string[] | null;
  availability?: string | null;
  /** العلامة المصدرية الصريحة إن وُجدت من طبقة الدمج. */
  sourceBrand?: SourceBrand | null;
  /**
   * جاهزية الصورة كما تحسبها طبقة الكتالوج:
   * local = أصل Same-origin مُعالَج؛ drive = رابط Google Drive خارجي؛
   * none = لا صورة.
   */
  imageReadiness?: ImageReadiness;
};

export const QUALITY_RULE_LABELS_AR: Record<QualityRule, string> = {
  MISSING_TITLE: "منتج بلا اسم",
  MISSING_IMAGE: "منتج بلا صورة",
  BROKEN_IMAGE_REFERENCE: "مرجع صورة غير صالح للعرض",
  MISSING_CATEGORY: "بلا قسم",
  MISSING_DESCRIPTION: "بلا وصف",
  MISSING_TAGS: "بلا وسوم",
  MISSING_SKU: "بلا رمز مخزون (SKU)",
  DUPLICATE_SKU: "رمز مخزون مكرر",
  INVALID_SKU: "رمز مخزون غير صالح",
  DUPLICATE_PUBLIC_NAME: "اسم منتج عام مكرر",
  MISSING_WORKFLOW_STATUS: "حالة نشر غير موثقة",
  INVALID_WORKFLOW_STATUS: "حالة نشر غير معتمدة",
  PUBLISHED_WITHOUT_QA_PASS: "منشور بدون اجتياز الجودة",
  PUBLICATION_CONFLICT: "تعارض في حالة النشر/الجودة",
  HIDDEN_PUBLIC_RECORD: "سجل منشور لكنه مخفي",
  NO_INVENTORY_DATA: "بلا بيانات مخزون",
  BRAND_SOURCE_MISMATCH: "اختلاط مصدر Omran / POP UP",
};

/** يخمّن العلامة التجارية المصدرية من معرّف المنتج فقط (POP-* / OMR-*). */
export function inferSourceBrand(product: Pick<Product, "id">): SourceBrand {
  return /^pop(up)?[-_]/i.test(product.id) ? "POPUP" : "OMRAN";
}

const KNOWN_WORKFLOW: readonly WorkflowStatus[] = [
  "REVIEW",
  "PUBLISHED",
  "REJECTED",
  "DRAFT",
  "ERROR",
];
const KNOWN_QA: readonly QaStatus[] = ["PASS", "NEEDS_REVIEW", "FAIL"];

/** روابط Google Drive الخام (uc?export=view) لا تُعرض بايتات الصورة باستقرار. */
function isUnstableDriveImage(image: string | null): boolean {
  if (!image) return false;
  return /drive\.google\.com\/(uc|open)\b/i.test(image) && !/\/thumbnail\b/.test(image);
}

function isValidSku(sku: string): boolean {
  const value = sku.trim();
  if (value.length < 3 || value.length > 48) return false;
  if (/\s/.test(value)) return false;
  // حروف/أرقام/شرطات فقط
  return /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value);
}

export type QualityRunResult = {
  issues: QualityIssue[];
  counts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    byRule: Partial<Record<QualityRule, number>>;
  };
  productsWithIssues: Set<string>;
};

/**
 * يفحص كل المنتجات (بما فيها غير المنشورة) ويعيد مشاكل الجودة المشتقة.
 * @param rawWorkflowValues قيم خام لحقل workflow_status كما وردت من المصدر
 *        (لاكتشاف القيم غير المعتمدة بدل المفقودة فقط).
 */
export function runCatalogQuality(
  products: readonly QualityInput[],
  options: { rawWorkflow?: Record<string, string | null | undefined> } = {}
): QualityRunResult {
  const issues: QualityIssue[] = [];
  const byRule: Partial<Record<QualityRule, number>> = {};

  const push = (issue: QualityIssue) => {
    issues.push(issue);
    byRule[issue.rule] = (byRule[issue.rule] ?? 0) + 1;
  };

  // تجميعات قبل الفحص الفردي
  const skuOwners = new Map<string, string[]>();
  const publicNameOwners = new Map<string, string[]>();
  for (const p of products) {
    if (p.sku && p.sku.trim()) {
      const key = p.sku.trim().toUpperCase();
      skuOwners.set(key, [...(skuOwners.get(key) ?? []), p.id]);
    }
    if (isPubliclyVisible(p)) {
      const key = normalizeProductName(p.name);
      publicNameOwners.set(key, [...(publicNameOwners.get(key) ?? []), p.id]);
    }
  }

  for (const product of products) {
    const inferred = inferSourceBrand(product);
    const sourceBrand: SourceBrand = product.sourceBrand ?? inferred;
    const isPublic = isPubliclyVisible(product);
    const base = {
      productId: product.id,
      productName: product.name || product.id,
      sourceBrand,
      anchor: `/admin/products/${encodeURIComponent(product.id)}`,
    };

    // 1) الاسم
    if (!product.name.trim()) {
      push({
        ...base,
        rule: "MISSING_TITLE",
        severity: "CRITICAL",
        message: "صف منتج بلا اسم — لا يمكن عرضه أو بيعه.",
      });
      continue; // بلا اسم لا يمكن فحص بقية الحقول بثقة
    }

    // 2) فصل المصدرين: علامة صريحة تخمّن المعرّف
    if (product.sourceBrand && product.sourceBrand !== inferred) {
      push({
        ...base,
        rule: "BRAND_SOURCE_MISMATCH",
        severity: "CRITICAL",
        message: `المنتح موسوم ${product.sourceBrand} لكن معرّفه يدل على ${inferred} — افصل Omran عن POP UP.`,
      });
    }

    // 3) الصور
    const readiness: ImageReadiness =
      product.imageReadiness ??
      (!product.image ? "none" : isUnstableDriveImage(product.image) ? "drive" : "local");
    if (readiness === "none" || !product.image) {
      push({
        ...base,
        rule: "MISSING_IMAGE",
        severity: isPublic ? "CRITICAL" : "WARNING",
        message: isPublic
          ? "منتج منشور بدون صورة رئيسية."
          : "لا توجد صورة رئيسية موثقة.",
      });
    } else if (readiness === "drive" || isUnstableDriveImage(product.image)) {
      push({
        ...base,
        rule: "BROKEN_IMAGE_REFERENCE",
        severity: isPublic ? "WARNING" : "INFO",
        message:
          "الصورة تُسحب مباشرة من Google Drive ولم تُعالَج وتُستضاف محليًا — عرضة لتوقف العرض أو حصص Drive.",
      });
    }

    // 4) القسم
    if (!product.category.trim()) {
      push({
        ...base,
        rule: "MISSING_CATEGORY",
        severity: "WARNING",
        message: "المنتج غير مصنّف ضمن قسم — لن يظهر في تصفح الأقسام.",
      });
    }

    // 5) الوصف
    if (!product.description.trim()) {
      push({
        ...base,
        rule: "MISSING_DESCRIPTION",
        severity: "WARNING",
        message: "لا يوجد وصف — يضعف البحث وثقة العميل وSEO.",
      });
    }

    // 6) الوسوم
    if (!product.tags || product.tags.length === 0) {
      push({
        ...base,
        rule: "MISSING_TAGS",
        severity: "INFO",
        message: "لا وسوم منظمة للبحث/الفلترة.",
      });
    }

    // 7) SKU
    if (!product.sku) {
      push({
        ...base,
        rule: "MISSING_SKU",
        severity: "INFO",
        message: "بلا رمز مخزون (SK) موثّق.",
      });
    } else if (!isValidSku(product.sku)) {
      push({
        ...base,
        rule: "INVALID_SKU",
        severity: "WARNING",
        message: `رمز المخزون «${product.sku}» لا يطابق صيغة SKU المعتمدة.`,
      });
    } else if ((skuOwners.get(product.sku.trim().toUpperCase())?.length ?? 0) > 1) {
      push({
        ...base,
        rule: "DUPLICATE_SKU",
        severity: "CRITICAL",
        message: `رمز المخزون ${product.sku} مستخدم لأكثر من منتج.`,
      });
    }

    // 8) تكرار الاسم العام
    if (isPublic) {
      const nameKey = normalizeProductName(product.name);
      if ((publicNameOwners.get(nameKey)?.length ?? 0) > 1) {
        push({
          ...base,
          rule: "DUPLICATE_PUBLIC_NAME",
          severity: "CRITICAL",
          message: "منتجان عامان بنفس الاسم — يحجبان بعضهما ويُربكان العميل.",
        });
      }
    }

    // 9) حالة سير العمل (fail-closed)
    const rawWorkflow = options.rawWorkflow?.[product.id];
    if (product.workflowStatus === null) {
      if (rawWorkflow && rawWorkflow.trim() !== "" && !(KNOWN_WORKFLOW as readonly string[]).includes(rawWorkflow.trim().toUpperCase())) {
        push({
          ...base,
          rule: "INVALID_WORKFLOW_STATUS",
          severity: "WARNING",
          message: `قيمة حالة نشر غير معتمدة في المصدر: «${rawWorkflow.trim()}».`,
        });
      } else {
        push({
          ...base,
          rule: "MISSING_WORKFLOW_STATUS",
          severity: isPublic ? "CRITICAL" : "WARNING",
          message: "حالة سير العمل غير موثقة — قاعدة النشر Fail-Closed تعتبره غير منشور.",
        });
      }
    }

    // 10) تعارضات النشر/الجودة
    if (product.workflowStatus === "PUBLISHED" && product.qaStatus !== "PASS") {
      push({
        ...base,
        rule: "PUBLISHED_WITHOUT_QA_PASS",
        severity: "CRITICAL",
        message: `حالة النشر PUBLISHED بينما الجودة ${product.qaStatus ?? "غير موثقة"} — البوابة تمنعه عن الجمهور.`,
      });
    }

    if (
      product.qaStatus === "PASS" &&
      (product.workflowStatus === "REVIEW" || product.workflowStatus === "REJECTED" || product.workflowStatus === "DRAFT")
    ) {
      push({
        ...base,
        rule: "PUBLICATION_CONFLICT",
        severity: "WARNING",
        message: `الجودة PASS لكن سير العمل ${product.workflowStatus} — راجع أي الحالتين صحيحة.`,
      });
    }

    if (
      !product.active &&
      product.workflowStatus === "PUBLISHED" &&
      product.qaStatus === "PASS"
    ) {
      push({
        ...base,
        rule: "HIDDEN_PUBLIC_RECORD",
        severity: "INFO",
        message: "سجل مستوفٍ للنشر لكنه مخفي يدويًا (active=FALSE).",
      });
    }

    // قيم qa غير معتمدة (لو مرت قيمة غريبة عبر طبقة الإثراء)
    if (
      product.qaStatus !== null &&
      !(KNOWN_QA as readonly string[]).includes(product.qaStatus)
    ) {
      push({
        ...base,
        rule: "PUBLICATION_CONFLICT",
        severity: "WARNING",
        message: `قيمة جودة غير معتمدة: ${product.qaStatus}.`,
      });
    }

    // 11) المخزون
    if (!product.availability || product.availability === "unknown" || product.availability.trim() === "") {
      push({
        ...base,
        rule: "NO_INVENTORY_DATA",
        severity: "INFO",
        message: "لا توجد بيانات توفر موثقة لهذا المنتج.",
      });
    }
  }

  const counts = {
    total: issues.length,
    critical: issues.filter(i => i.severity === "CRITICAL").length,
    warning: issues.filter(i => i.severity === "WARNING").length,
    info: issues.filter(i => i.severity === "INFO").length,
    byRule,
  };

  return {
    issues,
    counts,
    productsWithIssues: new Set(issues.map(i => i.productId)),
  };
}

export function severityRank(severity: QualitySeverity): number {
  return severity === "CRITICAL" ? 0 : severity === "WARNING" ? 1 : 2;
}

/** فلترة مشتركة لصفحة مركز الجودة. */
export function filterQualityIssues(
  result: QualityRunResult,
  filter: {
    severity?: QualitySeverity | "ALL";
    rule?: QualityRule | "ALL";
    sourceBrand?: SourceBrand | "ALL";
    search?: string;
  }
): QualityIssue[] {
  const search = filter.search?.trim().toLowerCase();
  return result.issues.filter(issue => {
    if (filter.severity && filter.severity !== "ALL" && issue.severity !== filter.severity) return false;
    if (filter.rule && filter.rule !== "ALL" && issue.rule !== filter.rule) return false;
    if (filter.sourceBrand && filter.sourceBrand !== "ALL" && issue.sourceBrand !== filter.sourceBrand) return false;
    if (search && !`${issue.productName} ${issue.productId} ${issue.message}`.toLowerCase().includes(search)) return false;
    return true;
  });
}
