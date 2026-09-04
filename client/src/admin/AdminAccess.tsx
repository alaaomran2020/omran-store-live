import { useEffect, useState } from "react";
import { LogOut, MessageCircle, ShieldCheck, UserPlus } from "lucide-react";
import { BrutalCard, Field, Notice, PageTitle, PrimaryButton, TextInput } from "@/admin/ui";
import ProductIntake from "@/pages/ProductIntake";
import { whatsappNumber } from "@/lib/productFormat";

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

    const text = [
      "طلب دخول لوحة إدارة عمران تويز",
      `الاسم: ${displayName.trim()}`,
      username.trim() ? `اسم المستخدم المقترح: ${username.trim()}` : null,
      `الموبايل: ${mobile.trim()}`,
      `واتساب: ${(whatsapp || mobile).trim()}`,
      "المطلوب: إضافة الموظف إلى Cloudflare Access Policy الخاصة بمسار /admin بعد موافقة الأدمن.",
      "الحالة: PENDING حتى الموافقة.",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setMessage("تم تجهيز طلب الانضمام عبر واتساب. لن تفتح لوحة الإدارة قبل موافقة الأدمن في Cloudflare Access.");
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
                <Field label="اسم المستخدم المقترح" hint="اختياري — المرجع الأساسي في Access يكون البريد/الهوية المعتمدة">
                  <TextInput value={username} onChange={e => setUsername(e.target.value)} placeholder="username" dir="ltr" autoComplete="username" />
                </Field>
                <Field label="رقم الموبايل">
                  <TextInput value={mobile} onChange={e => setMobile(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
                </Field>
                <Field label="رقم واتساب" hint="اتركه فارغًا إذا كان نفس رقم الموبايل">
                  <TextInput value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
                </Field>
              </div>

              {message ? <div className="mt-4 border-2 border-amber-500/50 bg-amber-500/10 p-3 text-sm">{message}</div> : null}

              <div className="mt-5">
                <PrimaryButton onClick={requestAccess} disabled={!displayName.trim() || !mobile.trim()}>
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
