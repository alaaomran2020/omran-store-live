import { useEffect, useMemo, useState } from "react";
import { Camera, Download, ExternalLink, ImagePlus } from "lucide-react";
import { BrutalCard, Field, Notice, PageTitle, PrimaryButton, TextInput } from "@/admin/ui";
import {
  DEFAULT_IMAGE_VERIFICATION_STATUS,
  IMAGE_SOURCES,
  buildImageMatchKey,
  type ImageSource,
  type ProductImageIntake,
} from "@shared/productIntake";

const STORAGE_KEY = "omran-product-image-intake-v2";
const MASTER_DATABASE_URL = "https://docs.google.com/spreadsheets/d/1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc/edit";

type CommercialDraft = ProductImageIntake & {
  employeeName: string;
  barcode: string;
  category: string;
  purchasePriceEgp: string;
  retailPriceEgp: string;
  wholesalePriceEgp: string;
};

function readDrafts(): CommercialDraft[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function ProductIntake() {
  const [drafts, setDrafts] = useState<CommercialDraft[]>(() => readDrafts());
  const [employeeName, setEmployeeName] = useState("");
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [purchasePriceEgp, setPurchasePriceEgp] = useState("");
  const [retailPriceEgp, setRetailPriceEgp] = useState("");
  const [wholesalePriceEgp, setWholesalePriceEgp] = useState("");
  const [imageSource, setImageSource] = useState<ImageSource>("Camera");
  const [imageSourceRef, setImageSourceRef] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  const matchKey = useMemo(() => buildImageMatchKey(productName, sku || barcode), [productName, sku, barcode]);

  const handleFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageName(file.name || `camera-${Date.now()}.jpg`);
      setImageDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  const saveDraft = () => {
    if (!employeeName.trim() || !productName.trim() || !imageDataUrl) return;
    const draft: CommercialDraft = {
      id: crypto.randomUUID(),
      employeeName: employeeName.trim(),
      productName: productName.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      category: category.trim(),
      purchasePriceEgp: purchasePriceEgp.trim(),
      retailPriceEgp: retailPriceEgp.trim(),
      wholesalePriceEgp: wholesalePriceEgp.trim(),
      imageSource,
      imageSourceRef: imageSourceRef.trim(),
      imageVerificationStatus: DEFAULT_IMAGE_VERIFICATION_STATUS,
      imageMatchKey: matchKey,
      intakeChannel: imageSource,
      intakeNotes: intakeNotes.trim(),
      imageName,
      imageDataUrl,
      createdAt: new Date().toISOString(),
    };
    setDrafts(current => [draft, ...current]);
    setProductName("");
    setSku("");
    setBarcode("");
    setCategory("");
    setPurchasePriceEgp("");
    setRetailPriceEgp("");
    setWholesalePriceEgp("");
    setImageSourceRef("");
    setIntakeNotes("");
    setImageName("");
    setImageDataUrl("");
  };

  const exportDrafts = () => {
    const headers = [
      "intake_id",
      "received_at",
      "employee_name",
      "source",
      "source_reference",
      "photo_url",
      "barcode",
      "sku",
      "product_name_ar",
      "category",
      "subcategory",
      "brand",
      "supplier",
      "purchase_price_egp",
      "retail_price_egp",
      "wholesale_price_egp",
      "price_verified",
      "image_verified",
      "identity_verified",
      "duplicate_check",
      "content_status",
      "qa_status",
      "workflow_status",
      "review_reason",
      "reviewed_by",
      "reviewed_at",
    ];

    const rows = drafts.map(draft => [
      draft.id,
      draft.createdAt,
      draft.employeeName,
      draft.imageSource,
      draft.imageSourceRef,
      "",
      draft.barcode,
      draft.sku,
      draft.productName,
      draft.category,
      "",
      "",
      "",
      draft.purchasePriceEgp,
      draft.retailPriceEgp,
      draft.wholesalePriceEgp,
      "FALSE",
      "FALSE",
      "FALSE",
      "CLEAR",
      "RAW",
      "NEEDS_REVIEW",
      "NEEDS_REVIEW",
      draft.intakeNotes,
      "",
      "",
    ]);

    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `omran-product-intake-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <PageTitle title="Product Intake — التشغيل اليومي" subtitle="استقبال المنتج والصورة والسعر والتصنيف ثم إرساله للمراجعة" />
        <Notice kind="warn" className="mb-5">
          أي منتج جديد يبدأ NEEDS_REVIEW. لا يتم اعتماد السعر أو الصورة أو الهوية أو النشر تلقائيًا.
        </Notice>

        <div className="mb-5 flex flex-wrap gap-3">
          <a href={MASTER_DATABASE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border-2 border-electric px-3 py-2 text-sm font-black text-electric">
            <ExternalLink size={16} /> فتح قاعدة التشغيل المشتركة
          </a>
          <span className="self-center text-xs text-slate-500">المصدر المركزي: Product_Intake → مراجعة → Products_Master</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <BrutalCard className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم الموظف">
                <TextInput value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="اسم الموظف المسؤول" />
              </Field>
              <Field label="اسم المنتج">
                <TextInput value={productName} onChange={e => setProductName(e.target.value)} placeholder="مثال: طقم مطبخ أطفال" />
              </Field>
              <Field label="Barcode">
                <TextInput value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="امسح/اكتب الباركود عند توفره" dir="ltr" />
              </Field>
              <Field label="SKU / كود المنتج" hint="اختياري عند الاستلام، ويفضل للمطابقة">
                <TextInput value={sku} onChange={e => setSku(e.target.value)} placeholder="OT-00001" dir="ltr" />
              </Field>
              <Field label="التصنيف المعتمد">
                <TextInput value={category} onChange={e => setCategory(e.target.value)} placeholder="استخدم اسمًا من تبويب Categories" />
              </Field>
              <Field label="مصدر الصورة">
                <select value={imageSource} onChange={e => setImageSource(e.target.value as ImageSource)} className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  {IMAGE_SOURCES.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
              </Field>
              <Field label="سعر الشراء EGP" hint="لا تكتب قيمة غير مؤكدة">
                <TextInput value={purchasePriceEgp} onChange={e => setPurchasePriceEgp(e.target.value)} placeholder="اختياري" dir="ltr" />
              </Field>
              <Field label="سعر القطاعي EGP" hint="لا تكتب قيمة غير مؤكدة">
                <TextInput value={retailPriceEgp} onChange={e => setRetailPriceEgp(e.target.value)} placeholder="اختياري" dir="ltr" />
              </Field>
              <Field label="سعر الجملة EGP" hint="لا تكتب قيمة غير مؤكدة">
                <TextInput value={wholesalePriceEgp} onChange={e => setWholesalePriceEgp(e.target.value)} placeholder="اختياري" dir="ltr" />
              </Field>
              <Field label="مرجع المصدر" hint="رابط المنشور/المحادثة/المجلد أو أي مرجع متاح">
                <TextInput value={imageSourceRef} onChange={e => setImageSourceRef(e.target.value)} placeholder="اختياري" dir="ltr" />
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

            {imageDataUrl ? <img src={imageDataUrl} alt="معاينة صورة المنتج" className="mt-4 max-h-72 w-full border-2 border-slate-700 object-contain" /> : null}

            <div className="mt-4">
              <Field label="سبب/ملاحظات المراجعة">
                <TextInput value={intakeNotes} onChange={e => setIntakeNotes(e.target.value)} placeholder="مثال: يحتاج تأكيد السعر أو تطابق الصورة مع الباركود" />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={saveDraft} disabled={!employeeName.trim() || !productName.trim() || !imageDataUrl}>حفظ للمراجعة</PrimaryButton>
              <span className="text-xs text-slate-500">Match key: {matchKey || "—"}</span>
            </div>
          </BrutalCard>

          <BrutalCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-black">قائمة الاستلام على هذا الجهاز</h2>
              <button onClick={exportDrafts} disabled={!drafts.length} className="flex items-center gap-2 border-2 border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-40">
                <Download size={15} /> تصدير CSV للشيت
              </button>
            </div>
            <p className="mb-4 text-xs leading-6 text-slate-500">هذه القائمة محلية على الجهاز. في نهاية الاستلام صدّر CSV وأدخله في تبويب Product_Intake، أو سجّل الصف مباشرة في الشيت المشترك.</p>
            <div className="space-y-3">
              {drafts.length === 0 ? <p className="text-sm text-slate-500">لا توجد منتجات بانتظار المراجعة على هذا الجهاز.</p> : drafts.map(draft => (
                <div key={draft.id} className="border-2 border-slate-800 p-3">
                  <div className="flex gap-3">
                    <img src={draft.imageDataUrl} alt={draft.productName} className="h-20 w-20 border border-slate-700 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{draft.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{draft.employeeName} · {draft.sku || draft.barcode || "بدون كود"} · {draft.imageSource}</p>
                      <p className="mt-1 text-xs text-slate-500">{draft.category || "بدون تصنيف"} · قطاعي: {draft.retailPriceEgp || "غير مؤكد"} ج.م</p>
                      <span className="mt-2 inline-block border border-amber-500 px-2 py-1 text-[10px] font-black text-amber-300">NEEDS_REVIEW</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BrutalCard>
        </div>
      </div>
    </main>
  );
}
