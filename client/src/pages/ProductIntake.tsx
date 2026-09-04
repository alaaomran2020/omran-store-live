import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ExternalLink, ImagePlus, Loader2 } from "lucide-react";
import { BrutalCard, Field, Notice, PageTitle, PrimaryButton, TextInput } from "@/admin/ui";
import { submitProductIntake, type ProductIntakeReceipt } from "@/lib/productIntakeClient";
import { IMAGE_SOURCES, buildImageMatchKey, type ImageSource } from "@shared/productIntake";

const MASTER_DATABASE_URL = "https://docs.google.com/spreadsheets/d/1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc/edit";

export default function ProductIntake() {
  const [employeeName, setEmployeeName] = useState("");
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchasePriceEgp, setPurchasePriceEgp] = useState("");
  const [retailPriceEgp, setRetailPriceEgp] = useState("");
  const [wholesalePriceEgp, setWholesalePriceEgp] = useState("");
  const [imageSource, setImageSource] = useState<ImageSource>("Camera");
  const [imageSourceRef, setImageSourceRef] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ProductIntakeReceipt | null>(null);
  const [error, setError] = useState("");

  const matchKey = useMemo(() => buildImageMatchKey(productName, sku || barcode), [productName, sku, barcode]);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPhoto(file);
    setReceipt(null);
    setError("");
  };

  const resetProductFields = () => {
    setProductName("");
    setSku("");
    setBarcode("");
    setCategory("");
    setSubcategory("");
    setBrand("");
    setSupplier("");
    setPurchasePriceEgp("");
    setRetailPriceEgp("");
    setWholesalePriceEgp("");
    setImageSourceRef("");
    setIntakeNotes("");
    setPhoto(null);
  };

  const submit = async () => {
    if (!employeeName.trim() || !productName.trim() || !category.trim() || !photo || submitting) return;
    setSubmitting(true);
    setReceipt(null);
    setError("");
    try {
      const result = await submitProductIntake({
        employeeName,
        productNameAr: productName,
        sku,
        barcode,
        category,
        subcategory,
        brand,
        supplier,
        purchasePriceEgp,
        retailPriceEgp,
        wholesalePriceEgp,
        source: imageSource,
        sourceReference: imageSourceRef,
        intakeNotes,
        photo,
      });
      setReceipt(result);
      resetProductFields();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إرسال المنتج إلى قاعدة التشغيل");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <PageTitle title="Product Intake — التشغيل اليومي" subtitle="إدخال مباشر إلى قاعدة التشغيل المركزية، بدون LocalStorage أو CSV" />
        <Notice kind="warn" className="mb-5">
          كل إدخال جديد يُسجل تلقائيًا NEEDS_REVIEW. الصورة والسعر والهوية وحالة النشر لا تُعتمد تلقائيًا.
        </Notice>

        <div className="mb-5 flex flex-wrap gap-3">
          <a href={MASTER_DATABASE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border-2 border-electric px-3 py-2 text-sm font-black text-electric">
            <ExternalLink size={16} /> فتح قاعدة التشغيل المشتركة
          </a>
          <span className="self-center text-xs text-slate-500">Product_Intake → Review / QA → Products_Master → Production Snapshot</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <BrutalCard className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم الموظف">
                <TextInput value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="اسم الموظف المسؤول" />
              </Field>
              <Field label="اسم المنتج بالعربي">
                <TextInput value={productName} onChange={e => setProductName(e.target.value)} placeholder="مثال: طقم مطبخ أطفال" />
              </Field>
              <Field label="Barcode">
                <TextInput value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="اختياري حاليًا" dir="ltr" />
              </Field>
              <Field label="SKU / كود المنتج" hint="اختياري عند الاستلام">
                <TextInput value={sku} onChange={e => setSku(e.target.value)} placeholder="OT-00001" dir="ltr" />
              </Field>
              <Field label="التصنيف المعتمد">
                <TextInput value={category} onChange={e => setCategory(e.target.value)} placeholder="اسم من Categories" />
              </Field>
              <Field label="التصنيف الفرعي">
                <TextInput value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="اختياري" />
              </Field>
              <Field label="البراند">
                <TextInput value={brand} onChange={e => setBrand(e.target.value)} placeholder="اختياري" />
              </Field>
              <Field label="المورد">
                <TextInput value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="اختياري" />
              </Field>
              <Field label="مصدر الصورة">
                <select value={imageSource} onChange={e => setImageSource(e.target.value as ImageSource)} className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  {IMAGE_SOURCES.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
              </Field>
              <Field label="مرجع المصدر" hint="رابط منشور/محادثة/مجلد إن وجد">
                <TextInput value={imageSourceRef} onChange={e => setImageSourceRef(e.target.value)} placeholder="اختياري" dir="ltr" />
              </Field>
              <Field label="سعر الشراء EGP" hint="يُسجل كقيمة غير معتمدة حتى المراجعة">
                <TextInput value={purchasePriceEgp} onChange={e => setPurchasePriceEgp(e.target.value)} placeholder="اختياري" dir="ltr" />
              </Field>
              <Field label="سعر القطاعي EGP" hint="يمكن تركه فارغًا حاليًا">
                <TextInput value={retailPriceEgp} onChange={e => setRetailPriceEgp(e.target.value)} placeholder="اختياري" dir="ltr" />
              </Field>
              <Field label="سعر الجملة EGP" hint="يمكن تركه فارغًا حاليًا">
                <TextInput value={wholesalePriceEgp} onChange={e => setWholesalePriceEgp(e.target.value)} placeholder="اختياري" dir="ltr" />
              </Field>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 border-2 border-slate-700 px-3 py-4 text-sm font-bold hover:border-electric">
                <ImagePlus size={18} /> رفع صورة
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 border-2 border-slate-700 px-3 py-4 text-sm font-bold hover:border-electric">
                <Camera size={18} /> التقاط بالكاميرا
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { setImageSource("Camera"); handleFile(e.target.files?.[0]); }} />
              </label>
            </div>

            {previewUrl ? <img src={previewUrl} alt="معاينة صورة المنتج" className="mt-4 max-h-72 w-full border-2 border-slate-700 object-contain" /> : null}

            <div className="mt-4">
              <Field label="ملاحظات الاستلام / سبب المراجعة">
                <TextInput value={intakeNotes} onChange={e => setIntakeNotes(e.target.value)} placeholder="مثال: السعر غير مؤكد أو يحتاج مطابقة الصورة" />
              </Field>
            </div>

            {error ? <Notice kind="error" className="mt-4">{error}</Notice> : null}
            {receipt ? (
              <Notice kind="success" className="mt-4">
                <span className="inline-flex items-center gap-2 font-black"><CheckCircle2 size={17} /> تم التسجيل في قاعدة التشغيل</span>
                <span className="mt-1 block text-xs" dir="ltr">{receipt.intake_id}</span>
                <span className="mt-1 block text-xs">Workflow: {receipt.workflow_status} · QA: {receipt.qa_status}</span>
              </Notice>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={submit} disabled={!employeeName.trim() || !productName.trim() || !category.trim() || !photo || submitting}>
                {submitting ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري الإرسال</span> : "إرسال لقاعدة التشغيل"}
              </PrimaryButton>
              <span className="text-xs text-slate-500">Match key: {matchKey || "—"}</span>
            </div>
          </BrutalCard>

          <BrutalCard className="p-5">
            <h2 className="mb-4 font-black">دورة المراجعة والاعتماد</h2>
            <div className="space-y-3 text-sm leading-7">
              <div className="border-2 border-slate-800 p-3">
                <b>1. Intake</b>
                <p className="text-slate-400">حفظ الصورة الأصلية في Drive وإنشاء صف Product_Intake بالحالة NEEDS_REVIEW.</p>
              </div>
              <div className="border-2 border-slate-800 p-3">
                <b>2. Review + QA</b>
                <p className="text-slate-400">مراجعة الهوية والصورة والتكرار والمحتوى. أي شك يبقى Fail-Closed ولا يصل للمتجر.</p>
              </div>
              <div className="border-2 border-slate-800 p-3">
                <b>3. Approval</b>
                <p className="text-slate-400">لا يتحول إلى APPROVED/PUBLISHED إلا بعد اعتماد المراجع وتسجيل reviewed_by / reviewed_at.</p>
              </div>
              <div className="border-2 border-electric p-3">
                <b>4. Production Gate</b>
                <p className="text-slate-300">النشر العام يتطلب: active=TRUE + workflow_status=PUBLISHED + qa_status=PASS.</p>
              </div>
            </div>
            <div className="mt-5 border-t-2 border-slate-800 pt-4 text-xs leading-6 text-slate-500">
              لا توجد مسودات تشغيلية على الجهاز، ولا تصدير CSV. قاعدة البيانات المشتركة هي مصدر الحقيقة الوحيد لمرحلة الإدخال والمراجعة.
            </div>
          </BrutalCard>
        </div>
      </div>
    </main>
  );
}
