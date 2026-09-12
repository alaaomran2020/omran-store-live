import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  MessageCircle,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import {
  BrutalCard,
  Field,
  GhostButton,
  Notice,
  PageTitle,
  PrimaryButton,
  TextInput,
} from "@/admin/ui";
import { whatsappNumber } from "@/lib/productFormat";
import {
  buildStaffEnrollmentWhatsAppUrl,
  normalizeEgyptianMobile,
  type StaffRequestedRole,
} from "@/lib/staffEnrollment";
import BrandHeader from "@/components/BrandHeader";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

export default function VipStaffRegistration() {
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameWhatsApp, setSameWhatsApp] = useState(true);
  const [requestedRole, setRequestedRole] =
    useState<StaffRequestedRole>("BRANCH_STAFF");
  const [requestCode, setRequestCode] = useState("");
  const [preparedUrl, setPreparedUrl] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const mobileIsValid = useMemo(
    () => !mobile.trim() || Boolean(normalizeEgyptianMobile(mobile)),
    [mobile]
  );
  const whatsappIsValid = useMemo(
    () =>
      sameWhatsApp ||
      !whatsapp.trim() ||
      Boolean(normalizeEgyptianMobile(whatsapp)),
    [sameWhatsApp, whatsapp]
  );

  const resetPreparedRequest = () => {
    setRequestCode("");
    setPreparedUrl("");
    setMessage("");
    setCopied(false);
  };

  const submitByWhatsApp = () => {
    setMessage("");
    const destination = whatsappNumber();
    if (!destination) {
      setMessage(
        "رقم واتساب الإدارة غير مضبوط بالموقع. تواصل مع المدير مباشرة."
      );
      return;
    }

    const request = buildStaffEnrollmentWhatsAppUrl({
      destination,
      displayName,
      mobile,
      whatsapp: sameWhatsApp ? mobile : whatsapp,
      requestedRole,
      requestCode: requestCode || undefined,
    });
    if (!request) {
      setMessage("راجع الاسم ورقم الموبايل المصري قبل فتح واتساب.");
      return;
    }

    setRequestCode(request.requestCode);
    setPreparedUrl(request.url);
    window.open(request.url, "_blank", "noopener,noreferrer");
    setMessage(
      `تم تجهيز الطلب ${request.requestCode}. ابعته من واتساب الموظف نفسه، وبعدها المدير يراجع الرقم ويضيف الموظف يدويًا.`
    );
  };

  const copyRequestCode = async () => {
    if (!requestCode) return;
    await navigator.clipboard.writeText(requestCode);
    setCopied(true);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950">
      <BrandHeader />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl">
        <PageTitle
          title="تسجيل موظف في Omran VIP"
          subtitle="التسجيل والتفعيل عبر واتساب — بدون حساب أو كلمة مرور"
        />

        <Notice kind="warn" className="mb-5">
          إرسال الطلب لا يمنح أي صلاحية. التفعيل يتم فقط بعد مراجعة المدير للرقم
          وتسجيل الموظف في سجل التشغيل.
        </Notice>

        <BrutalCard className="p-5">
          <div className="mb-5 flex items-start gap-3 border-2 border-emerald-800 bg-emerald-950/40 p-4">
            <BadgeCheck
              className="mt-0.5 shrink-0 text-emerald-300"
              size={22}
            />
            <div>
              <h2 className="font-black">خطوة واحدة للموظف</h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                اكتب البيانات واضغط إرسال. هيفتح واتساب برسالة جاهزة وكود طلب
                للمطابقة اليدوية.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="اسم الموظف">
              <TextInput
                value={displayName}
                onChange={event => {
                  setDisplayName(event.target.value);
                  resetPreparedRequest();
                }}
                placeholder="الاسم الكامل"
                autoComplete="name"
              />
            </Field>
            <Field label="رقم الموبايل">
              <TextInput
                value={mobile}
                onChange={event => {
                  setMobile(event.target.value);
                  resetPreparedRequest();
                }}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={!mobileIsValid}
                className={!mobileIsValid ? "border-red-500" : undefined}
              />
              {!mobileIsValid ? (
                <span className="mt-1 block text-xs text-red-300">
                  اكتب رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.
                </span>
              ) : null}
            </Field>
            <label className="flex cursor-pointer items-center gap-3 border-2 border-slate-700 bg-slate-950 p-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={sameWhatsApp}
                onChange={event => {
                  setSameWhatsApp(event.target.checked);
                  resetPreparedRequest();
                }}
                className="h-5 w-5 accent-emerald-500"
              />
              رقم واتساب هو نفس رقم الموبايل
            </label>
            {!sameWhatsApp ? (
              <Field label="رقم واتساب الموظف">
                <TextInput
                  value={whatsapp}
                  onChange={event => {
                    setWhatsapp(event.target.value);
                    resetPreparedRequest();
                  }}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={!whatsappIsValid}
                  className={!whatsappIsValid ? "border-red-500" : undefined}
                />
                {!whatsappIsValid ? (
                  <span className="mt-1 block text-xs text-red-300">
                    اكتب رقم واتساب مصري صحيح.
                  </span>
                ) : null}
              </Field>
            ) : null}
            <Field
              label="الدور المطلوب"
              hint="المدير يعتمد أقل صلاحية مناسبة للعمل"
            >
              <select
                value={requestedRole}
                onChange={event => {
                  setRequestedRole(event.target.value as StaffRequestedRole);
                  resetPreparedRequest();
                }}
                className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric"
              >
                <option value="CARD_ISSUER">إصدار وتفعيل الكروت</option>
                <option value="BRANCH_STAFF">موظف فرع وتسجيل الخصومات</option>
                <option value="PARTNER_MANAGER">مسؤول الشركاء</option>
                <option value="SUPPORT">دعم العملاء والشكاوى</option>
                <option value="REVIEWER">مراجع</option>
              </select>
            </Field>
          </div>

          {message ? (
            <div className="mt-4 border-2 border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              {message}
            </div>
          ) : null}
          {requestCode ? (
            <div className="mt-3 border-2 border-emerald-700 bg-emerald-950/40 p-3">
              <div
                dir="ltr"
                className="text-center font-mono text-lg font-black text-emerald-300"
              >
                {requestCode}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <GhostButton type="button" onClick={copyRequestCode}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "تم النسخ" : "نسخ الكود"}
                </GhostButton>
                <GhostButton
                  type="button"
                  onClick={() =>
                    preparedUrl &&
                    window.open(preparedUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  <MessageCircle size={15} /> فتح واتساب مرة تانية
                </GhostButton>
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <PrimaryButton
              onClick={submitByWhatsApp}
              disabled={
                displayName.trim().length < 3 ||
                !normalizeEgyptianMobile(mobile) ||
                (!sameWhatsApp && !normalizeEgyptianMobile(whatsapp))
              }
            >
              <UserPlus size={17} /> <MessageCircle size={17} /> إرسال طلب
              التفعيل على واتساب
            </PrimaryButton>
          </div>
        </BrutalCard>

        <div className="mt-5 flex items-start gap-3 border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={20} />
          <p>
            رقم الطلب للمطابقة فقط وليس Access Token، ولا يمكن استخدامه لتفعيل
            كارت أو تسجيل خصم.
          </p>
        </div>
      </div>
      </main>
    </div>
  );
}
