import { useMemo, useState } from "react";
import { Download, Printer, QrCode, ShieldAlert } from "lucide-react";
import {
  BrutalCard,
  Field,
  Notice,
  PageTitle,
  PrimaryButton,
  TextInput,
} from "@/admin/ui";
import { createVipQrSvg, normalizeCardSerial } from "@/lib/vipQr";

export default function VipQrTest() {
  const [serial, setSerial] = useState("");
  const normalizedSerial = useMemo(() => normalizeCardSerial(serial), [serial]);
  const svg = useMemo(
    () => (normalizedSerial ? createVipQrSvg(normalizedSerial) : null),
    [normalizedSerial]
  );

  const downloadSvg = () => {
    if (!svg || !normalizedSerial) return;
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${normalizedSerial}-QR-TEST.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100"
    >
      <div className="mx-auto max-w-xl">
        <PageTitle
          title="QR تجريبي لكروت Omran VIP"
          subtitle="يتولد داخل الموبايل أو الكمبيوتر فقط — بدون API أو Access Token"
        />

        <Notice kind="warn" className="mb-5">
          الـQR قابل للتصوير والنسخ، لذلك لا يثبت صلاحية الكارت. الموظف لازم
          يبحث بالرقم التسلسلي في لوحة التشغيل ويراجع الحالة والصلاحية قبل أي
          خصم.
        </Notice>

        <BrutalCard className="p-5">
          <Field
            label="الرقم التسلسلي التجريبي"
            hint="حروف إنجليزية كبيرة وأرقام وشرطة فقط، من 6 إلى 40 خانة"
          >
            <TextInput
              value={serial}
              onChange={event => setSerial(event.target.value.toUpperCase())}
              placeholder="OMR-VIP-0001"
              dir="ltr"
              autoComplete="off"
              maxLength={40}
              aria-invalid={Boolean(serial.trim()) && !normalizedSerial}
              className={
                serial.trim() && !normalizedSerial
                  ? "border-red-500"
                  : undefined
              }
            />
          </Field>

          {svg && normalizedSerial ? (
            <div className="mt-5">
              <div className="mx-auto w-full max-w-72 border-8 border-white bg-white p-2">
                <div
                  role="img"
                  aria-label={`QR تجريبي للكارت ${normalizedSerial}`}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
              <div
                dir="ltr"
                className="mt-3 text-center font-mono font-black text-emerald-300"
              >
                {normalizedSerial}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PrimaryButton type="button" onClick={downloadSvg}>
                  <Download size={17} /> تحميل SVG تجريبي
                </PrimaryButton>
                <PrimaryButton type="button" onClick={() => window.print()}>
                  <Printer size={17} /> طباعة نموذج اختبار
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 p-10 text-slate-500">
              <QrCode size={24} /> اكتب رقمًا تسلسليًا صحيحًا لعرض النموذج
            </div>
          )}
        </BrutalCard>

        <div className="mt-5 flex items-start gap-3 border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={20} />
          <p>
            هذه أداة Pilot فقط. لا تطبع دفعة نهائية قبل اختبار قراءة عينة مطبوعة
            واعتماد تصميم الكارت.
          </p>
        </div>
      </div>
    </main>
  );
}
