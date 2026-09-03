import { useCallback, useEffect, useState } from "react";
import {
  canManageLeads,
  canReadLeads,
  fetchLeads,
  patchLead,
  type LeadRecord,
  type LeadStatus,
} from "@/lib/adminApi";
import { useAdminSession } from "./AdminApp";
import { BrutalCard, GhostButton, Notice, PageTitle, Spinner } from "./ui";

const statusLabels: Record<LeadStatus, string> = {
  new: "جديد",
  qualified: "مؤهل",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
};

const statuses = Object.keys(statusLabels) as LeadStatus[];

export default function AdminLeadsPage() {
  const { session } = useAdminSession();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const readable = canReadLeads(session.admin);
  const manageable = canManageLeads(session.admin);

  const load = useCallback(async () => {
    if (!readable) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads({ limit: 100 });
      setLeads(data.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تحميل الاستفسارات");
    } finally {
      setLoading(false);
    }
  }, [readable]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (lead: LeadRecord, status: LeadStatus) => {
    if (!manageable || status === lead.status) return;
    setSavingId(lead.id);
    setError(null);
    try {
      const data = await patchLead(lead.id, { status });
      setLeads(current => current.map(item => (item.id === lead.id ? data.lead : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تحديث الحالة");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle
          title="Leads والاستفسارات"
          subtitle="استفسارات المتجر محفوظة في قاعدة الطلبات المبكرة، والقراءة والتعديل محميان بجلسة المدير."
        />
        <GhostButton onClick={() => void load()} disabled={loading}>
          تحديث
        </GhostButton>
      </div>

      {!readable ? (
        <Notice kind="error">لا تملك صلاحية قراءة بيانات العملاء.</Notice>
      ) : null}
      {error ? <Notice kind="error" className="mb-4">{error}</Notice> : null}
      {loading ? <Spinner label="جارٍ تحميل الاستفسارات…" /> : null}

      {!loading && readable && leads.length === 0 ? (
        <BrutalCard className="p-8 text-center text-sm text-slate-400">
          لا توجد استفسارات مسجلة حتى الآن.
        </BrutalCard>
      ) : null}

      {!loading && readable && leads.length > 0 ? (
        <div className="space-y-3">
          {leads.map(lead => (
            <BrutalCard key={lead.id} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-slate-100">{lead.customerName}</span>
                    <span className="font-mono text-[10px] tracking-widest text-slate-500" dir="ltr">
                      {lead.reference}
                    </span>
                  </div>
                  <a
                    href={`tel:${lead.phone}`}
                    dir="ltr"
                    className="mt-1 inline-block font-mono text-xs text-electric-soft hover:text-electric"
                  >
                    {lead.phone}
                  </a>
                  {lead.notes ? (
                    <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400">{lead.notes}</p>
                  ) : null}
                </div>

                <div className="text-xs text-slate-400">
                  <div>المصدر: <span className="text-slate-200">{lead.source}</span></div>
                  <div className="mt-1" dir="ltr">
                    {new Date(lead.createdAt).toLocaleString("ar-EG")}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-500">الحالة</label>
                  <select
                    value={lead.status}
                    disabled={!manageable || savingId === lead.id}
                    onChange={event => void changeStatus(lead, event.target.value as LeadStatus)}
                    className="w-full rounded-none border-2 border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-100 focus:border-electric focus:outline-none disabled:opacity-50"
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>{statusLabels[status]}</option>
                    ))}
                  </select>
                </div>

                <div className="min-w-20 text-center font-mono text-[10px] tracking-widest text-slate-500">
                  {savingId === lead.id ? "SAVING…" : statusLabels[lead.status]}
                </div>
              </div>
            </BrutalCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
