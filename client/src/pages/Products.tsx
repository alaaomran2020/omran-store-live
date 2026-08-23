import { useState } from "react";
import { OfficialSocialEmbeds } from "@/components/OfficialSocialEmbeds";
import { shareProductsPage, type ProductShareOutcome } from "@/lib/productShare";
import { Share2, ShieldCheck, Sparkles } from "lucide-react";

export default function Products() {
  const [shareOutcome, setShareOutcome] = useState<ProductShareOutcome | null>(null);

  const handleShare = async () => {
    const nativeShare = typeof navigator !== "undefined" && navigator.share
      ? navigator.share.bind(navigator)
      : undefined;
    const copyToClipboard = typeof navigator !== "undefined" && navigator.clipboard
      ? navigator.clipboard.writeText.bind(navigator.clipboard)
      : undefined;

    setShareOutcome(await shareProductsPage({
      url: window.location.href,
      nativeShare,
      copyToClipboard,
    }));
  };

  const shareMessage = {
    shared: "تم فتح خيارات المشاركة.",
    copied: "تم نسخ رابط الصفحة.",
    dismissed: "تم إلغاء المشاركة.",
    unavailable: "تعذر النسخ تلقائياً؛ يمكنك نسخ الرابط من شريط العنوان.",
  } as const;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f3ec] text-stone-900">
      <header className="border-b border-stone-200/80 bg-[#f7f3ec]/90 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <a href="/products" className="text-xl font-black tracking-tight text-emerald-950">عمران للألعاب</a>
          <nav className="flex items-center gap-4 text-sm font-bold text-stone-600"><a href="#feed" className="hover:text-emerald-800">الخلاصة الحية</a><a href="/settings/social" className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 hover:border-emerald-700 hover:text-emerald-800"><ShieldCheck size={15} /> الإعدادات</a></nav>
        </div>
      </header>
      <main>
        <section className="container grid gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-20">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-900"><Sparkles size={15} /> تضمين رسمي مباشر</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.15] text-emerald-950 sm:text-6xl">منتجاتنا كما نعرضها على <span className="text-orange-700">Instagram وFacebook</span></h1><p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">تُعرض الحسابات العامة مباشرة من المنصتين الرسميتين، من دون رموز وصول أو نسخ المحتوى إلى قاعدة بيانات محلية.</p><div className="mt-6"><button type="button" onClick={handleShare} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 active:scale-[0.97]"><Share2 size={18} aria-hidden="true" /> مشاركة المنتجات</button><p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-emerald-900">{shareOutcome ? shareMessage[shareOutcome] : ""}</p></div></div>
          <div className="rounded-[2rem] bg-emerald-950 p-7 text-emerald-50 shadow-xl"><p className="text-sm font-bold text-emerald-200">معلومة مهمة</p><p className="mt-3 text-xl font-bold leading-8">تصميم المنشورات وبياناتها يبقيان لدى Meta. هذا الموقع لا يقرأ المنشورات برمجياً ولا ينشر أي محتوى.</p></div>
        </section>
        <section id="feed" className="border-t border-stone-200 bg-white py-14"><div className="container"><div className="mb-8"><p className="text-sm font-bold text-orange-700">تحديث من المنصتين عند تحميل الصفحة</p><h2 className="mt-1 text-3xl font-black text-emerald-950">الخلاصة الرسمية</h2></div><OfficialSocialEmbeds /></div></section>
      </main>
    </div>
  );
}
