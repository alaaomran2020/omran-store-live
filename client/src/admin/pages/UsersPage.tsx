/**
 * إدارة الموظفين /admin/users
 *
 * قواعد أمنية مركزية (shared/rbac.ts) تُطبّق على كل إجراء:
 *   - إنشاء الموظف OWNER/ADMIN فقط؛ لا تسجيل ذاتي؛ الحالة تبدأ INVITED.
 *   - المالك وحده يُعيّن مالكًا، والمالك الأخير لا يُعطَّل ولا يُنزَّل.
 *   - الموظف المعطّل/الموقوف يُمنع عن اللوحة (AdminApp) وعلى البوابة أيضًا.
 * القناة: بوابة إجراءات (user_create/user_update) أو حزمة تشغيل يدوية +
 * توجيه WhatsApp/Cloudflare Access. الدعوة بـOTP تُرسل عبر المزوّد الخادمي
 * إن فُعّل، وإلا تُعرض تسوية يدوية صادقة بلا أي رمز وهمي.
 */
import { useState } from "react";
import { toast, Toaster } from "sonner";
import { Check, Plus, RefreshCw, ShieldAlert, UserPlus, Users } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  LoadingState,
  SelectField,
  TextInput,
  type DataTableColumn,
} from "@/admin/components/primitives";
import { ConfirmDialog } from "@/admin/components/ConfirmDialog";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { useQuery } from "@tanstack/react-query";
import { readEmployees, adminActionsConfigured, postAdminAction, type EmployeeRecord } from "@/lib/admin/adminGateway";
import { emitAudit } from "@/lib/admin/auditClient";
import { downloadRows } from "@/admin/exports";
import {
  EMPLOYEE_ROLES,
  ROLE_DESCRIPTIONS_AR,
  ROLE_LABELS_AR,
  can as canPrincipal,
  canAssignRole,
  canChangeUserRole,
  canDisableUser,
  canReactivateUser,
  type EmployeeRole,
  type EmployeeStatus,
} from "@shared/rbac";
import { normalizeEgyptianMobile, maskMobile, isEgyptianE164 } from "@shared/mobile";
import { formatDateTime } from "@/admin/adminFormat";
import { requestOtp, AuthClientError } from "@/lib/auth/authClient";

const STATUS_TONE: Record<EmployeeStatus, "green" | "amber" | "red" | "slate"> = {
  ACTIVE: "green",
  INVITED: "amber",
  SUSPENDED: "red",
  DISABLED: "slate",
};

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVE: "نشط",
  INVITED: "مدعوّ بانتظار التفعيل",
  SUSPENDED: "موقوف مؤقتًا",
  DISABLED: "معطّل",
};

