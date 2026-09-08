import { useEffect } from "react";
import { ExternalLink, Facebook, Instagram } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
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
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content ?? "";

    document.title = POPUP_TITLE;
    if (description) description.content = POPUP_DESCRIPTION;

    return () => {
      document.title = previousTitle;
      if (description) description.content = previousDescription;
    };
  }, []);

  return (
    <div className="[&>div>main>footer]:hidden">
      <AnnouncementBar />
      <Products catalog="popup" showAnnouncement={false} />
      <PopUpOfficialSocials />
      <SiteFooter socialBrand="popup" />
    </div>
  );
}
