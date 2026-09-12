import { ExternalLink, Facebook, Instagram, MessageCircle, PlayCircle, Quote } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { SeoMetadata } from "@/components/SeoMetadata";
import Products from "@/pages/Products";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";
import AnnouncementBar from "@/components/AnnouncementBar";

const POPUP_TITLE = "POP UP – Gifts & Balloons | شركة عمران التجارية";
const POPUP_DESCRIPTION = "هدايا وبالونات ومستلزمات حفلات من POP UP ضمن شركة عمران التجارية.";

const POPUP_SOCIALS = [
  {
    label: "Facebook",
    account: "POP UP – Gifts & Balloons",
    href: SOCIAL_EMBED_CONFIG.popupFacebookPageUrl,
    icon: Facebook,
    accentClass: "from-[#1877F2]/20 via-white/[0.07] to-white/[0.03] hover:border-[#1877F2]/45",
    iconClass: "bg-[#1877F2]/18 text-[#8fc0ff]",
  },
  {
    label: "Instagram",
    account: "@popup.gifts_balloons",
    href: SOCIAL_EMBED_CONFIG.popupInstagramProfileUrl,
    icon: Instagram,
    accentClass: "from-fuchsia-500/20 via-rose-400/10 to-amber-300/5 hover:border-fuchsia-300/40",
    iconClass: "bg-fuchsia-400/15 text-fuchsia-200",
  },
] as const;

const POPUP_REVIEWS = [
  {
    text: "جودة البلالين تحفة قوي، والخامة بتاعتها حلوة كويسة جدًا بالنسبة للسعر. ودي مش أول مرة أتعامل معاكم، أنا بتعامل معاكم بقالي كتير قوي، والصراحة التعامل كويس جدًا وخامات البلالين تحفة.",
    context: "تنسيق بالونات مناسبة",
  },
  {
    text: "شكرًا بجد على البالون وسرعة الرد، ومبسوطة بالتنوع الجديد في الأشكال اللي بتوفروها.",
    context: "طلب بالونات وتجهيز مناسبة",
  },
] as const;

function PopUpVideosCta() {
  return (
    <section dir="rtl" aria-labelledby="popup-videos-title" className="border-y border-fuchsia-100 bg-white py-8 sm:py-10">
      <div className="container">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-l from-fuchsia-700 via-purple-700 to-rose-600 p-6 text-center text-white shadow-[0_18px_50px_rgba(126,34,206,0.18)] sm:p-8 lg:flex-row lg:text-start">
          <div>
            <p className="text-xs font-black text-fuchsia-100">فيديوهات POP UP</p>
            <h2 id="popup-videos-title" className="mt-2 text-2xl font-black sm:text-3xl">شوف التنسيقات بالفيديو</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-white/85">
              فيديوهات حقيقية للهدايا والبالونات وتنسيقات المناسبات من POP UP.
            </p>
          </div>
          <a
            href="/popup/videos"
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-fuchsia-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <PlayCircle size={18} aria-hidden="true" />
            مشاهدة الفيديوهات
          </a>
        </div>
      </div>
    </section>
  );
}

function PopUpRealReviews() {
  return (
    <section
      dir="rtl"
      aria-labelledby="popup-reviews-title"
      className="border-y border-rose-100 bg-gradient-to-b from-white via-rose-50/45 to-fuchsia-50/40 py-10 sm:py-14"
    >
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-700 shadow-sm">
            <MessageCircle size={15} aria-hidden="true" />
            ريفيوهات حقيقية
          </span>
          <h2 id="popup-reviews-title" className="mt-3 text-2xl font-black tracking-tight text-brand-ink sm:text-3xl">
            عملاؤنا قالوا إيه عن POP UP؟
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-brand-muted sm:text-[15px]">
            آراء حقيقية وصلتنا من عملائنا بعد استلام وتجربة تنسيقات البالونات.
          </p>
        </div>

        <div className="mx-auto mt-7 grid max-w-5xl gap-4 lg:grid-cols-2">
          {POPUP_REVIEWS.map((review, index) => (
            <article
              key={review.text}
              className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white p-5 shadow-[0_12px_35px_rgba(136,19,55,0.07)] sm:p-6"
            >
              <div className="absolute -left-6 -top-7 h-24 w-24 rounded-full bg-fuchsia-100/60 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700">
                    عميل POP UP
                  </span>
                  <Quote className="text-fuchsia-300" size={25} aria-hidden="true" />
                </div>

                <blockquote className="mt-4 text-[15px] font-bold leading-8 text-brand-ink sm:text-base sm:leading-8">
                  «{review.text}»
                </blockquote>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-rose-100 pt-4">
                  <p className="text-xs font-bold text-brand-muted">{review.context}</p>
                  <span className="text-xs font-black text-fuchsia-700">رسالة عميل #{index + 1}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PopUpOfficialSocials() {
  return (
    <section dir="rtl" aria-labelledby="popup-social-title" className="border-y border-fuchsia-100 bg-gradient-to-b from-fuchsia-50/80 via-white to-amber-50/50 py-8 sm:py-10">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-fuchsia-200 bg-white px-3 py-1.5 text-xs font-black text-fuchsia-700 shadow-sm">
            POP UP · الحسابات الرسمية
          </span>
          <h2 id="popup-social-title" className="mt-3 text-2xl font-black tracking-tight text-brand-ink sm:text-3xl">
            تابع POP UP – Gifts & Balloons
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-brand-muted sm:text-[15px]">
            تابع أحدث الهدايا والبالونات ومستلزمات الحفلات من الحسابات الرسمية الخاصة بـ POP UP فقط.
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
          {POPUP_SOCIALS.map(({ label, account, href, icon: Icon, accentClass, iconClass }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`افتح حساب ${label} الرسمي لـ POP UP`}
              className={`group relative flex min-h-20 items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-l p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200 ${accentClass}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/60 shadow-inner ${iconClass}`}>
                  <Icon size={23} aria-hidden="true" />
                </span>
                <span className="min-w-0 text-start">
                  <span className="block text-sm font-black text-brand-ink sm:text-base">{label}</span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-brand-muted">{account}</span>
                </span>
              </span>

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-white/90 text-brand-muted shadow-sm transition duration-300 group-hover:translate-x-[-2px] group-hover:text-brand-ink">
                <ExternalLink size={16} aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PopUp() {
  return (
    <div className="[&>div>main>footer]:hidden">
      <SeoMetadata path="/popup" title={POPUP_TITLE} description={POPUP_DESCRIPTION} />
      <AnnouncementBar />
      <BrandHeader />
      <Products catalog="popup" showAnnouncement={false} />
      <PopUpVideosCta />
      <PopUpRealReviews />
      <PopUpOfficialSocials />
      <SiteFooter socialBrand="popup" />
    </div>
  );
}
