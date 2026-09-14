/**
 * مركز جودة الكتالوج /admin/quality — كل المشاكل مشتقة ميكانيكيًا من
 * الكتالوج الحقيقي عبر shared/catalogQuality.ts (لا اجتهاد ولا اختراع).
 * فلترة بالحدة/القاعدة/المصدر/البحث، تنقّل مباشر للمنتج، وتصدير CSV حقيقي.
 */
import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "wouter";
import { AlertTriangle, ChevronLeft, Download, ShieldCheck } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  FilterSelect,
  LoadingState,
  MetricCard,
  SearchField,
} from "@/admin/components/primitives";
import { useAdminCatalog, useQuality } from "@/admin/dataHooks";
import {
  filterQualityIssues,
  QUALITY_RULE_LABELS_AR,
  type QualityIssue,
  type QualityRule,
  type QualitySeverity,
} from "@shared/catalogQuality";
import { downloadRows } from "@/admin/exports";
import { safeCsvCell } from "@shared/audit";

const SEVERITY_TONE = { CRITICAL: "red", WARNING: "amber", INFO: "blue" } as const;

export default function QualityPage() {
  const { products, isLoading } = useAdminCatalog();
  const result = useQuality(products);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [severity, setSeverity] = useState<string>(searchParams.get("severity") ?? "ALL");
  const [rule, setRule] = useState("ALL");
  const [brand, setBrand] = useState("ALL");
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const severityParam = searchParams.get("severity");
    if (severityParam) setSeverity(severityParam);
  }, [searchParams]);

  const issues = useMemo(
    () =>
      filterQualityIssues(result, {
        severity: severity as QualitySeverity | "ALL",
        rule: rule as QualityRule | "ALL",
        sourceBrand: brand as "OMRAN" | "POPUP" | "ALL",
        search: debounced,
      }),
    [result, severity, rule, brand, debounced]
  );

  if (isLoading) {
    return (
      <AdminPageShell title="مركز جودة الكتالوج">
        <LoadingState />
      </AdminPageShell>
    );
  }

  const counts = result.counts;
  const rulesPresent = Object.keys(counts.byRule) as QualityRule[];

  const exportIssues = () => {
    downloadRows(
      `catalog-quality-${new Date().toISOString().slice(0, 10)}.csv`,
      ["severity", "rule", "product_id", "product_name", "source_brand", "message"],
      issues.map(issue => [issue.severity, issue.rule, issue.productId, issue.productName, issue.sourceBrand, issue.message])
    );
  };

  return (
    <AdminPageShell
      title="مركز جودة الكتالوج"
      subtitle={`${counts.total} ملاحظة على ${result.productsWithIssues.size} منتج — فحص ميكانيكي للبيانات الحقيقية`}
      actions={
        <AdminButton variant="secondary" size="sm" onClick={exportIssues}>
          <Download size={15} /> تصدير CSV
        </AdminButton>
      }
    >
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="مشاكل حرجة" value={counts.critical} icon={<AlertTriangle size={18} />} tone="red" />
        <MetricCard label="تحذيرات" value={counts.warning} icon={<AlertTriangle size={18} />} tone="amber" />
        <MetricCard label="ملاحظات معلوماتية" value={counts.info} icon={<ShieldCheck size={18} />} tone="blue" />
        <MetricCard
          label="منتجات سليمة"
          value={products.length - result.productsWithIssues.size}
          icon={<ShieldCheck size={18} />}
          tone="green"
        />
      </section>

      <Card className="mt-5">
        <CardHeader title="الملاحظات" subtitle="حرجة تمنع/تخل بالنشر، تحذيرات تضعف العرض، معلوماتية توثيقية" />
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <SearchField value={search} onChange={setSearch} placeholder="ابحث باسم المنتج أو الكود…" label="بحث في المشاكل" className="md:col-span-2" />
          <FilterSelect
            label="الحدة"
            value={severity}
            onChange={value => {
              setSeverity(value);
              setSearchParams(value === "ALL" ? "" : `severity=${value}`);
            }}
            options={[
              { value: "ALL", label: "كل الحدات" },
              { value: "CRITICAL", label: "حرج" },
              { value: "WARNING", label: "تحذير" },
              { value: "INFO", label: "معلوماتي" },
            ]}
          />
          <FilterSelect
            label="المصدر"
            value={brand}
            onChange={setBrand}
            options={[
              { value: "ALL", label: "كل المصادر" },
              { value: "OMRAN", label: "Omran Toys" },
              { value: "POPUP", label: "POP UP" },
            ]}
          />
          <FilterSelect
            label="القاعدة"
            value={rule}
            onChange={setRule}
            options={[
              { value: "ALL", label: "كل القواعد" },
              ...rulesPresent.map(ruleName => ({ value: ruleName, label: QUALITY_RULE_LABELS_AR[ruleName] })),
            ]}
            className="md:col-span-2"
          />
        </div>

        {issues.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<ShieldCheck size={22} />}
              title="لا ملاحظات مطابقة"
              description="الكتالوج يجتاز كل القواعد ضمن الفلاتر المحددة."
            />
          </div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {issues.slice(0, limit).map((issue: QualityIssue, index) => (
              <li key={`${issue.productId}-${issue.rule}-${index}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Badge tone={SEVERITY_TONE[issue.severity]}>
                  {issue.severity === "CRITICAL" ? "حرج" : issue.severity === "WARNING" ? "تحذير" : "معلوماتي"}
                </Badge>
                <Badge tone={issue.sourceBrand === "POPUP" ? "purple" : "blue"}>{issue.sourceBrand === "POPUP" ? "POP UP" : "Omran"}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-brand-ink">{issue.productName}</p>
                  <p className="truncate text-xs text-brand-muted">
                    {QUALITY_RULE_LABELS_AR[issue.rule]} — {issue.message}
                  </p>
                </div>
                <Link
                  href={issue.anchor.replace(/^\/admin/, "")}
                  className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-extrabold text-brand-blue hover:bg-brand-sky"
                >
                  فتح المنتج <ChevronLeft size={14} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {issues.length > limit ? (
          <div className="p-4 text-center">
            <AdminButton variant="secondary" size="sm" onClick={() => setLimit(value => value + 200)}>
              عرض المزيد ({issues.length - limit} متبقية)
            </AdminButton>
          </div>
        ) : null}
      </Card>

      <p className="mt-4 text-[11px] font-semibold leading-5 text-brand-disabled">
        كل رسالة مشتقة من حقول المنتج فقط. انسخ أي خلية بأمان: تصدير CSV محصّن ضد حقن الصيغ ({safeCsvCell("=formula")} مثال على التحييد).
      </p>
    </AdminPageShell>
  );
}
