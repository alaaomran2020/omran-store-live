/**
 * لوحة التحكم — مركز القيادة التشغيلي (صفحة مستقلة /admin/dashboard).
 *
 * كل بطاقة/رسم مشتق من بيانات حقيقية:
 *   - الكتالوج الكامل (حالات نشر/جودة/أقسام/توفر) من بوابة المنتجات.
 *   - نتائج فاحص جودة الكتالوج.
 *   - ضغطات واتساب وآخر النشاطات من بوابة التحليلات/التدقيق (مع حالة صادقة
 *     عند عدم تفعيل قراءتها).
 * لا توجد أي قيم مالية/مبيعات مخترعة: بطاقات الإيرادات والطلبات غير موجودة
 * عمدًا لأن مصادرها غير متاحة.
 */
import { useMemo } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  EyeOff,
  FolderTree,
  Hourglass,
  MessageCircle,
  Package,
  PackageCheck,
  Plus,
  SearchCheck,
  Settings2,
  UserCog,
  UserPlus,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingState,
  MetricCard,
  PermissionGate,
} from "@/admin/components/primitives";
import {
  ChartCard,
  DonutChart,
  HBarChart,
  LineTrendChart,
} from "@/admin/components/charts";
import {
  BrandBadge,
  QaBadge,
  WorkflowBadge,
} from "@/admin/components/StatusBadges";
import {
  useAdminCatalog,
  useAuditLog,
  useCatalogStats,
  useCustomers,
  useQuality,
  useWhatsAppMetrics,
} from "@/admin/dataHooks";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { downloadRows } from "@/admin/exports";
import { formatDateTime, relativeTime } from "@/admin/adminFormat";
import { AUDIT_ACTION_LABELS_AR } from "@shared/audit";
import type { Permission } from "@shared/rbac";
import type { AdminProduct } from "@/lib/admin/adminCatalog";

// ---------------------------------------------------------------------------
// إجراءات سريعة حساسة للصلاحيات
// ---------------------------------------------------------------------------

function QuickAction({
  to,
  icon: Icon,
  label,
  description,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={to}
      className="group flex items-start gap-3 rounded-2xl border border-brand-border bg-white p-4 text-right shadow-[0_1px_3px_rgba(16,42,82,0.06)] transition hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-sky text-brand-blue transition group-hover:bg-brand-blue group-hover:text-white">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-brand-ink">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-brand-muted">{description}</span>
      </span>
    </Link>
  );
}

