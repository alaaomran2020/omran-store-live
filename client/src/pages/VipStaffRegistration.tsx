import { useState } from "react";
import { BadgeCheck, MessageCircle, ShieldAlert, UserPlus } from "lucide-react";
import {
  BrutalCard,
  Field,
  Notice,
  PageTitle,
  PrimaryButton,
  TextInput,
} from "@/admin/ui";
import { whatsappNumber } from "@/lib/productFormat";
import {
  buildStaffEnrollmentWhatsAppUrl,
  type StaffRequestedRole,
} from "@/lib/staffEnrollment";

export default function VipStaffRegistration() {
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [requestedRole, setRequestedRole] =
    useState<StaffRequestedRole>("BRANCH_STAFF");
  const [requestCode, setRequestCode] = useState("");
  const [message, setMessage] = useState("");

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
      whatsapp,
      requestedRole,
    });
    if (!request) {
      setMessage("راجع الاسم ورقم الموبايل المصري قبل فتح واتساب.");
      return;
    }

    setRequestCode(request.requestCode);
    window.open(request.url, "_blank", "noopener,noreferrer");
    setMessage(
      `تم تجهيز الطلب ${request.requestCode}. ابعته من واتساب الموظف نفسه، وبعدها المدير يراجع الرقم ويضيف الموظف يدويًا.`
    );
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100"
    >
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
                onChange={event => setDisplayName(event.target.value)}
                placeholder="الاسم الكامل"
                autoComplete="name"
              />
            </Field>
            <Field label="رقم الموبايل">
              <TextInput
                value={mobile}
                onChange={event => setMobile(event.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
            <Field
              label="رقم واتساب"
              hint="اتركه فارغًا إذا كان نفس رقم الموبايل"
            >
              <TextInput
                value={whatsapp}
                onChange={event => setWhatsapp(event.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                inputMode="tel"
              />
            </Field>
            <Field
              label="الدور المطلوب"
              hint="المدير يعتمد أقل صلاحية مناسبة للعمل"
            >
              <select
                value={requestedRole}
                onChange={event =>
                  setRequestedRole(event.target.value as StaffRequestedRole)
                }
                className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-electric focus:outline-none"
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
            <div
              dir="ltr"
              className="mt-3 border-2 border-emerald-700 bg-emerald-950/40 p-3 text-center font-mono text-lg font-black text-emerald-300"
            >
              {requestCode}
            </div>
          ) : null}

          <div className="mt-5">
            <PrimaryButton
              onClick={submitByWhatsApp}
              disabled={!displayName.trim() || !mobile.trim()}
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
  );
}
