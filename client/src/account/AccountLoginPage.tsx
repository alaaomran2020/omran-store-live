/**
 * تسجيل دخول/حساب العميل بالموبايل + OTP.
 *
 * الخطوة 1: أدخل رقم الموبايل (تطبيع مركزي + رفض صامت للأرقام غير المصرية).
 * الخطوة 2: رمز التحقق (لا يُولّد في الواجهة إطلاقًا — يأتي عبر المزوّد).
 *
 * أمان:
 *   - لا رمز وهمي ولا تخزين محلي؛ الشطيرة يضبطها الخادم.
 *   - عدّاد إعادة الإرسال من توقيت الخادم، ومحاولات خاطئة محدودة خادميًا.
 *   - إن لم يُنشر المزوّد بعد: Fail-Closed برسالة صادقة + قناة واتساب بديلة.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, MessageCircle, RefreshCw, ShieldCheck, Store } from "lucide-react";
import { SeoMetadata } from "@/components/SeoMetadata";
import { AdminButton } from "@/admin/components/primitives";
import { OtpInput } from "./OtpInput";
import { useAccountSession } from "./AccountSession";
import {
  AuthClientError,
  requestOtp,
  verifyOtp,
  type OtpChallengeView,
} from "@/lib/auth/authClient";
import { formatMobile, normalizeEgyptianMobile, normalizeEgyptianMobileResult } from "@shared/mobile";
import {
  OTP_CODE_LENGTH,
  OTP_MAX_WRONG_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from "@shared/otp";
import { STORE_CONTACT } from "@shared/storeContent";

type Step = "mobile" | "otp";

function useCountdown(activeFrom: number | null, durationMs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (activeFrom === null) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [activeFrom]);
  if (activeFrom === null) return 0;
  return Math.max(0, Math.ceil((activeFrom + durationMs - now) / 1000));
}

export default function AccountLoginPage({ domain = "CUSTOMER" as "CUSTOMER" | "EMPLOYEE" }) {
  const [, navigate] = useLocation();
  const { refresh } = useAccountSession();
  const [step, setStep] = useState<Step>("mobile");
  const [mobileInput, setMobileInput] = useState("");
  const [challenge, setChallenge] = useState<OtpChallengeView | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [providerMissing, setProviderMissing] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [challengeStartedAt, setChallengeStartedAt] = useState<number | null>(null);
  const [resendFrom, setResendFrom] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(OTP_RESEND_COOLDOWN_MS / 1000);

  const mobile = useMemo(() => normalizeEgyptianMobile(mobileInput), [mobileInput]);
  const mobileValidation = normalizeEgyptianMobileResult(mobileInput);

  const ttlRemaining = useCountdown(challengeStartedAt, OTP_TTL_MS);
  const resendRemaining = useCountdown(resendFrom, resendCooldown * 1000);

  async function sendChallenge() {
    setError(null);
    if (!mobile) {
      setError(
        mobileValidation.ok === false && mobileValidation.reason === "UNSUPPORTED_NETWORK"
          ? "رقم شبكة غير مدعوم — أرقام شبكات 010/011/012/015 المصرية فقط."
          : "أدخل رقم موبايل مصري صحيح (01X…)."
      );
      return;
    }
    setRequesting(true);
    try {
      const view = await requestOtp(domain, mobile);
      setChallenge(view);
      setChallengeStartedAt(Date.now());
      setResendFrom(Date.now());
      setResendCooldown(view.resendInSeconds);
      setStep("otp");
      setCode("");
      setWrongAttempts(0);
    } catch (caught) {
      if (caught instanceof AuthClientError) {
        if (caught.code === "PROVIDER_NOT_CONFIGURED") {
          setProviderMissing(true);
        } else if (caught.code === "RATE_LIMITED") {
          setError(`محاولات كثيرة. انتظر ${caught.retryAfterSeconds ?? 60} ثانية ثم أعد المحاولة.`);
        } else {
          setError("تعذّر إرسال الرمز، حاول مرة أخرى بعد قليل.");
        }
      } else {
        setError("تعذّر الاتصال بالخدمة.");
      }
    } finally {
      setRequesting(false);
    }
  }

  async function confirmCode() {
    if (!challenge || code.length !== OTP_CODE_LENGTH) {
      setError(`أدخل الرمز المكوّن من ${OTP_CODE_LENGTH} خانات.`);
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verifyOtp(domain, challenge.challengeId, code);
      await refresh();
      navigate("/account/profile");
    } catch (caught) {
      const nextAttempts = wrongAttempts + 1;
      setWrongAttempts(nextAttempts);
      if (caught instanceof AuthClientError) {
        if (caught.code === "EXPIRED_CODE") {
          setError("انتهت صلاحية الرمز. اطلب رمزًا جديدًا.");
          setStep("mobile");
        } else if (caught.code === "TOO_MANY_ATTEMPTS" || nextAttempts >= OTP_MAX_WRONG_ATTEMPTS) {
          setError("عدد محاولات خاطئة كبير — اطلب رمزًا جديدًا.");
          setStep("mobile");
          setChallenge(null);
        } else if (caught.code === "EMPLOYEE_DISABLED") {
          setError("هذا الحساب الموظفي معطّل. تواصل مع المالك.");
        } else if (caught.code === "EMPLOYEE_NOT_INVITED") {
          setError("لا يوجد حساب موظف بهذا الرقم. الدعوات تتم من المالك أو المدير.");
        } else {
          setError("رمز غير صحيح.");
        }
      } else {
        setError("تعذّر التحقق، حاول مرة أخرى.");
      }
    } finally {
      setVerifying(false);
    }
  }

  const whatsappHref = `https://wa.me/${STORE_CONTACT.whatsapp}?text=${encodeURIComponent("مرحبًا، أريد مساعدة بخصوص حسابي في عمران تويز.")}`;

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-brand-cream px-4 py-10">
      <SeoMetadata path="/account/login" title="تسجيل الدخول | عمران تويز" description="دخول حساب العميل برقم الموبايل ورمز تحقق." robots="noindex,follow" />

      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-6 shadow-[0_8px_30px_rgba(16,42,82,0.08)] sm:p-8">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-brand-blue">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-blue text-white"><Store size={22} /></span>
          <span className="text-base font-black text-brand-ink">عمران تويز</span>
        </Link>

        {step === "mobile" ? (
          <>
            <h1 className="text-center text-xl font-black text-brand-ink">أدخل رقم الموبايل</h1>
            <p className="mt-1 text-center text-sm leading-6 text-brand-muted">
              هنرسل لك رمز تحقق على واتساب/رسالة نصية. الرقم يُحفظ بصيغة موحّدة حتى لا يتكرر حسابك.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-brand-navy">رقم الموبايل</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoFocus
                  dir="ltr"
                  className="h-13 w-full rounded-2xl border-2 border-brand-border bg-white px-4 text-center text-lg font-black tracking-wider outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
                  style={{ height: "3.25rem" }}
                  placeholder="01X XXXXXXX"
                  value={mobileInput}
                  onChange={event => {
                    setProviderMissing(false);
                    setError(null);
                    setMobileInput(event.target.value);
                  }}
                  onKeyDown={event => {
                    if (event.key === "Enter") void sendChallenge();
                  }}
                />
                {mobile ? <span className="mt-1 block text-center text-xs font-bold text-brand-success">{formatMobile(mobile)}</span> : null}
              </label>

              {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{error}</p> : null}

              {providerMissing ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <ShieldCheck size={22} className="mx-auto mb-2 text-amber-600" />
                  <p className="text-sm font-extrabold text-amber-900">تسجيل الحسابات بالـOTP قيد التفعيل</p>
                  <p className="mt-1 text-xs leading-6 text-amber-800">
                    بوابة التحقق لم تُنشر بعد، ولا نعرض رموزًا وهمية أبدًا. في هذه الأثناء يمكنك إتمام الطلب والاشتراك عبر واتساب مباشرة.
                  </p>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-whatsapp px-5 text-sm font-extrabold text-white hover:bg-whatsapp-hover"
                  >
                    <MessageCircle size={17} /> تواصل عبر واتساب
                  </a>
                </div>
              ) : null}

              <AdminButton className="w-full" onClick={sendChallenge} loading={requesting} disabled={!mobile}>
                إرسال رمز التحقق
              </AdminButton>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-center text-xl font-black text-brand-ink">أدخل رمز التحقق</h1>
            <p className="mt-1 text-center text-sm text-brand-muted">
              أرسلنا الرمز إلى{" "}
              <span dir="ltr" className="font-black text-brand-navy">{mobile ? formatMobile(mobile) : ""}</span>
            </p>

            <div className="mt-6">
              <OtpInput value={code} onChange={setCode} disabled={verifying || ttlRemaining === 0} hasError={Boolean(error)} />
              <p className="mt-3 text-center text-[11px] font-bold text-brand-muted" aria-live="polite">
                {ttlRemaining > 0 ? `صلاحية الرمز: ${ttlRemaining / 60 | 0}:${String(ttlRemaining % 60).padStart(2, "0")}` : "انتهت صلاحية الرمز — اطلب رمزًا جديدًا."}
              </p>
            </div>

            {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-800">{error}</p> : null}

            <div className="mt-5 space-y-3">
              <AdminButton className="w-full" onClick={confirmCode} loading={verifying} disabled={code.length !== OTP_CODE_LENGTH || ttlRemaining === 0}>
                تأكيد وتسجيل الدخول
              </AdminButton>
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStep("mobile")}
                  className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                >
                  <ArrowLeft size={13} /> تغيير الرقم
                </button>
                <button
                  type="button"
                  onClick={() => void sendChallenge()}
                  disabled={resendRemaining > 0 || requesting}
                  className="inline-flex items-center gap-1 text-brand-navy hover:text-brand-blue disabled:opacity-50"
                >
                  <RefreshCw size={13} className={requesting ? "animate-spin" : ""} />
                  {resendRemaining > 0 ? `إعادة الإرسال بعد ${resendRemaining} ثانية` : "إعادة إرسال الرمز"}
                </button>
              </div>
              {wrongAttempts > 0 ? (
                <p className="text-center text-[11px] font-bold text-brand-red">
                  محاولات خاطئة: {wrongAttempts} من {OTP_MAX_WRONG_ATTEMPTS}
                </p>
              ) : null}
            </div>
          </>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold leading-5 text-brand-disabled">
          <ShieldCheck size={13} /> المصادقة على خادم موثوق — لا نخزّن رموزًا أو جلسات في متصفحك.
        </p>
      </div>
    </div>
  );
}
