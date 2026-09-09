import { useEffect, useState } from "react";
import { LogOut, MessageCircle, ShieldCheck, UserPlus } from "lucide-react";
import { BrutalCard, Field, Notice, PageTitle, PrimaryButton, TextInput } from "@/admin/ui";
import ProductIntake from "@/pages/ProductIntake";
import { whatsappNumber } from "@/lib/productFormat";
import { buildStaffEnrollmentWhatsAppUrl, type StaffRequestedRole } from "@/lib/staffEnrollment";

type AccessIdentity = {
  email?: string;
  name?: string;
  id?: string;
};

type AccessState = "checking" | "allowed" | "denied";

const IDENTITY_URL = "/cdn-cgi/access/get-identity";
const LOGOUT_URL = "/cdn-cgi/access/logout";

async function readAccessIdentity(): Promise<AccessIdentity | null> {
  try {
    const response = await fetch(IDENTITY_URL, {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) return null;

    const data = (await response.json().catch(() => null)) as AccessIdentity | null;
    if (!data || (!data.email && !data.name && !data.id)) return null;
    return data;
  } catch {
    return null;
  }
}

export default function AdminAccess() {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [identity, setIdentity] = useState<AccessIdentity | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [username, setUsername] = useState("");
  const [requestedRole, setRequestedRole] = useState<StaffRequestedRole>("BRANCH_STAFF");
  const [requestCode, setRequestCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    readAccessIdentity().then(result => {
      if (cancelled) return;
      setIdentity(result);
      setAccessState(result ? "allowed" : "denied");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (accessState === "allowed" && identity) {
    return (
      <div className="relative">
        <div dir="rtl" className="absolute left-4 top-4 z-50 flex items-center gap-2">
          <span className="hidden border-2 border-emerald-700 bg-emerald-950/90 px-3 py-2 text-xs font-black text-emerald-200 sm:inline-block">
            {identity.email || identity.name || "موظف معتمد"}
          </span>
          <a
            href={LOGOUT_URL}
            className="inline-flex items-center gap-2 border-2 border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-100"
          >
            <LogOut size={15} /> خروج
          </a>
        </div>
        <ProductIntake />
      </div>
    );
  }

  const requestAccess = () => {
    setMessage("");
    if (!displayName.trim() || !mobile.trim()) return;

    const number = whatsappNumber();
    if (!number) {
      setMessage("رقم واتساب الإدارة غير مضبوط بالموقع. لا يمكن إرسال الطلب الآن.");
      return;
    }

    const request = buildStaffEnrollmentWhatsAppUrl({
      destination: number,
      displayName,
      identityEmail: username,
      mobile,
      whatsapp,
      requestedRole,
    });
    if (!request) {
      setMessage("راجع الاسم والبريد ورقم الموبايل المصري قبل فتح واتساب.");
      return;
    }
    setRequestCode(request.requestCode);
    window.open(request.url, "_blank", "noopener,noreferrer");
    setMessage(`تم تجهيز الطلب ${request.requestCode}. ابعته من واتساب الموظف نفسه؛ التفعيل يتم بعد مطابقة الرقم واعتماد المدير.`);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl">
        <PageTitle title="لوحة الإدارة محمية" subtitle="شركة عمران التجارية — وصول الموظفين المعتمدين فقط" />

        {accessState === "checking" ? (
          <BrutalCard className="p-5">
            <Notice kind="info">جاري التحقق من جلسة Cloudflare Access...</Notice>
          </BrutalCard>
        ) : (
          <>
            <Notice kind="warn" className="mb-5">
              تم رفض الوصول افتراضيًا. لوحة الإدارة لا تقبل كلمات مرور مخزنة داخل الواجهة ولا أي جلسة محلية قابلة للتزوير.
            </Notice>

            <BrutalCard className="p-5">
              <div className="mb-5 flex items-start gap-3 border-2 border-emerald-800 bg-emerald-950/40 p-4">
                <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={22} />
                <div>
                  <h2 className="font-black">المصادقة عبر Cloudflare Access</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    إذا كنت موظفًا معتمدًا، افتح رابط الإدارة من جديد وسجّل الدخول من صفحة Cloudflare Access. الموافقة على الموظفين تتم خارج المتصفح وعلى مستوى الدومين.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="اسم الموظف">
                  <TextInput value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="الاسم الكامل" />
                </Field>
                <Field label="بريد أو هوية الدخول" hint="لازم تكون نفس الهوية التي سيستخدمها الموظف في Cloudflare Access">
                  <TextInput value={username} onChange={e => setUsername(e.target.value)} placeholder="name@example.com" dir="ltr" type="email" autoComplete="email" />
                </Field>
                <Field label="رقم الموبايل">
                  <TextInput value={mobile} onChange={e => setMobile(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
                </Field>
                <Field label="رقم واتساب" hint="اتركه فارغًا إذا كان نفس رقم الموبايل">
                  <TextInput value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
                </Field>
                <Field label="الدور المطلوب" hint="المدير يراجع الدور قبل الاعتماد النهائي">
                  <select value={requestedRole} onChange={e => setRequestedRole(e.target.value as StaffRequestedRole)} className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-electric focus:outline-none">
                    <option value="CARD_ISSUER">إصدار وتفعيل الكروت</option>
                    <option value="BRANCH_STAFF">موظف فرع وتسجيل الخصومات</option>
                    <option value="PARTNER_MANAGER">مسؤول الشركاء</option>
                    <option value="SUPPORT">دعم العملاء والشكاوى</option>
                    <option value="REVIEWER">مراجع</option>
                  </select>
                </Field>
              </div>

              {message ? <div className="mt-4 border-2 border-amber-500/50 bg-amber-500/10 p-3 text-sm">{message}</div> : null}
              {requestCode ? <div dir="ltr" className="mt-3 border-2 border-emerald-700 bg-emerald-950/40 p-3 text-center font-mono text-lg font-black text-emerald-300">{requestCode}</div> : null}

              <div className="mt-5">
                <PrimaryButton onClick={requestAccess} disabled={!displayName.trim() || !username.trim() || !mobile.trim()}>
                  <UserPlus size={17} /> <MessageCircle size={17} /> طلب اعتماد موظف
                </PrimaryButton>
              </div>
            </BrutalCard>
          </>
        )}
      </div>
    </main>
  );
}
