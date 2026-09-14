import { type ReactNode } from "react";
import { SeoMetadata } from "@/components/SeoMetadata";
import { AdminShell } from "./AdminShell";
import { PageHeader } from "@/admin/components/primitives";
import { useAdminCatalog } from "@/admin/dataHooks";
import { relativeTime } from "@/admin/adminFormat";

const SOURCE_LABELS: Record<string, string> = {
  "live-gateway": "البوابة الحية",
  "bundled-csv": "كتالوج مضمّن (نسخة النشر)",
  "bundle-snapshots": "لقطات المنتجات المعتمدة",
};

/**
 * غلاف موحّد لكل صفحات الإدارة: SEO noindex + الهيكل + عنوان الصفحة + زر
 * تحديث الكتالوج الحقيقي ووقت آخر جلب ومصدر البيانات.
 */
export function AdminPageShell({
  title,
  subtitle,
  actions,
  refresh,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** تمرير دالة تحديث مخصصة للصفحات غير المعتمدة على الكتالوج. */
  refresh?: () => void;
  children: ReactNode;
}) {
  const catalog = useAdminCatalog();
  const handleRefresh = refresh ?? catalog.refresh;
  const refreshing = refresh ? undefined : catalog.isRefreshing;

  return (
    <>
      <SeoMetadata
        path="/admin"
        title={`${title} | لوحة إدارة عمران تويز`}
        description="لوحة عمليات شركة عمران التجارية — وصول الموظفين المعتمدين فقط."
        robots="noindex,nofollow"
      />
      <AdminShell
        onRefresh={handleRefresh}
        refreshing={refreshing}
        lastUpdated={catalog.fetchedAt ? relativeTime(catalog.fetchedAt) : null}
        headerActions={
          catalog.source ? (
            <span className="hidden text-[11px] font-bold text-brand-muted md:block">
              مصدر الكتالوج: {SOURCE_LABELS[catalog.source] ?? catalog.source}
            </span>
          ) : null
        }
      >
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
        {children}
      </AdminShell>
    </>
  );
}
