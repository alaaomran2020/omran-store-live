/**
 * client/src/admin/AdminLoginPage.tsx — تسجيل دخول المدراء عبر واتساب (OTP/رابط سحري).
 *
 * الدورة:
 *  ① المدير يُدخل رقم واتسابه الشخصي → POST /api/admin/auth/request-code
 *     (الخادم يتحقق أن الرقم مسجَّل كمدير، يطبّق حدود المعدل، ثم يرسل
 *      كودًا من 6 أرقام عبر WhatsApp Cloud API)
 *  ② يُدخل الكود من واتساب → POST /api/admin/auth/verify
 *  ③ الخادم ينشئ جلسة داخل Cookie HttpOnly (لا شيء في localStorage)
 *
 * في وضع التطوير (AUTH_DEV_MODE=1 / بلا WHATSAPP_TOKEN) يعرض النظام الكود
 * مباشرة حتى تُختبر الدورة كاملة بدون مزوّد واتساب حقيقي.
 */
import { useCallback, useEffect, useState } from "react";
import type { AdminInfo } from "@/lib/adminApi";
import { requestCode, verifyCode } from "@/lib/adminApi";
import { BrutalCard, Field, GhostButton, Notice, OtpBoxes, PrimaryButton, TextInput } from "./ui";

export default function AdminLoginPage({
  onLoggedIn,
  navigate,
}: {
  session: { admin: AdminInfo | null; booted: boolean };
  onLoggedIn: () => Promise<AdminInfo | null>;
  navigate: (to: string) => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+20");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [dev, setDev] = useState<{ code?: string; url?: string } | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // الرابط السحري: /admin/login?t=TOKEN&p=PHONE → تحقق تلقائي
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    const p = params.get("p") || "";
    if (!t) return;
    let alive = true;
    setBusy(true);
    verifyCode({ phone: p, token: t })
      .then(async () => {
        const admin = await onLoggedIn();
        if (alive && admin) navigate("/admin/products");
      })
      .catch(err => {
        if (alive) {
          setError(err instanceof Error ? err.message : "فشل التحقق من الرابط السحري");
          setBusy(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [onLoggedIn, navigate]);

  // عدّاد إعادة الإرسال
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const submitPhone = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setError("");
      setInfo("");
      setDev(null);
      setBusy(true);
      try {
        const data = await requestCode(phone.trim());
        setStep("code");
        setInfo(
          data.delivered
            ? "أُرسل كود مكوّن من 6 أرقام إلى واتسابك — صالح لمدة 5 دقائق."
            : "تعذّر الإرسال — جرّب مجددًا."
        );
        setResendIn(Math.max(data.retryAfterSec ?? 15, 15));
        if (data.devCode) {
          setDev({ code: data.devCode, url: data.devMagicUrl });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل طلب الكود");
      } finally {
        setBusy(false);
      }
    },
    [busy, phone]
  );

  const submitCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy || code.length < 6) return;
      setError("");
      setBusy(true);
      try {
        const data = await verifyCode({ phone: phone.trim(), code });
        if (data.admin) {
          await onLoggedIn();
          navigate("/admin/products");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "فشل التحقق";
        const attemptsLeft = (err as { payload?: { attemptsLeft?: number } })?.payload?.attemptsLeft;
        setError(attemptsLeft != null ? `${message} — محاولات متبقية: ${attemptsLeft}` : message);
        setCode("");
      } finally {
        setBusy(false);
      }
    },
    [busy, code, navigate, onLoggedIn, phone]
  );

  const resend = useCallback(() => {
    setCode("");
    setError("");
    setStep("phone");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-block border-2 border-ink-deep bg-electric px-3 py-2 font-mono text-sm font-black tracking-[0.3em] text-white">
            OM/ADMIN
          </div>
          <h1 className="text-lg font-black text-slate-100">دخول المدراء — متجر عمران</h1>
          <p className="mt-1 text-xs text-slate-500">
            بلا كلمات مرور: رقم واتساب + كود لمرة واحدة
          </p>
        </div>

        <BrutalCard className="p-6">
          {error ? (
            <Notice kind="error" className="mb-4">
              {error}
            </Notice>
          ) : null}
          {info ? (
            <Notice kind="info" className="mb-4">
              {info}
            </Notice>
          ) : null}

          {dev ? (
            <Notice kind="warn" className="mb-4" >
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase">وضع التطوير — الكود مباشرة</span>
                <span dir="ltr" className="text-center font-mono text-3xl font-black tracking-[0.4em] text-sunbeam">
                  {dev.code}
                </span>
                {dev.url ? (
                  <a
                    dir="ltr"
                    href={dev.url}
                    className="break-all text-center text-[11px] text-electric-soft underline"
                  >
                    {dev.url}
                  </a>
                ) : null}
              </div>
            </Notice>
          ) : null}

          {step === "phone" ? (
            <form onSubmit={submitPhone} className="flex flex-col gap-4">
              <Field label="رقم الواتساب الشخصي (بصيغة دولية)" hint="مثال: +201000000000 — الرقم نفسه المسجَّل كمدير">
                <TextInput
                  dir="ltr"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                  placeholder="+201000000000"
                  disabled={busy}
                  autoComplete="tel"
                />
              </Field>
              <PrimaryButton type="submit" disabled={busy || phone.trim().length < 10}>
                {busy ? "جارٍ الإرسال…" : "إرسال كود الدخول"}
              </PrimaryButton>
            </form>
          ) : (
            <form onSubmit={submitCode} className="flex flex-col gap-4">
              <Field label="كود التحقق (6 أرقام من واتساب)" hint={resendIn > 0 ? `يمكنك طلب كود جديد بعد ${resendIn} ثانية` : "لم يصلك؟ اطلب كودًا جديدًا"}>
                <div className="flex justify-center py-1">
                  <OtpBoxes value={code} onChange={setCode} disabled={busy} />
                </div>
              </Field>
              <PrimaryButton type="submit" disabled={busy || code.length < 6}>
                {busy ? "جارٍ التحقق…" : "دخول اللوحة"}
              </PrimaryButton>
              <GhostButton type="button" onClick={resend} disabled={busy || resendIn > 0}>
                تغيير الرقم / إعادة الإرسال
              </GhostButton>
            </form>
          )}
        </BrutalCard>

        <p className="mt-4 text-center font-mono text-[10px] tracking-[0.25em] text-slate-600 uppercase">
          Zero-Password · WhatsApp OTP · RBAC
        </p>
      </div>
    </div>
  );
}
