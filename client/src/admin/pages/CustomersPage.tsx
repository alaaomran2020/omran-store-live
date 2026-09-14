/**
 * العملاء /admin/customers — يقرأ من دليل العملاء على البوابة (المشتركون +
 * حسابات الموبايل عند تفعيل OTP). حماية PII: الموبايل يُعرض مقنّعًا افتراضيًا،
 * ولا توجد بيانات وهمية: قبل تفعيل القراءة تعرض الصفحة الحالة الصادقة.
 */
import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Users } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  LoadingState,
  SearchField,
  type DataTableColumn,
} from "@/admin/components/primitives";
import { useCustomers } from "@/admin/dataHooks";
import { formatDateTime, maskMobile } from "@/admin/adminFormat";
import { downloadRows } from "@/admin/exports";
import { safeCsvCell } from "@shared/audit";
import type { CustomerRecord } from "@/lib/admin/adminGateway";

const STATUS_TONE: Record<string, "green" | "amber" | "red"> = {
  ACTIVE: "green",
  PENDING_PROFILE: "amber",
  SUSPENDED: "red",
};

export default function CustomersPage() {
  const query = useCustomers();
  const result = query.data;
  const [search, setSearch] = useState("");
  const [reveal, setReveal] = useState(false);

  if (query.isLoading) {
    return (
      <AdminPageShell title="العملاء">
        <LoadingState />
      </AdminPageShell>
    );
  }

  const customers = result?.status === "live" ? result.data : [];
  const term = search.trim().toLowerCase();
  const rows = customers.filter(c =>
    !term ? true : [c.fullName, c.customerId, c.mobile].join(" ").toLowerCase().includes(term)
  );

  const columns: DataTableColumn<CustomerRecord>[] = [
    {
      key: "name",
      header: "العميل",
      render: c => (
        <div>
          <p className="font-extrabold text-brand-ink">{c.fullName || "بدون اسم مكتمل"}</p>
          <p dir="ltr" className="text-[11px] font-bold text-brand-disabled">{c.customerId}</p>
        </div>
      ),
    },
    {
      key: "mobile",
      header: "الموبايل",
      render: c => (
        <span dir="ltr" className="inline-flex items-center gap-1 font-bold tabular-nums">
          {reveal ? (c.mobile || "—") : maskMobile(c.mobile)}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: c => <Badge tone={STATUS_TONE[c.status] ?? "slate"}>{c.status === "ACTIVE" ? "نشط" : c.status === "PENDING_PROFILE" ? "بانتظار استكمال البيانات" : "موقوف"}</Badge>,
    },
    {
      key: "verified",
      header: "تحقق الموبايل",
      render: c => (c.mobileVerifiedAt ? <Badge tone="green">موثّق</Badge> : <Badge tone="amber">غير موثّق</Badge>),
    },
    { key: "created", header: "تاريخ التسجيل", render: c => <span className="text-xs">{formatDateTime(c.createdAt)}</span> },
    { key: "login", header: "آخر دخول", render: c => <span className="text-xs">{formatDateTime(c.lastLoginAt)}</span> },
  ];

  return (
    <AdminPageShell
      title="العملاء"
      subtitle={customers.length ? `${customers.length} عميل مسجل` : "حسابات عملاء الموبايل"}
      actions={
        <>
          <AdminButton variant="secondary" size="sm" onClick={() => setReveal(value => !value)}>
            {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
            {reveal ? "إخفاء الأرقام" : "إظهار الأرقام"}
          </AdminButton>
          {customers.length > 0 ? (
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadRows(
                  `customers-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["customer_id", "name", "mobile_masked", "status", "created_at"],
                  customers.map(c => [c.customerId, c.fullName, maskMobile(c.mobile), c.status, c.createdAt])
                )
              }
            >
              تصدير مقنّع
            </AdminButton>
          ) : null}
          <AdminButton variant="ghost" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
            <RefreshCw size={15} />
          </AdminButton>
        </>
      }
    >
      {result?.status !== "live" ? (
        <Card>
          <CardHeader title="دليل العملاء غير مربوط بعد" icon={<Users size={18} />} />
          <div className="p-5">
            <EmptyState
              tone="warning"
              title="لا توجد قراءة عملاء مفعّلة"
              description="تسجيلات المشتركين الحالية تُحفظ في شيت «المشتركون» عبر Apps Script، وحسابات الموبايل + OTP تحتاج مزوّدًا خادميًا (راجع الإعدادات/الوثيقة المعمارية). عند تفعيل إجراء القراءة customers على البوابة يظهر الدليل هنا تلقائيًا — لا تُعرض أي بيانات مقدّرة."
            />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="border-b border-brand-border p-4">
            <SearchField value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الموبايل…" label="بحث عملاء" />
          </div>
          <DataTable columns={columns} rows={rows} keyOf={c => c.customerId} pageSize={25} emptyMessage="لا عملاء مطابقون" />
        </Card>
      )}
      <p className="mt-4 text-[11px] font-semibold text-brand-disabled">
        الأرقام مقنّعة افتراضيًا لحماية بيانات العملاء، والتصدير يحفظ الصيغة المقنّعة أيضًا ({safeCsvCell("=1")} محصّن ضد حقن الصيغ).
      </p>
    </AdminPageShell>
  );
}