function InviteDialog({ onClose }: { onClose: () => void }) {
  const { actor, principal } = useAdminIdentity();
  const [fullName, setFullName] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [role, setRole] = useState<EmployeeRole>("CATALOG_MANAGER");
  const [busy, setBusy] = useState(false);
  const directWrite = adminActionsConfigured();

  const mobile = normalizeEgyptianMobile(mobileInput);
  const valid = fullName.trim().length >= 3 && isEgyptianE164(mobile ?? "") && canAssignRole(principal, role);

  async function submit() {
    if (!valid || !mobile) {
      toast.error("راجع الاسم ورقم الموبايل (أرقام مصرية فقط 01X) والدور.");
      return;
    }
    setBusy(true);
    try {
      // 1) محاولة دعوة OTP عبر المزوّد الخادمي (لا رمز يُولّد في الواجهة).
      let otpInvited = false;
      try {
        await requestOtp("EMPLOYEE", mobile);
        otpInvited = true;
      } catch (error) {
        if (!(error instanceof AuthClientError) || error.code !== "PROVIDER_NOT_CONFIGURED") {
          throw error;
        }
      }

      const record = {
        full_name: fullName.trim(),
        mobile,
        role,
        status: "INVITED",
        invited_by: actor.id,
        otp_invited: otpInvited ? "TRUE" : "FALSE",
      };

      if (directWrite) {
        const result = await postAdminAction("user_create", record);
        if (!result.ok) {
          downloadRows("employee-invite.tsv", ["full_name", "mobile", "role", "status", "invited_by", "otp_invited"], [[record.full_name, record.mobile, record.role, record.status, record.invited_by, record.otp_invited]]);
        }
      } else {
        downloadRows("employee-invite.tsv", ["full_name", "mobile", "role", "status", "invited_by", "otp_invited"], [[record.full_name, record.mobile, record.role, record.status, record.invited_by, record.otp_invited]]);
      }

      emitAudit(actor, {
        action: "USER_CREATED",
        targetType: "EMPLOYEE",
        targetId: mobile,
        targetName: fullName.trim(),
        metadata: { role, status: "INVITED", otpInvited: otpInvited ? "true" : "false", channel: directWrite ? "gateway" : "manual_packet" },
      });

      if (otpInvited) {
        toast.success("أُرسل رمز التحقق للموظف، وسيُفعَّل حسابه بعد تأكيد موبايله.");
      } else {
        toast.success("أُنشئت دعوة الموظف. الخطوات اليدوية موضّحة بالأسفل (Access + واتساب).");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof AuthClientError ? `تعذّر إرسال الدعوة (${error.code})` : "تعذّر إتمام الدعوة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-brand-ink/45 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <div className="w-full max-w-lg rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <h2 id="invite-title" className="flex items-center gap-2 text-base font-black text-brand-ink">
          <UserPlus size={19} className="text-brand-blue" /> دعوة موظف جديد
        </h2>
        <p className="mt-1 text-xs leading-6 text-brand-muted">
          لا تسجيل ذاتي للموظفين. تبدأ الحالة INVITED ويتفعّل الحساب بعد تحقق OTP على موبايل الموظف.
        </p>
        <div className="mt-4 space-y-3">
          <TextInput label="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثال: محمد أحمد" />
          <TextInput
            label="رقم الموبايل (01X… أو +201X…)"
            inputMode="tel"
            value={mobileInput}
            onChange={e => setMobileInput(e.target.value)}
            hint={mobileInput && !mobile ? "رقم غير صالح — أرقام شبكات 010/011/012/015 المصرية فقط." : mobile ? `سيُحفظ موحّدًا: ${mobile}` : undefined}
          />
          <SelectField label="الدور" value={role} onChange={e => setRole(e.target.value as EmployeeRole)}>
            {EMPLOYEE_ROLES.filter(candidate => canAssignRole(principal, candidate)).map(candidate => (
              <option key={candidate} value={candidate}>
                {ROLE_LABELS_AR[candidate]} — {candidate}
              </option>
            ))}
          </SelectField>
          <p className="rounded-xl bg-brand-cream p-3 text-[11px] leading-5 text-brand-muted">{ROLE_DESCRIPTIONS_AR[role]}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <AdminButton variant="secondary" size="sm" onClick={onClose}>إلغاء</AdminButton>
          <AdminButton size="sm" onClick={submit} loading={busy} disabled={!valid}>
            <Check size={15} /> إنشاء الدعوة
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { resolved, actor, principal, activeOwnerCount } = useAdminIdentity();
  const query = useQuery({ queryKey: ["admin", "employees-directory-page"], queryFn: readEmployees, staleTime: 60_000 });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ record: EmployeeRecord; action: "SUSPEND" | "DISABLE" | "REACTIVATE"; nextStatus: EmployeeStatus } | null>(null);
  const [roleEdit, setRoleEdit] = useState<Record<string, string>>({});

  const records = query.data?.status === "live" ? query.data.data : [];
  const directWrite = adminActionsConfigured();

  async function runStatusAction() {
    if (!confirm) return;
    const { record, action, nextStatus } = confirm;
    const payload = {
      employee_id: record.employeeId,
      next_status: nextStatus,
      actor_id: actor.id,
    };
    if (directWrite) {
      const result = await postAdminAction("user_update_status", payload);
      if (!result.ok) {
        downloadRows("employee-status.tsv", ["employee_id", "next_status", "actor_id"], [[payload.employee_id, payload.next_status, payload.actor_id]]);
      }
    } else {
      downloadRows("employee-status.tsv", ["employee_id", "next_status", "actor_id"], [[payload.employee_id, payload.next_status, payload.actor_id]]);
    }
    emitAudit(actor, {
      action: action === "REACTIVATE" ? "USER_REACTIVATED" : action === "SUSPEND" ? "USER_SUSPENDED" : "USER_DISABLED",
      targetType: "EMPLOYEE",
      targetId: record.employeeId,
      targetName: record.fullName,
      metadata: { nextStatus },
    });
    toast.success("تم إصدار إجراء الحالة" + (directWrite ? "" : " كحزمة يدوية"));
    setConfirm(null);
  }

  async function changeRole(record: EmployeeRecord, nextRole: EmployeeRole) {
    const target = { id: record.employeeId, role: record.role as EmployeeRole, status: record.status as EmployeeStatus };
    if (!canChangeUserRole(principal, target, nextRole, { activeOwnerCount })) {
      toast.error("غير مصرّح لك بهذا التغيير (المالك الأخير محمي / صلاحياتك لا تسمح).");
      return;
    }
    if (directWrite) {
      const result = await postAdminAction("user_update_role", { employee_id: record.employeeId, next_role: nextRole, actor_id: actor.id });
      if (!result.ok) downloadRows("employee-role.tsv", ["employee_id", "next_role", "actor_id"], [[record.employeeId, nextRole, actor.id]]);
    } else {
      downloadRows("employee-role.tsv", ["employee_id", "next_role", "actor_id"], [[record.employeeId, nextRole, actor.id]]);
    }
    emitAudit(actor, {
      action: "USER_ROLE_CHANGED",
      targetType: "EMPLOYEE",
      targetId: record.employeeId,
      targetName: record.fullName,
      metadata: { oldRole: record.role, nextRole },
    });
    toast.success("تم إصدار تغيير الدور");
  }

  const columns: DataTableColumn<EmployeeRecord>[] = [
    {
      key: "name",
      header: "الموظف",
      render: record => (
        <div>
          <p className="font-extrabold text-brand-ink">{record.fullName}</p>
          <p className="text-[11px] font-bold text-brand-muted">{record.accessEmail ?? maskMobile(record.mobile)}</p>
        </div>
      ),
    },
    { key: "mobile", header: "الموبايل", render: record => <span dir="ltr" className="text-xs font-bold tabular-nums">{maskMobile(record.mobile)}</span> },
    { key: "role", header: "الدور", render: record => <Badge tone={record.role === "OWNER" ? "amber" : record.role === "ADMIN" ? "purple" : "blue"}>{ROLE_LABELS_AR[(record.role as EmployeeRole) ?? "VIEWER"]}</Badge> },
    { key: "status", header: "الحالة", render: record => <Badge tone={STATUS_TONE[(record.status as EmployeeStatus) ?? "INVITED"]}>{STATUS_LABEL[(record.status as EmployeeStatus) ?? "INVITED"]}</Badge> },
    { key: "lastLogin", header: "آخر دخول", render: record => <span className="text-xs">{formatDateTime(record.lastLoginAt)}</span> },
    {
      key: "actions",
      header: "إجراءات",
      render: record => {
        const role = record.role as EmployeeRole;
        const status = record.status as EmployeeStatus;
        const target = { id: record.employeeId, role, status };
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {canPrincipal(principal, "user:role:update") ? (
              <select
                aria-label={`دور ${record.fullName}`}
                value={roleEdit[record.employeeId] ?? record.role}
                onChange={e => {
                  setRoleEdit(prev => ({ ...prev, [record.employeeId]: e.target.value }));
                  changeRole(record, e.target.value as EmployeeRole);
                }}
                className="min-h-11 rounded-lg border border-brand-border bg-white px-3 text-xs font-bold"
              >
                {EMPLOYEE_ROLES.filter(candidate => canAssignRole(principal, candidate)).map(candidate => (
                  <option key={candidate} value={candidate}>{ROLE_LABELS_AR[candidate]}</option>
                ))}
              </select>
            ) : null}
            {(status === "SUSPENDED" || status === "DISABLED") && canReactivateUser(principal, target) ? (
              <AdminButton size="sm" variant="success" onClick={() => setConfirm({ record, action: "REACTIVATE", nextStatus: "ACTIVE" })}>
                إعادة تفعيل
              </AdminButton>
            ) : null}
            {status === "ACTIVE" && canDisableUser(principal, target, { activeOwnerCount }) ? (
              <>
                <AdminButton size="sm" variant="secondary" onClick={() => setConfirm({ record, action: "SUSPEND", nextStatus: "SUSPENDED" })}>
                  إيقاف مؤقت
                </AdminButton>
                <AdminButton size="sm" variant="danger" onClick={() => setConfirm({ record, action: "DISABLE", nextStatus: "DISABLED" })}>
                  تعطيل
                </AdminButton>
              </>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <AdminPageShell
      title="الموظفون"
      subtitle="أدوار العاملين وحالاتهم — الدعوة إدارية فقط"
      actions={
        <>
          <AdminButton variant="ghost" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
            <RefreshCw size={15} />
          </AdminButton>
          {canPrincipal(principal, "user:create") ? (
            <AdminButton size="sm" onClick={() => setInviteOpen(true)}>
              <Plus size={16} /> دعوة موظف
            </AdminButton>
          ) : null}
        </>
      }
    >
      <Toaster position="top-center" dir="rtl" richColors closeButton />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 p-4 text-xs font-bold text-brand-muted">
          <Badge tone="blue">جلستك: {resolved.fullName}</Badge>
          <Badge tone="amber">{ROLE_LABELS_AR[resolved.role]}</Badge>
          <span>
            مصدر الدور:{" "}
            {resolved.roleSource === "directory"
              ? "دليل البوابة"
              : resolved.roleSource === "owner_allowlist"
                ? "قائمة الملاك وقت البناء (VITE_OWNER_EMAILS)"
                : "افتراضي مشاهد (هوية Access غير موجودة في الدليل)"}
          </span>
        </div>
      </Card>

      {query.isLoading ? (
        <LoadingState />
      ) : records.length === 0 ? (
        <Card>
          <CardHeader title="دليل الموظفين" icon={<Users size={18} />} />
          <div className="p-5">
            <EmptyState
              tone="warning"
              icon={<ShieldAlert size={22} />}
              title="قراءة دليل الموظفين غير مفعّلة على البوابة"
              description="أضف إجراء employees (قراءة محمية بهوية Cloudflare Access) لعرض كل الموظفين. حماية /admin تبقى على عاتق Cloudflare Access على الحافة، ودعوات الموظفين هنا تُنشئ حزم اعتماد جاهزة للدليل + Access Policy."
              action={canPrincipal(principal, "user:create") ? (
                <AdminButton size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus size={15} /> دعوة موظف
                </AdminButton>
              ) : undefined}
            />
          </div>
        </Card>
      ) : (
        <Card>
          <DataTable columns={columns} rows={records} keyOf={record => record.employeeId} pageSize={25} />
        </Card>
      )}

      {inviteOpen ? <InviteDialog onClose={() => setInviteOpen(false)} /> : null}
      {confirm ? (
        <ConfirmDialog
          tone={confirm.action === "REACTIVATE" ? "success" : "danger"}
          title={`تأكيد: ${confirm.action === "REACTIVATE" ? "إعادة تفعيل" : confirm.action === "SUSPEND" ? "إيقاف مؤقت" : "تعطيل"} ${confirm.record.fullName}`}
          description={
            confirm.action === "DISABLE"
              ? "التعطيل يلغي وصول الموظف للوحة فور إبطال جلسته. يجب أيضًا إزالته من سياسة Cloudflare Access."
              : confirm.action === "SUSPEND"
                ? "الإيقاف المؤقت يمنع كل الصلاحيات حتى إعادة التفعيل."
                : "إعادة التفعيل تستعيد دور الموظف، شريطة بقائه في سياسة Cloudflare Access."
          }
          confirmLabel="تأكيد الإجراء"
          onConfirm={runStatusAction}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </AdminPageShell>
  );
}
