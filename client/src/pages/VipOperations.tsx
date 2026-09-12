import { useState } from "react";
import { Check, ClipboardCopy, ExternalLink, ShieldAlert } from "lucide-react";
import {
  BrutalCard,
  Field,
  GhostButton,
  Notice,
  PageTitle,
  PrimaryButton,
  TextArea,
  TextInput,
} from "@/admin/ui";
import {
  buildCardPayment,
  buildManualOperation,
  manualOperationLabels,
  type CardPaymentMethod,
  type ManualOperationType,
} from "@/lib/vipManualOperation";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

const SHEET_ID = "1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc";
const CONSOLE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=155540235`;
const OPERATIONS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=155540234`;
const PAYMENTS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=155540236`;
const DASHBOARD_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=155540237`;

const requestedStatuses: Partial<Record<ManualOperationType, string>> = {
  ISSUE_CARD: "NEW",
  ACTIVATE_CARD: "ACTIVE",
  SUSPEND_CARD: "SUSPENDED",
  REPLACE_CARD: "REPLACED",
};

export default function VipOperations() {
  const [operationType, setOperationType] =
    useState<ManualOperationType>("ISSUE_CARD");
  const [cardSerial, setCardSerial] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [cardTypeId, setCardTypeId] = useState("VIP");
  const [staffId, setStaffId] = useState("");
  const [staffWhatsApp, setStaffWhatsApp] = useState("");
  const [partnerOrBranchId, setPartnerOrBranchId] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [amountEgp, setAmountEgp] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<CardPaymentMethod>("CASH");
  const [discountEgp, setDiscountEgp] = useState("");
  const [previousStatus, setPreviousStatus] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [notes, setNotes] = useState("");
  const [preparedRow, setPreparedRow] = useState("");
  const [preparedPaymentRow, setPreparedPaymentRow] = useState("");
  const [operationId, setOperationId] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentCopied, setPaymentCopied] = useState(false);

  const resetPrepared = () => {
    setPreparedRow("");
    setPreparedPaymentRow("");
    setOperationId("");
    setMessage("");
    setCopied(false);
    setPaymentCopied(false);
  };

  const prepare = () => {
    const result = buildManualOperation({
      operationType,
      cardSerial,
      membershipId,
      staffId,
      staffWhatsApp,
      partnerOrBranchId,
      invoiceReference,
      amountEgp,
      discountEgp,
      previousStatus,
      requestedStatus: requestedStatuses[operationType],
      evidenceLink,
      notes,
    });
    if (!result) {
      setMessage(
        "راجع الرقم التسلسلي وبيانات الموظف والحقول المطلوبة. التفعيل يحتاج مرجع دفع، والخصم يحتاج فاتورة ومبلغًا وخصمًا صحيحين."
      );
      return;
    }
    const payment =
      operationType === "ACTIVATE_CARD"
        ? buildCardPayment({
            cardSerial,
            cardTypeId,
            amountEgp,
            paymentMethod,
            paymentReference: invoiceReference,
            staffId,
          })
        : null;
    if (operationType === "ACTIVATE_CARD" && !payment) {
      setMessage(
        "التفعيل يحتاج نوع الكارت، مبلغ تحصيل أكبر من صفر، وسيلة دفع، ومرجع إيصال صحيح."
      );
      return;
    }
    setPreparedRow(result.tsv);
    setPreparedPaymentRow(payment?.tsv || "");
    setOperationId(result.operationId);
    setMessage(
      "تم تجهيز سطر العملية. انسخه والصقه في أول صف فارغ بسجل العمليات، ثم راجعه قبل الاعتماد."
    );
  };

  const copyPaymentRow = async () => {
    if (!preparedPaymentRow) return;
    await navigator.clipboard.writeText(preparedPaymentRow);
    setPaymentCopied(true);
  };

  const copyRow = async () => {
    if (!preparedRow) return;
    await navigator.clipboard.writeText(preparedRow);
    setCopied(true);
  };

  const input = (value: string, setter: (value: string) => void) => ({
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      resetPrepared();
    },
  });

  return (
    <main id={MAIN_CONTENT_ID} tabIndex={-1}
      dir="rtl"
      className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100"
    >
      <div className="mx-auto max-w-3xl">
        <PageTitle
          title="تشغيل كروت Omran VIP"
          subtitle="تجهيز عمليات الموظفين للشيت اليدوي"
        />

        <Notice kind="warn" className="mb-5">
          هذه الشاشة لا تفعّل الكارت وحدها. ابحث عن الكارت أولًا، ثم الصق السطر
          في سجل العمليات وراجعه واعتمده يدويًا.
        </Notice>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <a
            href={CONSOLE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 border-2 border-electric px-4 py-3 font-black text-electric"
          >
            <ExternalLink size={17} /> البحث في لوحة الموظفين
          </a>
          <a
            href="/vip/qr-test"
            className="inline-flex items-center justify-center gap-2 border-2 border-slate-600 px-4 py-3 font-black text-slate-200"
          >
            اختبار QR محلي
          </a>
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 border-2 border-slate-600 px-4 py-3 font-black text-slate-200"
          >
            <ExternalLink size={17} /> لوحة التقارير
          </a>
        </div>

        <BrutalCard className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نوع العملية">
              <select
                value={operationType}
                onChange={event => {
                  setOperationType(event.target.value as ManualOperationType);
                  resetPrepared();
                }}
                className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric"
              >
                {Object.entries(manualOperationLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رقم الكارت التسلسلي">
              <TextInput
                {...input(cardSerial, setCardSerial)}
                placeholder="OMR-VIP-0001"
                dir="ltr"
              />
            </Field>
            <Field label="رقم العضوية" hint="اختياري حسب العملية">
              <TextInput
                {...input(membershipId, setMembershipId)}
                placeholder="MEM-0001"
                dir="ltr"
              />
            </Field>
            {operationType === "ACTIVATE_CARD" ? (
              <Field label="نوع الكارت">
                <select
                  value={cardTypeId}
                  onChange={event => {
                    setCardTypeId(event.target.value);
                    resetPrepared();
                  }}
                  className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric"
                >
                  <option value="VIP">Omran VIP</option>
                  <option value="SILVER">Omran Silver</option>
                </select>
              </Field>
            ) : null}
            <Field label="رقم الموظف المعتمد">
              <TextInput
                {...input(staffId, setStaffId)}
                placeholder="EMP-01"
                dir="ltr"
              />
            </Field>
            <Field label="واتساب الموظف">
              <TextInput
                {...input(staffWhatsApp, setStaffWhatsApp)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                inputMode="tel"
              />
            </Field>
            <Field label="الشريك أو الفرع" hint="مطلوب عند الخصم أو الشكوى">
              <TextInput
                {...input(partnerOrBranchId, setPartnerOrBranchId)}
                placeholder="BRANCH-SAYED"
                dir="ltr"
              />
            </Field>
            <Field label="مرجع الفاتورة أو الدفع" hint="إلزامي للتفعيل والخصم">
              <TextInput
                {...input(invoiceReference, setInvoiceReference)}
                placeholder="INV-0001"
                dir="ltr"
              />
            </Field>
            <Field label="حالة الكارت قبل العملية" hint="مثال: NEW أو ACTIVE">
              <TextInput
                {...input(previousStatus, setPreviousStatus)}
                placeholder="NEW"
                dir="ltr"
              />
            </Field>
            <Field label="قيمة الفاتورة بالجنيه">
              <TextInput
                {...input(amountEgp, setAmountEgp)}
                placeholder="500.00"
                dir="ltr"
                inputMode="decimal"
              />
            </Field>
            {operationType === "ACTIVATE_CARD" ? (
              <Field label="وسيلة تحصيل قيمة الكارت">
                <select
                  value={paymentMethod}
                  onChange={event => {
                    setPaymentMethod(event.target.value as CardPaymentMethod);
                    resetPrepared();
                  }}
                  className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric"
                >
                  <option value="CASH">نقدي</option>
                  <option value="CARD">بطاقة بنكية</option>
                  <option value="TRANSFER">تحويل</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </Field>
            ) : null}
            <Field label="قيمة الخصم بالجنيه">
              <TextInput
                {...input(discountEgp, setDiscountEgp)}
                placeholder="50.00"
                dir="ltr"
                inputMode="decimal"
              />
            </Field>
            <Field label="رابط إثبات" hint="فاتورة أو مستند داخلي معتمد">
              <TextInput
                {...input(evidenceLink, setEvidenceLink)}
                placeholder="https://..."
                dir="ltr"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="ملاحظات وسبب الإيقاف أو الاستبدال أو الشكوى">
              <TextArea
                value={notes}
                onChange={event => {
                  setNotes(event.target.value);
                  resetPrepared();
                }}
                placeholder="اكتب التفاصيل بوضوح..."
              />
            </Field>
          </div>

          <PrimaryButton
            type="button"
            onClick={prepare}
            className="mt-5 w-full justify-center"
          >
            تجهيز العملية للمراجعة
          </PrimaryButton>

          {message ? (
            <Notice kind={preparedRow ? "success" : "error"} className="mt-4">
              {message}
            </Notice>
          ) : null}

          {preparedRow ? (
            <div className="mt-4 border-2 border-emerald-800 bg-emerald-950/30 p-4">
              <div
                dir="ltr"
                className="text-center font-mono font-black text-emerald-300"
              >
                {operationId}
              </div>
              <textarea
                dir="ltr"
                readOnly
                value={preparedRow}
                className="mt-3 h-24 w-full border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300"
                aria-label="سطر العملية الجاهز للنسخ"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <GhostButton type="button" onClick={copyRow}>
                  {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
                  {copied ? "تم نسخ السطر" : "نسخ السطر"}
                </GhostButton>
                <a
                  href={OPERATIONS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-slate-700 px-3 py-2 text-xs font-bold text-slate-300"
                >
                  <ExternalLink size={15} /> فتح سجل العمليات
                </a>
                {operationType === "ACTIVATE_CARD" ? (
                  <a
                    href={PAYMENTS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border-2 border-slate-700 px-3 py-2 text-xs font-bold text-slate-300"
                  >
                    <ExternalLink size={15} /> تسجيل التحصيل
                  </a>
                ) : null}
              </div>
              {preparedPaymentRow ? (
                <div className="mt-4 border-t border-emerald-800 pt-4">
                  <p className="mb-2 text-sm font-bold text-emerald-200">
                    سطر التحصيل مستقل ويبدأ PENDING للمراجعة
                  </p>
                  <textarea
                    dir="ltr"
                    readOnly
                    value={preparedPaymentRow}
                    className="h-20 w-full border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300"
                    aria-label="سطر تحصيل الكارت الجاهز للنسخ"
                  />
                  <GhostButton type="button" onClick={copyPaymentRow} className="mt-2">
                    {paymentCopied ? <Check size={15} /> : <ClipboardCopy size={15} />}
                    {paymentCopied ? "تم نسخ سطر التحصيل" : "نسخ سطر التحصيل"}
                  </GhostButton>
                </div>
              ) : null}
            </div>
          ) : null}
        </BrutalCard>

        <div className="mt-5 flex items-start gap-3 border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={20} />
          <p>
            كل عملية تبدأ PENDING ولا تصبح نافذة إلا بعد مراجعة موظف مخوّل
            وتحديث السجلات المرتبطة.
          </p>
        </div>
      </div>
    </main>
  );
}