function QuickActions() {
  const { can } = useAdminIdentity();
  const actions: { permission: Permission; to: string; icon: LucideIcon; label: string; description: string }[] = [
    { permission: "product:create", to: "/admin/product-intake", icon: Plus, label: "إضافة منتج", description: "إدخال منتج جديد بالصورة عبر بوابة التشغيل" },
    { permission: "quality:view", to: "/admin/quality", icon: SearchCheck, label: "مراجعة المنتجات", description: "حالات النشر والجودة والمشاكل" },
    { permission: "quality:update", to: "/admin/quality?severity=CRITICAL", icon: ClipboardList, label: "المنتجات الناقصة", description: "صور وأوصاف وأقسام ناقصة" },
    { permission: "category:update", to: "/admin/categories", icon: FolderTree, label: "تعديل الأقسام", description: "ترتيب وتغطية التصنيفات" },
    { permission: "inventory:update", to: "/admin/inventory", icon: Warehouse, label: "تحديث المخزون", description: "حالات التوفر والنفاد" },
    { permission: "content:update", to: "/admin/content", icon: Settings2, label: "إدارة المحتوى", description: "المستجدات والتواصل والروابط" },
    { permission: "user:create", to: "/admin/users?action=invite", icon: UserPlus, label: "إضافة موظف", description: "دعوة موظف بدور محدد" },
    { permission: "quality:view", to: "/admin/quality", icon: ClipboardCheck, label: "مراجعة الجودة", description: "تقرير مشاكل الكتالوج" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions
        .filter(action => can(action.permission))
        .map(action => (
          <QuickAction key={action.to + action.label} to={action.to} icon={action.icon} label={action.label} description={action.description} />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// آخر النشاطات
// ---------------------------------------------------------------------------

function RecentActivity() {
  const audit = useAuditLog();
  const events = audit.data?.status === "live" ? audit.data.data.slice(0, 8) : [];

  if (audit.isLoading) {
    return (
      <Card>
        <LoadingState label="جاري تحميل النشاطات…" />
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader title="آخر النشاطات" subtitle="سجل التدقيق من بوابة التشغيل" icon={<ClipboardList size={18} />} />
        <div className="p-5">
          <EmptyState
            title="لا توجد نشاطات مسجّلة بعد"
            description="تظهر هنا إجراءات الموظفين الحقيقية (نشر، تعديل، أدوار…) بعد تفعيل قراءة سجل التدقيق من بوابة Make/Apps Script. لا تُختلق نشاطات محلية."
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="آخر النشاطات"
        subtitle="سجل التدقيق من بوابة التشغيل"
        icon={<ClipboardList size={18} />}
        action={
          <Link href="/admin/audit-log" className="text-xs font-extrabold text-brand-blue hover:underline">
            عرض الكل
          </Link>
        }
      />
      <ol className="divide-y divide-brand-border">
        {events.map(event => (
          <li key={event.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-sky text-brand-blue">
              <CheckCircle2 size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-brand-ink">
                {AUDIT_ACTION_LABELS_AR[event.action as keyof typeof AUDIT_ACTION_LABELS_AR] ?? event.action}
              </p>
              <p className="truncate text-[11px] text-brand-muted">
                {event.actorName} · {event.targetName || event.targetId || "—"}
              </p>
            </div>
            <time className="shrink-0 text-[11px] font-bold text-brand-disabled" dateTime={event.occurredAt}>
              {relativeTime(event.occurredAt)}
            </time>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// أداء واتساب
// ---------------------------------------------------------------------------

function WhatsAppPanel() {
  const metrics = useWhatsAppMetrics();
  const data = metrics.data?.status === "live" ? metrics.data.data : null;

  return (
    <ChartCard
      title="أداء واتساب"
      subtitle="ضغطات استفسار المنتجات الفعلية (لا محتوى محادثات)"
      action={<MessageCircle className="text-whatsapp" size={18} />}
    >
      {!data ? (
        <EmptyState
          title="قراءة تحليلات واتساب غير مفعّلة بعد"
          description="الضغطات تُسجَّل فعلًا في دفتر Analytics_Events عبر بوابة Make. تفعيل إجراء قراءة whatsapp_metrics على البوابة يعرض الإجمالي وآخر 7 أيام وأكثر المنتجات ضغطًا — بلا أي أرقام مقدّرة."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-brand-cream p-3 text-center">
              <p className="text-lg font-black tabular-nums text-brand-ink">{data.total}</p>
              <p className="text-[10px] font-bold text-brand-muted">إجمالي الضغطات</p>
            </div>
            <div className="rounded-xl bg-brand-cream p-3 text-center">
              <p className="text-lg font-black tabular-nums text-brand-ink">{data.today}</p>
              <p className="text-[10px] font-bold text-brand-muted">اليوم</p>
            </div>
            <div className="rounded-xl bg-brand-cream p-3 text-center">
              <p className="text-lg font-black tabular-nums text-brand-ink">{data.last7}</p>
              <p className="text-[10px] font-bold text-brand-muted">آخر 7 أيام</p>
            </div>
          </div>
          <LineTrendChart points={data.trend} />
        </div>
      )}
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// أكثر المنتجات ضغطًا / صحة الكتالوج
// ---------------------------------------------------------------------------

function TopClickedProducts() {
  const metrics = useWhatsAppMetrics();
  const data = metrics.data?.status === "live" ? metrics.data.data : null;
  if (!data) return null;
  return (
    <ChartCard title="أكثر المنتجات ضغطًا على واتساب" subtitle="من سجل الأحداث الفعلي">
      <HBarChart data={data.topProducts.map(item => ({ ...item }))} />
    </ChartCard>
  );
}

function CatalogHealthCard({ products }: { products: AdminProduct[] }) {
  const quality = useQuality(products);
  const counts = quality.counts;
  const rules: { label: string; count: number; severity: "CRITICAL" | "WARNING" | "INFO"; query: string }[] = [
    { label: "مشاكل حرجة", count: counts.critical, severity: "CRITICAL", query: "severity=CRITICAL" },
    { label: "تحذيرات", count: counts.warning, severity: "WARNING", query: "severity=WARNING" },
    { label: "ملاحظات معلوماتية", count: counts.info, severity: "INFO", query: "severity=INFO" },
  ];
  return (
    <Card>
      <CardHeader
        title="صحة الكتالوج"
        subtitle="قواعد ميكانيكية على البيانات الحقيقية"
        icon={<ClipboardCheck size={18} />}
        action={
          <Link href="/admin/quality" className="text-xs font-extrabold text-brand-blue hover:underline">
            مركز الجودة
          </Link>
        }
      />
      <div className="space-y-2.5 p-5">
        {rules.map(rule => (
          <Link
            key={rule.severity}
            href={`/admin/quality?${rule.query}`}
            className="flex items-center justify-between rounded-xl border border-brand-border px-4 py-3 text-sm font-bold transition hover:bg-brand-cream"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle
                size={16}
                aria-hidden="true"
                className={
                  rule.severity === "CRITICAL"
                    ? "text-brand-red"
                    : rule.severity === "WARNING"
                      ? "text-brand-warning"
                      : "text-brand-info"
                }
              />
              {rule.label}
            </span>
            <Badge tone={rule.severity === "CRITICAL" ? "red" : rule.severity === "WARNING" ? "amber" : "blue"}>
              {rule.count}
            </Badge>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// المخزون
// ---------------------------------------------------------------------------

function InventoryHealthCard({ products }: { products: AdminProduct[] }) {
  const stats = useCatalogStats(products);
  return (
    <Card>
      <CardHeader
        title="حالة المخزون"
        subtitle="التوفر الموثّق في الكتالوج — بلا كميات مخترعة"
        icon={<Warehouse size={18} />}
        action={
          <Link href="/admin/inventory" className="text-xs font-extrabold text-brand-blue hover:underline">
            التفاصيل
          </Link>
        }
      />
      <div className="p-5">
        {stats.inventory.length === 0 ? (
          <EmptyState title="لا توجد بيانات مخزون" description="كل المنتجات بلا بيانات توفر موثّقة." />
        ) : (
          <DonutChart data={stats.inventory.map(slice => ({ key: slice.key, label: slice.label, count: slice.count }))} centerLabel="منتج" />
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// بطاقات أحدث المنتجات (نشاط حقيقي مشتق من ترتيب/صفوف الشيت)
// ---------------------------------------------------------------------------

function RecentlyAdded({ products }: { products: AdminProduct[] }) {
  const recent = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.sortOrder ?? b.rowIndex) - (a.sortOrder ?? a.rowIndex))
        .slice(0, 6),
    [products]
  );
  return (
    <Card>
      <CardHeader title="أحدث تسجيلات المنتجات" subtitle="حسب ترتيب المصدر" icon={<Package size={18} />} />
      <ul className="divide-y divide-brand-border">
        {recent.map(product => (
          <li key={product.id}>
            <Link
              href={`/admin/products/${encodeURIComponent(product.id)}`}
              className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-brand-cream"
            >
              <BrandBadge brand={product.sourceBrand} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-brand-ink">{product.name}</span>
              <WorkflowBadge status={product.workflowStatus} />
              <QaBadge status={product.qaStatus} />
            </Link>
          </li>
        ))}
        {recent.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm font-semibold text-brand-muted">لا منتجات</li>
        ) : null}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// الصفحة
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const catalog = useAdminCatalog();
  const stats = useCatalogStats(catalog.products);
  const quality = useQuality(catalog.products);
  const customers = useCustomers();
  const { directory, resolved } = useAdminIdentity();

  if (catalog.isLoading) {
    return (
      <AdminPageShell title="لوحة التحكم" subtitle="نظرة شاملة على حالة المتجر والمنتجات والمخزون">
        <LoadingState />
      </AdminPageShell>
    );
  }

  const kpis = stats.kpis;
  const activeEmployees = directory.filter(e => e.status === "ACTIVE").length;
  const customerCount = customers.data?.status === "live" ? customers.data.data.length : null;

  const exportCatalog = () => {
    downloadRows(
      `omran-admin-catalog-${new Date().toISOString().slice(0, 10)}.csv`,
      ["id", "name", "category", "price", "active", "workflow_status", "qa_status", "availability", "source_brand", "review_reason"],
      catalog.products.map(p => [
        p.id, p.name, p.category, p.price ?? "", p.active, p.workflowStatus ?? "", p.qaStatus ?? "", p.availability, p.sourceBrand, p.reviewReason ?? "",
      ])
    );
  };

  return (
    <AdminPageShell
      title="لوحة التحكم"
      subtitle="نظرة شاملة على حالة المتجر والمنتجات والمخزون"
      actions={
        <>
          <Badge tone="blue" className="hidden sm:inline-flex">{resolved.fullName}</Badge>
          <PermissionGate permission="analytics:view">
            <button
              type="button"
              onClick={exportCatalog}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-extrabold text-brand-navy transition hover:bg-brand-sky"
            >
              <Download size={16} aria-hidden="true" /> تصدير الكتالوج
            </button>
          </PermissionGate>
        </>
      }
    >
      {/* مؤشرات رئيسية */}
      <h2 className="sr-only">نظرة عامة</h2>
      <section aria-label="مؤشرات رئيسية" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Link href="/products" className="block">
          <MetricCard label="إجمالي المنتجات" value={kpis.total} icon={<Package size={18} />} tone="blue" onClick={() => undefined} />
        </Link>
        <MetricCard label="المنتجات المنشورة" value={kpis.published} icon={<PackageCheck size={18} />} tone="green" />
        <MetricCard label="تحت المراجعة" value={kpis.inReview} icon={<Hourglass size={18} />} tone="amber" />
        <MetricCard label="مخفي/مسودات" value={kpis.hidden + kpis.drafts} icon={<EyeOff size={18} />} tone="slate" />
        <MetricCard label="الأقسام" value={kpis.categories} icon={<FolderTree size={18} />} tone="purple" />
        <MetricCard
          label="مشاكل الجودة"
          value={quality.counts.critical}
          hint={`${quality.counts.warning} تحذير · ${quality.counts.info} ملاحظة`}
          icon={<AlertTriangle size={18} />}
          tone={quality.counts.critical > 0 ? "red" : "green"}
        />
        <MetricCard label="نفد من المخزون" value={kpis.inventory.unavailable} icon={<Boxes size={18} />} tone="red" />
        <MetricCard label="بلا بيانات مخزون" value={kpis.inventory.unknown} icon={<Warehouse size={18} />} tone="amber" />
        <MetricCard label="ضغطات واتساب" value={<WhatsAppTotal />} icon={<MessageCircle size={18} />} tone="whatsapp" />
        <MetricCard label="Omran / POP UP" value={`${kpis.omranTotal} / ${kpis.popupTotal}`} hint="مصدران منفصلان دائمًا" icon={<Boxes size={18} />} tone="purple" />
        {customerCount !== null ? (
          <MetricCard label="العملاء المسجلون" value={customerCount} icon={<Users size={18} />} tone="blue" />
        ) : null}
        {directory.length > 0 ? (
          <MetricCard label="الموظفون النشطون" value={activeEmployees} icon={<UserCog size={18} />} tone="green" />
        ) : null}
      </section>

      {/* إجراءات سريعة */}
      <section aria-label="إجراءات سريعة" className="mt-6">
        <h2 className="mb-3 text-sm font-black text-brand-ink">إجراءات سريعة</h2>
        <QuickActions />
      </section>

      {/* الرسوم */}
      <section aria-label="توزيعات تشغيلية" className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="توزيع حالات النشر" subtitle="من الكتالوج الكامل">
          <DonutChart data={stats.workflow} centerLabel="منتج" />
        </ChartCard>
        <ChartCard title="قرارات الجودة" subtitle="PASS / NEEDS_REVIEW / FAIL">
          <DonutChart data={stats.qa} centerLabel="منتج" />
        </ChartCard>
        <InventoryHealthCard products={catalog.products} />
      </section>

      <section aria-label="الأقسام" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="المنتجات حسب القسم — Omran Toys" subtitle={`${kpis.omranTotal} منتج`}>
          <HBarChart data={stats.categoriesOmran} />
        </ChartCard>
        {kpis.popupTotal > 0 ? (
          <ChartCard title="المنتجات حسب القسم — POP UP" subtitle={`${kpis.popupTotal} منتج — مصدر منفصل`}>
            <HBarChart data={stats.categoriesPopup} />
          </ChartCard>
        ) : null}
      </section>

      <section aria-label="واتساب والجودة" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WhatsAppPanel />
        <CatalogHealthCard products={catalog.products} />
      </section>

      <section aria-label="الأكثر ضغطًا والنشاط" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TopClickedProducts />
        <RecentActivity />
      </section>

      <section aria-label="أحدث المنتجات" className="mt-4">
        <RecentlyAdded products={catalog.products} />
      </section>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] font-semibold text-brand-disabled">
        <ArrowLeft size={12} /> جميع المؤشرات مشتقة من مصادر البيانات الحقيقية. لا تعرض اللوحة أي مبيعات أو إيرادات
        لأن هذه البيانات غير موجودة في مصادر المتجر الحالية. آخر جلب: {catalog.fetchedAt ? formatDateTime(catalog.fetchedAt) : "—"}
      </p>
    </AdminPageShell>
  );
}

function WhatsAppTotal() {
  const metrics = useWhatsAppMetrics();
  const data = metrics.data?.status === "live" ? metrics.data.data : null;
  return <span className="tabular-nums">{data ? data.total : "—"}</span>;
}
