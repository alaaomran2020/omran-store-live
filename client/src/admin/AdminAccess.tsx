import { useState } from "react";
import { LockKeyhole, MessageCircle, ShieldCheck, UserPlus } from "lucide-react";
import { BrutalCard, Field, Notice, PageTitle, PrimaryButton, TextInput } from "@/admin/ui";
import ProductIntake from "@/pages/ProductIntake";
import { whatsappNumber } from "@/lib/productFormat";

const SESSION_KEY = "omran-admin-session-v1";
const AUTH_URL = ((import.meta.env.VITE_ADMIN_AUTH_URL as string | undefined) ?? "").replace(/\/$/, "");

type Mode = "login" | "request";

function saveSession(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
}

function hasSession() {
  return Boolean(sessionStorage.getItem(SESSION_KEY));
}

export default function AdminAccess() {
  const [authenticated, setAuthenticated] = useState(() => hasSession());
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (authenticated) return <ProductIntake />;

  const login = async () => {
    setMessage("");
    if (!username.trim() || !password) return;
    if (!AUTH_URL) {
      setMessage("تم قفل لوحة الإدارة بأمان، لكن موفر المصادقة المركزي لم يتم ربطه بعد. لن يتم قبول أي دخول محلي غير آمن.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${AUTH_URL}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token) {
        setMessage(data?.message || "بيانات الدخول غير صحيحة أو الحساب غير معتمد من الأدمن.");
        return;
      }
      saveSession(String(data.token));
      setAuthenticated(true);
    } catch {
      setMessage("تعذر الاتصال بخدمة الدخول. لوحة الإدارة ستظل مقفلة لحماية البيانات.");
    } finally {
      setBusy(false);
    }
  };

  const requestAccess = async () => {
    setMessage("");
    if (!username.trim() || !displayName.trim() || !mobile.trim()) return;
    const payload = {
      username: username.trim(),
      displayName: displayName.trim(),
      mobile: mobile.trim(),
      whatsapp: (whatsapp || mobile).trim(),
    };

    if (AUTH_URL) {
      setBusy(true);
      try {
        const response = await fetch(`${AUTH_URL}/request-access`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        setMessage(response.ok ? "تم إرسال الطلب. لن يعمل الحساب قبل موافقة الأدمن." : data?.message || "تعذر إرسال الطلب.");
      } catch {
        setMessage("تعذر إرسال الطلب إلكترونيًا. استخدم زر واتساب لإرسال بيانات الطلب للأدمن.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const number = whatsappNumber();
    if (!number) {
      setMessage("سجل الموظف جاهز، لكن رقم واتساب الإدارة غير مضبوط بالموقع.");
      return;
    }
    const text = [
      "طلب دخول لوحة إدارة عمران تويز",
      `الاسم: ${payload.displayName}`,
      `اسم المستخدم المطلوب: ${payload.username}`,
      `الموبايل: ${payload.mobile}`,
      `واتساب: ${payload.whatsapp}`,
      "الحالة المطلوبة: PENDING حتى موافقة الأدمن",
    ].join("\n");
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setMessage("تم تجهيز طلب الموظف عبر واتساب. الحساب يظل PENDING حتى موافقة الأدمن.");
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl">
        <PageTitle title="دخول لوحة الإدارة" subtitle="شركة عمران التجارية — دخول الموظفين المعتمدين فقط" />
        <Notice kind="warn" className="mb-5">
          لا يتم حفظ كلمة المرور في المتصفح أو Google Sheets. أي موظف جديد يجب أن يكون APPROVED قبل الدخول.
        </Notice>
        <BrutalCard className="p-5">
          <div className="mb-5 flex gap-2">
            <button onClick={() => { setMode("login"); setMessage(""); }} className={`flex-1 border-2 px-3 py-3 text-sm font-black ${mode === "login" ? "border-electric" : "border-slate-700"}`}>
              <LockKeyhole className="mx-auto mb-1" size={18} /> تسجيل الدخول
            </button>
            <button onClick={() => { setMode("request"); setMessage(""); }} className={`flex-1 border-2 px-3 py-3 text-sm font-black ${mode === "request" ? "border-electric" : "border-slate-700"}`}>
              <UserPlus className="mx-auto mb-1" size={18} /> طلب حساب موظف
            </button>
          </div>

          <div className="space-y-4">
            {mode === "request" && (
              <Field label="اسم الموظف">
                <TextInput value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="الاسم الكامل" />
              </Field>
            )}
            <Field label="اسم المستخدم">
              <TextInput value={username} onChange={e => setUsername(e.target.value)} placeholder="username" dir="ltr" autoComplete="username" />
            </Field>
            {mode === "login" ? (
              <Field label="كلمة المرور">
                <TextInput value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" dir="ltr" autoComplete="current-password" />
              </Field>
            ) : (
              <>
                <Field label="رقم الموبايل">
                  <TextInput value={mobile} onChange={e => setMobile(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
                </Field>
                <Field label="رقم واتساب" hint="اتركه فارغًا إذا كان نفس رقم الموبايل">
                  <TextInput value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
                </Field>
              </>
            )}
          </div>

          {message ? <div className="mt-4 border-2 border-amber-500/50 bg-amber-500/10 p-3 text-sm">{message}</div> : null}

          <div className="mt-5">
            {mode === "login" ? (
              <PrimaryButton onClick={login} disabled={busy || !username.trim() || !password}>
                <ShieldCheck size={17} /> {busy ? "جاري التحقق..." : "دخول آمن"}
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={requestAccess} disabled={busy || !username.trim() || !displayName.trim() || !mobile.trim()}>
                <MessageCircle size={17} /> {busy ? "جاري الإرسال..." : "إرسال طلب الانضمام"}
              </PrimaryButton>
            )}
          </div>
        </BrutalCard>
      </div>
    </main>
  );
}
