/**
 * تقارير تشغيلية مشتقة بالكامل من الكتالوج الحقيقي — لا أرقام مالية.
 * التغطية: اكتمال البيانات، حالات النشر والجودة، الصور، الأسعار، المصدرين.
 */
import { Download } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import { AdminButton, Card, CardHeader, LoadingState } from "@/admin/components/primitives";
import { ChartCard, DonutChart, HBarChart } from "@/admin/components/charts";
import { useAdminCatalog, useCatalogStats, useQuality } from "@/admin/dataHooks";
import { downloadRows } from "@/admin/exports";

export default function ReportsPage() {
  const { products, isLoading } = useAdminCatalog();
  const stats = useCatalogStats(products);
  const quality = useQuality(products);

  if (isLoading) {
    return (
      <AdminPageShell title="التقارير">
        <LoadingState />
      </AdminPageShell>
    );
  }

  const total = products.length || 1;
  const percent = (n: number) => `${Math.round((n / total) * 100)}%`;

  const completeness = [
    { key: "published", label: "منشور ومجتاز للبوابة", count: stats.kpis.published },
    { key: "priced", label: "بسعر موثّق", count: stats.kpis.withPrice },
    { key: "inquiry", label: "للاستفسار عبر واتساب", count: stats.kpis.inquiryOnly },
    { key: "categories", label: "بقسم موثّق", count: products.filter(p => p.category.trim()).length },
    { key: "description", label: "بوصف", count: products.filter(p => p.description.trim()).length },
    { key: "image", label: "بصورة", count: products.filter(p => p.image).length },
    { key: "sku", label: "برمز SKU", count: products.filter(p => p.sku).length },
    { key: "tags", label: "بوسوم", count: products.filter(p => p.tags.length > 0).length },
    { key: "availability", label: "بحالة توفر", count: products.filter(p => p.availability !== "unknown").length },
  ];

  const imageReadiness = (["local", "drive", "none"] as const).map(value => ({
    key: value,
    label: value === "local" ? "صورة محلية معالَجة" : value === "drive" ? "صورة Google Drive" : "بدون صورة",
    count: products.filter(p => p.imageReadiness === value).length,
  }));

  const exportCompleteness = () => {
    downloadRows(
      `catalog-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["metric", "count", "percent"],
      completeness.map(row => [row.label, row.count, percent(row.count)])
    );
  };

  return (
    <AdminPageShell
      title="التقارير التشغيلية"
      subtitle="اكتمال وجودة الكتالوج — أرقام مشتقة من المصدر الحقيقي"
      actions={
        <AdminButton variant="secondary" size="sm" onClick={exportCompleteness}>
          <Download size={15} /> تصدير CSV
        </AdminButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="حالات النشر" subtitle="توزيع الكتالوج الكامل">
          <DonutChart data={stats.workflow} centerLabel="منتج" />
        </ChartCard>
        <ChartCard title="جاهزية الصور" subtitle="محلية معالَجة مقابل روابط خارجية">
          <DonutChart data={imageReadiness} centerLabel="صورة" />
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="اكتمال البيانات" subtitle={`${products.length} منتج — النسب من إجمالي الكتالوج`} />
        <div className="p-5">
          <HBarChart data={completeness.map(row => ({ ...row, label: `${row.label} (${percent(row.count)})` }))} />
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="ملخص جودة البيانات" subtitle="نتائج فاحص مركز الجودة" />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          {[
            { label: "حرجة", count: quality.counts.critical, color: "text-brand-red" },
            { label: "تحذيرات", count: quality.counts.warning, color: "text-brand-warning" },
            { label: "معلوماتية", count: quality.counts.info, color: "text-brand-info" },
            { label: "منتج عليه ملاحظة", count: quality.productsWithIssues.size, color: "text-brand-navy" },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-brand-cream p-4 text-center">
              <p className={`text-2xl font-black tabular-nums ${item.color}`}>{item.count}</p>
              <p className="mt-1 text-[11px] font-bold text-brand-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </AdminPageShell>
  );
}
