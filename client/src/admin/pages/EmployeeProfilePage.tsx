/**
 * صفحة حساب الموظف يقرأها المالك فقط من الدليل المعتمد.
 * لا تستخدم معرّفات الروابط لتخطي فحص ملكية/صلاحية API.
 */
import { Link, useParams } from "wouter";
import { ArrowRight, IdCard, LockKeyhole, UserRound } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import { Badge, Card, CardHeader } from "@/admin/components/primitives";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { ROLE_LABELS_AR, type EmployeeRole, type EmployeeStatus } from "@shared/rbac";
import { WORKSPACE_INTRO, workspaceShortcuts } from "@shared/employeeWorkspace";

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVE: "مفعّل",
  INVITED: "بانتظار الاعتماد",
  SUSPENDED: "موقوف مؤقتًا",
  DISABLED: "معطّل",
};

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { directory, directoryStatus, principal } = useAdminIdentity();
  // فحص إضافي داخل الصفحة بجانب حارس المسار (إدارة الموظفين للمالك فقط).
  if (principal.domain !== "EMPLOYEE" || principal.role !== "OWNER" || principal.status !== "ACTIVE") {
    return <AdminPageShell title="غير مصرح" subtitle="هذه الصفحة متاحة للمالك فقط."><Card><p className="p-5 text-sm font-bold">لا تملك صلاحية رؤية تفاصيل الموظفين.</p></Card></AdminPageShell>;
  }
  const employee = directory.find(row => row.employeeId === id);
  const active = employee?.status === "ACTIVE";
  const role = employee?.role as EmployeeRole | undefined;
  const shortcuts = role && active ? workspaceShortcuts({ domain: "EMPLOYEE", role, status: "ACTIVE", id: employee.employeeId }) : [];

  return (
    <AdminPageShell title={employee ? `ملف ${employee.fullName}` : "صفحة الموظف"} subtitle="ملف موظف مستقل داخل بوابة المالك الخاصة">
      <Link href="/users" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-brand-blue">
        <ArrowRight size={16} /> العودة إلى قائمة الموظفين
      </Link>
      {directoryStatus !== "live" ? (
        <Card><p className="p-5 text-sm leading-7 text-brand-muted">دليل الموظفين غير متصل. لا توجد بيانات موثوقة لعرض صفحة هذا الموظف أو تفعيل حسابه.</p></Card>
      ) : !employee ? (
        <Card><p className="p-5 text-sm leading-7 text-brand-muted">هذا المعرّف غير موجود في دليل الموظفين. أضف الموظف من صفحة الإدارة أولًا.</p></Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader title="بيانات الحساب" icon={<IdCard size={18} />} subtitle="مصدر البيانات: دليل الموظفين المتصل" />
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-center gap-3">
                <UserRound size={26} className="text-brand-blue" />
                <div>
                  <h2 className="text-lg font-black text-brand-ink">{employee.fullName}</h2>
                  <p className="text-xs text-brand-muted">{employee.accessEmail ?? "لم يسجّل بريد دخول"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge tone="blue">{role && ROLE_LABELS_AR[role] ? ROLE_LABELS_AR[role] : "الدور غير معروف"}</Badge>
                <Badge tone={employee.status === "ACTIVE" ? "green" : "amber"}>{STATUS_LABEL[employee.status as EmployeeStatus] ?? "الحالة غير معروفة"}</Badge>
              </div>
              {role && WORKSPACE_INTRO[role] ? <p className="text-sm leading-7 text-brand-muted">{WORKSPACE_INTRO[role]}</p> : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="صلاحيات وصفحات الموظف" icon={<LockKeyhole size={18} />} subtitle="معاينة للمالك فقط؛ تسجيل الدخول للموظف يتم من صفحته المرتبطة بهويته" />
            {shortcuts.length ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {shortcuts.map(item => (
                  <div key={item.href} className="rounded-xl border border-brand-border p-4">
                    <h3 className="text-sm font-extrabold text-brand-navy">{item.label}</h3>
                    <p className="mt-1 text-xs leading-6 text-brand-muted">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : <p className="p-5 text-sm leading-7 text-brand-muted">الحساب غير نشط أو لا توجد صلاحيات معتمدة حاليًا.</p>}
          </Card>
        </>
      )}
    </AdminPageShell>
  );
}
