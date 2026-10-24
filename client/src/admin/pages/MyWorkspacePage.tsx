/** مساحة شخصية واحدة لكل هوية مُعتمدة، لا تُختار بالاسم أو بمعرّف داخل الرابط. */
import { Link } from "wouter";
import { BriefcaseBusiness, CircleHelp, LockKeyhole, UserRound } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import { Badge, Card, CardHeader } from "@/admin/components/primitives";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { ROLE_LABELS_AR } from "@shared/rbac";
import { WORKSPACE_INTRO, workspaceShortcuts } from "@shared/employeeWorkspace";

export default function MyWorkspacePage() {
  const { resolved, principal, directoryStatus } = useAdminIdentity();
  const shortcuts = workspaceShortcuts(principal);

  return (
    <AdminPageShell title={`مساحة ${resolved.fullName}`} subtitle="مساحتك الخاصة — الأدوات المتاحة حسب حسابك وصلاحياتك">
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-sky text-brand-blue">
            <UserRound size={28} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-xl font-black text-brand-ink">{resolved.fullName}</h2>
            <Badge tone="blue">{ROLE_LABELS_AR[resolved.role]}</Badge>
            <p className="text-sm leading-7 text-brand-muted">{WORKSPACE_INTRO[resolved.role]}</p>
            <p className="text-xs font-bold text-brand-muted" dir="ltr">{resolved.email ?? "لا يوجد بريد دخول معروف"}</p>
          </div>
        </div>
      </Card>
      {directoryStatus !== "live" && resolved.roleSource === "owner_allowlist" ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          <CircleHelp size={18} className="shrink-0" />
          دليل الموظفين غير متصل حاليًا؛ لا يمكن تأكيد بيانات الزملاء أو تفعيل وصول جديد.
        </div>
      ) : null}
      <Card>
        <CardHeader title="أدواتك المصرح بها" icon={<BriefcaseBusiness size={18} />} subtitle="كل رابط يخضع أيضًا لفحص صلاحية الصفحة؛ ربط بيانات العملاء والمبيعات لا يتم إلا من مصادر معتمدة" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map(shortcut => (
            <Link key={shortcut.href} href={shortcut.href.replace(/^\/admin/, "")} className="min-h-28 rounded-xl border border-brand-border bg-brand-cream p-4 transition hover:border-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25">
              <h3 className="text-sm font-black text-brand-navy">{shortcut.label}</h3>
              <p className="mt-1.5 text-xs leading-6 text-brand-muted">{shortcut.description}</p>
            </Link>
          ))}
        </div>
      </Card>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-border bg-white p-4 text-xs leading-6 text-brand-muted">
        <LockKeyhole size={17} className="shrink-0 text-brand-blue" />
        هذه المساحة مرتبطة بهوية تسجيل دخولك، ولا تمنحك حق الدخول لمساحة زميلك. الأذونات الحساسة يجب فرضها على الخادم أيضًا.
      </div>
    </AdminPageShell>
  );
}
