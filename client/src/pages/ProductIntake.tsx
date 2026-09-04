import { useEffect, useMemo, useState } from "react";
import { Camera, Download, ImagePlus } from "lucide-react";
import { BrutalCard, Field, Notice, PageTitle, PrimaryButton, TextInput } from "@/admin/ui";
import {
  DEFAULT_IMAGE_VERIFICATION_STATUS,
  IMAGE_SOURCES,
  buildImageMatchKey,
  type ImageSource,
  type ProductImageIntake,
} from "@shared/productIntake";

const STORAGE_KEY = "omran-product-image-intake-v1";

function readDrafts(): ProductImageIntake[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ProductIntake() {
  const [drafts, setDrafts] = useState<ProductImageIntake[]>(() => readDrafts());
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [imageSource, setImageSource] = useState<ImageSource>("Camera");
  const [imageSourceRef, setImageSourceRef] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  const matchKey = useMemo(() => buildImageMatchKey(productName, sku), [productName, sku]);

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
    if (!productName.trim() || !imageDataUrl) return;
    const draft: ProductImageIntake = {
      id: crypto.randomUUID(),
      productName: productName.trim(),
      sku: sku.trim(),
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
    setImageSourceRef("");
    setIntakeNotes("");
    setImageName("");
    setImageDataUrl("");
  };

  const exportDrafts = () => {
    const payload = drafts.map(({ imageDataUrl: _imageDataUrl, ...draft }) => draft);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `omran-product-intake-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <PageTitle title="استقبال صور المنتجات" subtitle="Facebook / Instagram / WhatsApp / Telegram / رفع / كاميرا / مزامنة" />
        <Notice kind="warn" className="mb-5">
          أي صورة جديدة تدخل NEEDS_REVIEW افتراضيًا، ولا تصبح VERIFIED أو PASS/PUBLISHED تلقائيًا.
        </Notice>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <BrutalCard className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم المنتج">
                <TextInput value={productName} onChange={e => setProductName(e.target.value)} placeholder="مثال: طقم مطبخ أطفال" />
              </Field>
              <Field label="SKU / كود المنتج" hint="اختياري، لكنه الأفضل للمطابقة">
                <TextInput value={sku} onChange={e => setSku(e.target.value)} placeholder="OT-00001" dir="ltr" />
              </Field>
              <Field label="مصدر الصورة">
                <select value={imageSource} onChange={e => setImageSource(e.target.value as ImageSource)} className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  {IMAGE_SOURCES.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
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
              <Field label="ملاحظات المراجعة">
                <TextInput value={intakeNotes} onChange={e => setIntakeNotes(e.target.value)} placeholder="مثال: الصورة واردة من واتساب وتحتاج تأكيد SKU" />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={saveDraft} disabled={!productName.trim() || !imageDataUrl}>حفظ للمراجعة</PrimaryButton>
              <span className="text-xs text-slate-500">Match key: {matchKey || "—"}</span>
            </div>
          </BrutalCard>

          <BrutalCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-black">قائمة الانتظار</h2>
              <button onClick={exportDrafts} disabled={!drafts.length} className="flex items-center gap-2 border-2 border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-40">
                <Download size={15} /> تصدير JSON
              </button>
            </div>
            <div className="space-y-3">
              {drafts.length === 0 ? <p className="text-sm text-slate-500">لا توجد صور بانتظار المراجعة.</p> : drafts.map(draft => (
                <div key={draft.id} className="border-2 border-slate-800 p-3">
                  <div className="flex gap-3">
                    <img src={draft.imageDataUrl} alt={draft.productName} className="h-20 w-20 border border-slate-700 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{draft.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{draft.sku || "بدون SKU"} · {draft.imageSource}</p>
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
