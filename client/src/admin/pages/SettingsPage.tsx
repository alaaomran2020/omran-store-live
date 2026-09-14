/**
 * الإعدادات /admin/settings — حالة المصادر والقنوات والصلاحيات ومزوّد OTP.
 * صفحة قراءة وتشخيص في المقام الأول: الإعدادات الحساسة تُدار على الحافة
 * (Cloudflare Access) أو عبر متغيرات البناء، لا عبر إدخال مخزّن في المتصفح.
 */
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Database,
  KeyRound,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  Badge,
  Card,
  CardHeader,
} from "@/admin/components/primitives";
import { useAdminCatalog } from "@/admin/dataHooks";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { adminActionsConfigured } from "@/lib/admin/adminGateway";
import { isAuthProviderConfigured } from "@/lib/auth/authClient";
import {
  PERMISSION_LABELS_AR,
  ROLE_LABELS_AR,
  rolePermissions,
  EMPLOYEE_ROLES,
  type EmployeeRole,
  type Permission,
} from "@shared/rbac";
import { PERMISSIONS } from "@shared/rbac";

function StatusRow({
  icon,
  label,
  state,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  state: "live" | "off" | "loading";
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-brand-border px-5 py-3.5 last:border-0">
      <span className="mt-0.5 text-brand-blue">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-brand-ink">{label}</p>
        <p className="mt-0.5 text-[11px] leading-5 text-brand-muted">{detail}</p>
      </div>
      {state === "live" ? (
        <Badge tone="green"><CheckCircle2 size={12} /> مفعّل</Badge>
      ) : state === "loading" ? (
        <Badge tone="slate">جارٍ الفحص…</Badge>
      ) : (
        <Badge tone="amber"><XCircle size={12} /> غير مفعّل</Badge>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { source, isLoading, directory, directoryStatus, resolved } = useAdminIdentityPageData();
  const [otpState, setOtpState] = useState<"live" | "off" | "loading">("loading");
  const writeEnabled = adminActionsConfigured();
  const ownerAllowlist = String(import.meta.env.VITE_OWNER_EMAILS ?? "")
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean);

  useEffect(() => {
    let cancelled = false;
    isAuthProviderConfigured()
      .then(configured => {
        if (!cancelled) setOtpState(configured ? "live" : "off");
      })
      .catch(() => !cancelled && setOtpState("off"));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminPageShell title="الإعدادات" subtitle="حالة مصادر البيانات والمصادقة والقنوات التشغيلية">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="حالة المصادر والقنوات" icon={<Database size={18} />} />
          <StatusRow
            icon={<Database size={17} />}
            label="كتالوج المنتجات"
            state={isLoading ? "loading" : "live"}
            detail={
              source === "live-gateway"
                ? "مصدر حي من بوابة Make — كل الصفوف والحالات."
                : source === "bundled-csv"
                  ? "كتالوج مضمّن في نسخة النشر /catalog/products.csv (البوابة الحية غير متاحة الآن)."
                  : source === "bundle-snapshots"
                    ? "لقطات المنتجات المعتمدة المضمّنة في الحزمة."
                    : "جرى التحميل من المصدر الاحتياطي."
            }
          />
          <StatusRow
            icon={<Cloud size={17} />}
            label="بوابة إجراءات الكتابة"
            state={writeEnabled ? "live" : "off"}
            detail={
              writeEnabled
                ? "VITE_ADMIN_ACTIONS_WEBHOOK_URL مضبوط: تعديلات المنتجات/المحتوى/المخزون تُرسل مباشرة."
                : "غير مضبوط: الإجراءات تُصدر حزم TSV موثّقة للاعتماد اليدوي في الشيت الرئيسي (نمط التشغيل الحالي)."
            }
          />
          <StatusRow
            icon={<ShieldCheck size={17} />}
            label="دليل الموظفين (الأدوار)"
            state={directoryStatus === "live" ? "live" : "off"}
            detail={
              directoryStatus === "live"
                ? `${directory.length} موظف مقروء من البوابة.`
                : "غير مربوط: الأدوار تُشتق من قائمة الملاك VITE_OWNER_EMAILS ثم افتراضي VIEWER لأي هوية Access معتمدة."
            }
          />
          <StatusRow
            icon={<KeyRound size={17} />}
            label="مزوّد OTP الخادمي (عملاء + موظفون)"
            state={otpState}
            detail="نقاط النهاية Same-origin تحت /api/auth (Pages Function أو بوابة Apps Script/Make مع مزوّد إرسال). المزوّد يولّد الرمز ويخزّنه مجزّأ مع صلاحية/محاولات/معدل طلبات (راجع shared/otp.ts والوثيقة المعمارية)."
          />
          <StatusRow
            icon={<ShieldCheck size={17} />}
            label="Cloudflare Access (الحافة)"
            state="live"
            detail="حماية /admin* على الحافة قبل الوصول للأصول، والهوية موثّقة عبر /cdn-cgi/access/get-identity — لا كلمات مرور في الواجهة."
          />
        </Card>

        <Card>
          <CardHeader title="جلستك الحالية" icon={<ShieldCheck size={18} />} />
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between"><span className="font-bold text-brand-muted">الاسم</span><span className="font-extrabold">{resolved.fullName}</span></div>
            <div className="flex items-center justify-between"><span className="font-bold text-brand-muted">الدور</span><Badge tone="amber">{ROLE_LABELS_AR[resolved.role]}</Badge></div>
            <div className="flex items-center justify-between"><span className="font-bold text-brand-muted">الحالة</span><Badge tone="green">{resolved.status}</Badge></div>
            <div className="flex items-center justify-between gap-2"><span className="font-bold text-brand-muted">البريد</span><span dir="ltr" className="text-xs font-bold">{resolved.email ?? "—"}</span></div>
            <div className="rounded-xl bg-brand-cream p-3 text-[11px] leading-5 text-brand-muted">
              قائمة ملاك البناء (VITE_OWNER_EMAILS — غير سرية):{" "}
              {ownerAllowlist.length ? ownerAllowlist.join("، ") : "لم تُضبط — كل الهويات المعتمدة في Access تحصل على VIEWER حتى يُربط دليل الموظفين."}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="مصفوفة الأدوار والصلاحيات" subtitle="مرجع واحد من shared/rbac.ts — القائمة الفعلية التي تفرضها البوابة أيضًا" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-xs">
            <thead>
              <tr className="border-b border-brand-border text-right">
                <th className="px-4 py-3 font-black text-brand-muted">الصلاحية</th>
                {EMPLOYEE_ROLES.map((role: EmployeeRole) => (
                  <th key={role} className="px-3 py-3 text-center font-black text-brand-navy">
                    {ROLE_LABELS_AR[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(PERMISSIONS as readonly Permission[]).map(permission => (
                <tr key={permission} className="border-b border-brand-border/60 last:border-0">
                  <td className="px-4 py-2 font-bold text-brand-ink">{PERMISSION_LABELS_AR[permission]}</td>
                  {EMPLOYEE_ROLES.map(role => (
                    <td key={role} className="px-3 py-2 text-center">
                      {rolePermissions(role).includes(permission) ? (
                        <CheckCircle2 size={15} className="mx-auto text-brand-success" aria-label="مسموح" />
                      ) : (
                        <XCircle size={14} className="mx-auto text-brand-disabled" aria-label="غير مسموح" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminPageShell>
  );
}

/** هوك صغير يجمع حالة الكتالوج مع الهوية دون استيرادات دائرية. */
function useAdminIdentityPageData() {
  const catalog = useAdminCatalog();
  const identity = useAdminIdentity();
  return { ...catalog, ...identity };
}
