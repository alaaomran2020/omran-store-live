import { ArrowUpLeft, ExternalLink, Facebook, Instagram, RefreshCw, ShieldCheck } from "lucide-react";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";

export function OfficialSocialEmbeds() {
  const reloadEmbeds = () => window.location.reload();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">
        <p className="flex items-start gap-2 leading-6"><ShieldCheck className="mt-0.5 shrink-0" size={18} /> المحتوى يُحمّل مباشرة من المنصات الرسمية. لا تُستخدم رموز وصول ولا تُخزّن منشورات داخل الموقع.</p>
        <button type="button" onClick={reloadEmbeds} className="inline-flex items-center gap-2 font-bold text-emerald-800 transition hover:text-emerald-600"><RefreshCw size={16} /> إعادة تحميل</button>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="facebook-feed-heading" className="overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-50 p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-[#1877f2]">Facebook</p><h3 id="facebook-feed-heading" className="mt-1 text-2xl font-black text-emerald-950">صفحتنا الرسمية</h3></div>
            <Facebook className="text-[#1877f2]" size={26} aria-hidden="true" />
          </div>
          <div className="flex min-h-[560px] flex-col justify-between rounded-2xl bg-[radial-gradient(circle_at_90%_10%,#dceeff,transparent_45%),linear-gradient(135deg,#f7fbff,#ffffff)] p-7">
            <div>
              <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">عرض مباشر من المصدر</p>
              <p className="mt-6 text-lg font-black leading-9 text-emerald-950">تابع أحدث الأخبار والمنشورات من صفحة شركة عمران التجارية على Facebook.</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">تتطلب Meta تسجيل الدخول لعرض الخط الزمني داخل إطار مضمن في بيئة الويب الحالية؛ لذلك نفتح الصفحة الأصلية مباشرةً بدلاً من إظهار مساحة فارغة.</p>
            </div>
            <a href={SOCIAL_EMBED_CONFIG.facebookPageUrl} target="_blank" rel="noreferrer" className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-[#1877f2] px-5 py-4 text-sm font-black text-white transition hover:bg-[#1268d3]">فتح صفحة Facebook الرسمية <ArrowUpLeft size={18} /></a>
          </div>
        </section>

        <section aria-labelledby="instagram-feed-heading" className="overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-50 p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-[#d62976]">Instagram</p><h3 id="instagram-feed-heading" className="mt-1 text-2xl font-black text-emerald-950">حسابنا الرسمي</h3></div>
            <Instagram className="text-[#d62976]" size={26} aria-hidden="true" />
          </div>
          <div className="flex min-h-[560px] flex-col justify-between rounded-2xl bg-[radial-gradient(circle_at_10%_10%,#ffe1ed,transparent_42%),linear-gradient(135deg,#fff8fb,#ffffff)] p-7">
            <div>
              <p className="inline-flex rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-[#b0195e]">منشور عام من الحساب</p>
              <p className="mt-6 text-lg font-black leading-9 text-emerald-950">شاهد المنشور المميز من عمران للألعاب مباشرةً على Instagram.</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">تمنع بعض المتصفحات وبيئات المعاينة عرض محتوى Instagram داخل إطار الموقع. نفتح المصدر الرسمي مباشرةً لضمان أن المحتوى المعروض أصلي وحديث.</p>
            </div>
            <div className="mt-8 space-y-3">
              <a href={SOCIAL_EMBED_CONFIG.instagramFeaturedPostUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-[#d62976] px-5 py-4 text-sm font-black text-white transition hover:bg-[#b0195e]">فتح المنشور المميز <ArrowUpLeft size={18} /></a>
              <a href={SOCIAL_EMBED_CONFIG.instagramProfileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-white px-5 py-3 text-sm font-bold text-[#b0195e]">فتح حساب @omrantoys.store <ExternalLink size={16} /></a>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">رابط المنشور والحساب يتصلان بالمنصة الرسمية مباشرةً؛ لا يُنسخ المحتوى أو يُخزّن داخل الموقع.</p>
        </section>
      </div>
    </div>
  );
}
