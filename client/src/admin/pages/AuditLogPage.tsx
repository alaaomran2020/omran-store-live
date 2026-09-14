/**
 * سجل التدقيق /admin/audit-log — قراءة الأحداث المعتمدة من البوابة فقط
 * (منتجات، أقسام، مخزون، محتوى، موظفين، OTP). لا أسرار ولا رموز: التطهير
 * يتم عند الكتابة (shared/audit.ts) والتصدير CSV محصّن ضد حقن الصيغ.
 */
import { useMemo, useState } from "react";
import { Download, RefreshCw, ScrollText } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  FilterSelect,
  LoadingState,
} from "@/admin/components/primitives";
import { useAuditLog } from "@/admin/dataHooks";
import {
  AUDIT_ACTION_LABELS_AR,
  auditEventsToCsv,
  type AuditAction,
  type AuditEvent,
} from "@shared/audit";
import { formatDateTime } from "@/admin/adminFormat";

function toAuditEvent(record: {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string | null;
  metadata: Record<string, unknown> | null;
}): AuditEvent | null {
  if (!(AUDIT_ACTION_LABELS_AR as Record<string, string>)[record.action]) return null;
  return {
    id: record.id,
    occurredAt: record.occurredAt,
    actorId: record.actorId,
    actorName: record.actorName || record.actorId,
    actorDomain: "EMPLOYEE",
    action: record.action as AuditAction,
    targetType: record.targetType as AuditEvent["targetType"],
    targetId: record.targetId,
    targetName: record.targetName,
    metadata: record.metadata as AuditEvent["metadata"],
  };
}

export default function AuditLogPage() {
  const query = useAuditLog();
  const [actionFilter, setActionFilter] = useState("ALL");
  const [actorFilter, setActorFilter] = useState("ALL");

  const events = useMemo(() => {
    const records = query.data?.status === "live" ? query.data.data : [];
    return records.map(toAuditEvent).filter((e): e is AuditEvent => e !== null);
  }, [query.data]);

  const actors = useMemo(() => Array.from(new Set(events.map(e => e.actorName))), [events]);
  const actions = useMemo(() => Array.from(new Set(events.map(e => e.action))), [events]);

  const filtered = events.filter(e => {
    if (actionFilter !== "ALL" && e.action !== actionFilter) return false;
    if (actorFilter !== "ALL" && e.actorName !== actorFilter) return false;
    return true;
  });

  const exportCsv = () => {
    const blob = new Blob(["\uFEFF", auditEventsToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminPageShell
      title="سجل التدقيق"
      subtitle="كل إجراء إداري حسّاس يُسجَّل بالمُنفِّذ والهدف والوقت"
      actions={
        <>
          <AdminButton variant="ghost" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
            <RefreshCw size={15} />
          </AdminButton>
          {events.length > 0 ? (
            <AdminButton variant="secondary" size="sm" onClick={exportCsv}>
              <Download size={15} /> تصدير CSV
            </AdminButton>
          ) : null}
        </>
      }
    >
      {query.isLoading ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <Card>
          <CardHeader title="لا أحداث تدقيق بعد" icon={<ScrollText size={18} />} />
          <div className="p-5">
            <EmptyState
              tone="warning"
              icon={<ScrollText size={22} />}
              title="قراءة سجل التدقيق غير مفعّلة على البوابة"
              description="إجراءات اللوحة تُرسل بالفعل أحداث admin_audit إلى دفتر البوابة. فعّل إجراء القراءة audit_log (ورقة Audit Log) لتظهر هنا. لا تُختلق أحداث محلية، ولا تُسجَّل أي رموز OTP أو أسرار — التطهير إلزامي في shared/audit.ts."
            />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 gap-3 border-b border-brand-border p-4 sm:grid-cols-2">
            <FilterSelect
              label="نوع الإجراء"
              value={actionFilter}
              onChange={setActionFilter}
              options={[{ value: "ALL", label: "كل الإجراءات" }, ...actions.map(a => ({ value: a, label: AUDIT_ACTION_LABELS_AR[a as AuditAction] ?? a }))]}
            />
            <FilterSelect
              label="المُنفِّذ"
              value={actorFilter}
              onChange={setActorFilter}
              options={[{ value: "ALL", label: "كل الموظفين" }, ...actors.map(a => ({ value: a, label: a }))]}
            />
          </div>
          <ol className="divide-y divide-brand-border">
            {filtered.map(event => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Badge tone="blue">{AUDIT_ACTION_LABELS_AR[event.action] ?? event.action}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-brand-ink">
                    {event.actorName}
                    {event.targetName ? <> · <span className="font-bold text-brand-navy">{event.targetName}</span></> : null}
                  </p>
                  <p className="truncate text-[11px] text-brand-muted">
                    {event.targetType} · <span dir="ltr">{event.targetId}</span>
                    {event.metadata && Object.keys(event.metadata).length > 0 ? ` · ${Object.entries(event.metadata).map(([k, v]) => `${k}=${v}`).join("، ")}` : null}
                  </p>
                </div>
                <time dateTime={event.occurredAt} className="shrink-0 text-[11px] font-bold text-brand-disabled">
                  {formatDateTime(event.occurredAt)}
                </time>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["OTP_REQUESTED", "طلبات OTP"],
          ["PRODUCT_PUBLISHED", "عمليات نشر"],
          ["USER_ROLE_CHANGED", "تغييرات الأدوار"],
          ["INVENTORY_UPDATED", "تحديثات مخزون"],
        ].map(([action, label]) => (
          <Card key={action} className="p-4 text-center">
            <p className="text-xl font-black tabular-nums text-brand-ink">
              {events.filter(e => e.action === action).length}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-brand-muted">{label}</p>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}
