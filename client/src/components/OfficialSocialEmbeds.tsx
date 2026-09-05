import { ArrowUpLeft, ExternalLink, Facebook, Instagram, RefreshCw, ShieldCheck } from "lucide-react";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";

export function OfficialSocialEmbeds() {
  const reloadEmbeds = () => window.location.reload();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-border bg-brand-cream px-5 py-4 text-sm text-brand-navy">
        <p className="flex items-start gap-2 leading-6">
          <ShieldCheck className="mt-0.5 shrink-0 text-brand-blue" size={18} />
          المحتوى يُحمّل مباشرة من المنصات الرسمية. لا تُستخدم رموز وصول ولا تُخزّن منشورات داخل الموقع.
        </p>
        <button
          type="button"
          onClick={reloadEmbeds}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 font-bold text-brand-blue transition hover:bg-brand-blue/5 hover:text-brand-blue-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
        >
          <RefreshCw size={16} /> إعادة تحميل
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section
          aria-labelledby="facebook-feed-heading"
          className="overflow-hidden rounded-[2rem] border border-brand-border bg-brand-surface p-5 shadow-sm sm:p-7"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#1877f2]">Facebook</p>
              <h3 id="facebook-feed-heading" className="mt-1 text-2xl font-extrabold text-brand-navy">
                صفحتنا الرسمية
              </h3>
            </div>
            <Facebook className="text-[#1877f2]" size={26} aria-hidden="true" />
          </div>
          <div className="flex min-h-[560px] flex-col justify-between rounded-2xl border border-brand-border bg-brand-cream p-7">
            <div>
              <p className="inline-flex rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue">
                عرض مباشر من المصدر
              </p>
              <p className="mt-6 text-lg font-extrabold leading-9 text-brand-navy">
                تابع أحدث الأخبار والمنشورات من صفحة شركة عمران التجارية على Facebook.
              </p>
              <p className="mt-3 text-sm leading-7 text-brand-muted">
                بعض بيئات الويب تمنع عرض الخط الزمني داخل إطار مضمن؛ لذلك نفتح الصفحة الأصلية مباشرةً لضمان مصدر رسمي وحديث.
              </p>
            </div>
            <a
              href={SOCIAL_EMBED_CONFIG.facebookPageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-4 text-sm font-bold text-white transition hover:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
            >
              فتح صفحة Facebook الرسمية <ArrowUpLeft size={18} />
            </a>
          </div>
        </section>

        <section
          aria-labelledby="instagram-feed-heading"
          className="overflow-hidden rounded-[2rem] border border-brand-border bg-brand-surface p-5 shadow-sm sm:p-7"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#d62976]">Instagram</p>
              <h3 id="instagram-feed-heading" className="mt-1 text-2xl font-extrabold text-brand-navy">
                حسابنا الرسمي
              </h3>
            </div>
            <Instagram className="text-[#d62976]" size={26} aria-hidden="true" />
          </div>
          <div className="flex min-h-[560px] flex-col justify-between rounded-2xl border border-brand-border bg-brand-cream p-7">
            <div>
              <p className="inline-flex rounded-full bg-brand-red/10 px-3 py-1 text-xs font-bold text-brand-red">
                محتوى من الحساب الرسمي
              </p>
              <p className="mt-6 text-lg font-extrabold leading-9 text-brand-navy">
                شاهد المحتوى المميز من شركة عمران التجارية مباشرةً على Instagram.
              </p>
              <p className="mt-3 text-sm leading-7 text-brand-muted">
                إذا منع المتصفح عرض Instagram داخل الموقع، نفتح المصدر الرسمي مباشرةً بدل عرض مساحة فارغة أو نسخة قديمة.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              <a
                href={SOCIAL_EMBED_CONFIG.instagramFeaturedPostUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-4 text-sm font-bold text-white transition hover:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              >
                فتح المنشور المميز <ArrowUpLeft size={18} />
              </a>
              <a
                href={SOCIAL_EMBED_CONFIG.instagramProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-surface px-5 py-3 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5"
              >
                فتح حساب @omrantoys.store <ExternalLink size={16} />
              </a>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-brand-muted">
            الروابط تتصل بالمنصات الرسمية مباشرةً؛ لا يُنسخ المحتوى أو يُخزّن داخل الموقع.
          </p>
        </section>
      </div>
    </div>
  );
}
