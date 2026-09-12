import { FormEvent, useMemo, useState } from "react";
import { BadgeCheck, Gift, LoaderCircle, MessageCircle, Phone, Sparkles } from "lucide-react";
import { whatsappNumber } from "@/lib/productFormat";

type VipSignupProps = {
  source?: "omran" | "popup";
};

const STORAGE_KEY = "omran_vip_signup";
const SUBSCRIBERS_ENDPOINT = ((import.meta.env.VITE_SUBSCRIBERS_WEB_APP_URL as string | undefined) ?? "").trim();

function normalizeEgyptianMobile(value: string): string | null {
  const arabicDigits: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };

  let digits = value
    .replace(/[٠-٩]/g, digit => arabicDigits[digit] ?? digit)
    .replace(/\D/g, "");

  if (digits.startsWith("0020")) digits = digits.slice(4);
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("1") && digits.length === 10) digits = `0${digits}`;

  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

function registrationSource(source: "omran" | "popup") {
  if (source === "popup") return "popup";
  if (typeof window !== "undefined" && window.location.pathname === "/products") return "products";
  return "storefront";
}

export default function VipSignup({ source = "omran" }: VipSignupProps) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const brandLabel = source === "popup" ? "POP UP" : "عمران";
  const isPopup = source === "popup";
  const destination = useMemo(() => whatsappNumber(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalized = normalizeEgyptianMobile(phone);
    if (!normalized) {
      setError("اكتب رقم موبايل مصري صحيح، مثال: 01XXXXXXXXX");
      return;
    }
    if (!consent) {
      setError("لازم توافق على استلام الجديد والعروض قبل التسجيل.");
      return;
    }
    if (!SUBSCRIBERS_ENDPOINT) {
      setError("التسجيل المركزي غير متاح مؤقتًا. حاول مرة تانية لاحقًا.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = new URLSearchParams({
        phone: normalized,
        consent: "true",
        source: registrationSource(source),
        sourceUrl: typeof window !== "undefined" ? window.location.href : "",
        website: "",
      });

      await fetch(SUBSCRIBERS_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString(),
        keepalive: true,
      });

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ phone: normalized, source, registeredAt: new Date().toISOString() })
        );
      } catch {
        // التخزين المحلي اختياري؛ المصدر الأساسي هو قائمة المشتركين المركزية.
      }

      setRegistered(true);
    } catch {
      setError("حصلت مشكلة أثناء التسجيل. جرّب مرة تانية خلال لحظات.");
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappFollowUp = (() => {
    if (!destination || !registered) return null;
    const normalized = normalizeEgyptianMobile(phone);
    if (!normalized) return null;
    const message = [
      "مرحبًا 👋",
      `تم تسجيلي في قائمة ${brandLabel} المميزة.`,
      `رقم الموبايل: ${normalized}`,
      "حابب أتابع الجديد والعروض على واتساب.",
    ].join("\n");
    return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`;
  })();

  return (
    <section
      dir="rtl"
      aria-labelledby={`vip-signup-title-${source}`}
      className={
        isPopup
          ? "border-y border-fuchsia-200/70 bg-gradient-to-l from-fuchsia-50 via-white to-amber-50 py-8 sm:py-10"
          : "border-y border-brand-border bg-gradient-to-l from-brand-sky via-white to-amber-50 py-8 sm:py-10"
      }
    >
      <div className="container">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,.10)] sm:p-7 lg:p-8">
          <div className={isPopup ? "absolute -start-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-300/25 blur-3xl" : "absolute -start-16 -top-20 h-48 w-48 rounded-full bg-brand-blue/15 blur-3xl"} aria-hidden="true" />
          <div className="absolute -end-16 -bottom-20 h-48 w-48 rounded-full bg-brand-yellow/25 blur-3xl" aria-hidden="true" />

          <div className="relative grid gap-6 lg:grid-cols-[1fr_1.08fr] lg:items-center">
            <div>
              <span className={isPopup ? "inline-flex items-center gap-2 rounded-full bg-fuchsia-100 px-3 py-1.5 text-xs font-black text-fuchsia-700" : "inline-flex items-center gap-2 rounded-full bg-brand-sky px-3 py-1.5 text-xs font-black text-brand-blue"}>
                <Sparkles size={15} aria-hidden="true" /> {brandLabel} VIP
              </span>
              <h2 id={`vip-signup-title-${source}`} className="mt-3 text-2xl font-black tracking-tight text-brand-ink sm:text-3xl">
                خليك مميز ✨ وسجّل برقم موبايلك
              </h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-brand-muted sm:text-[15px]">
                سجل مرة واحدة وخليك من أوائل الناس اللي تعرف أحدث المنتجات والعروض الجديدة من {brandLabel}.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-brand-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cream px-3 py-2"><Gift size={14} /> جديد المنتجات</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cream px-3 py-2"><BadgeCheck size={14} /> منع التسجيل المكرر</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cream px-3 py-2"><MessageCircle size={14} /> واتساب اختياري بعد التسجيل</span>
              </div>
            </div>

            {registered ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center sm:p-6">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <BadgeCheck size={25} aria-hidden="true" />
                </span>
                <p className="mt-3 text-lg font-black text-emerald-900">تم تسجيلك في قائمة الجديد</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800/80">
                  رقمك اتبعت لقائمة المشتركين المركزية. لو كان مسجل قبل كده، النظام بيحدّث سجلك بدل ما يعمل نسخة مكررة.
                </p>
                {whatsappFollowUp && (
                  <a
                    href={whatsappFollowUp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-black text-white transition hover:bg-whatsapp-hover"
                  >
                    <MessageCircle size={17} aria-hidden="true" /> متابعة الجديد على واتساب
                  </a>
                )}
              </div>
            ) : (
              <form onSubmit={submit} className="rounded-2xl border border-brand-border bg-brand-cream/70 p-4 sm:p-5" noValidate>
                <label htmlFor={`vip-phone-${source}`} className="text-sm font-black text-brand-ink">رقم الموبايل</label>
                <div className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 shadow-sm focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue">
                  <Phone size={18} className="shrink-0 text-brand-muted" aria-hidden="true" />
                  <input
                    id={`vip-phone-${source}`}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    dir="ltr"
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    placeholder="01XXXXXXXXX"
                    disabled={submitting}
                    className="min-w-0 flex-1 bg-transparent py-3 text-left text-base font-bold text-brand-ink outline-none placeholder:text-brand-muted disabled:opacity-60"
                    aria-describedby={`vip-help-${source}`}
                  />
                </div>

                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs font-semibold leading-6 text-brand-muted">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={event => setConsent(event.target.checked)}
                    disabled={submitting}
                    className="mt-1 h-4 w-4 rounded border-brand-border accent-brand-blue"
                  />
                  <span>أوافق على استلام تحديثات المنتجات والعروض من شركة عمران التجارية وPOP UP، ويمكنني التوقف في أي وقت.</span>
                </label>

                {error && <p role="alert" className="mt-2 text-xs font-bold text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className={isPopup
                    ? "mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-fuchsia-700 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-700"
                    : "mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-brand-blue-hover disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue"}
                >
                  {submitting ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <BadgeCheck size={18} aria-hidden="true" />}
                  {submitting ? "جاري التسجيل..." : "سجلني في الجديد"}
                </button>
                <p id={`vip-help-${source}`} className="mt-2 text-center text-[11px] font-semibold leading-5 text-brand-muted">
                  لا نطلب كلمة مرور أو بيانات دفع. رقمك يُستخدم فقط للتحديثات التي وافقت عليها.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
