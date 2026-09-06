import { Facebook, Instagram, MessageCircle, ShieldCheck, Store, ExternalLink, BadgeCheck, ArrowUpLeft } from "lucide-react";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";
import { whatsappNumber } from "@/lib/productFormat";

export const FOOTER_NAVIGATION = [
  { label: "الرئيسية", href: "/" },
  { label: "لعب الأطفال", href: "/products" },
  { label: "POP UP", href: "/popup" },
] as const;

const whatsappUrl = (() => {
  const number = whatsappNumber();
  if (!number) return null;
  const text = encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات شركة عمران التجارية.");
  return `https://wa.me/${number}?text=${text}`;
})();

const socialLinks = [
  {
    label: "Instagram",
    account: "@omrantoys.store",
    href: SOCIAL_EMBED_CONFIG.instagramProfileUrl,
    icon: Instagram,
    accent: "from-fuchsia-500/25 via-pink-500/15 to-orange-400/20",
    iconClass: "bg-fuchsia-500/15 text-pink-200 ring-pink-300/15",
    hoverClass: "hover:border-pink-300/35 hover:shadow-pink-950/20",
  },
  {
    label: "Facebook",
    account: "شركة عمران التجارية",
    href: SOCIAL_EMBED_CONFIG.facebookPageUrl,
    icon: Facebook,
    accent: "from-blue-500/25 via-sky-500/15 to-cyan-400/15",
    iconClass: "bg-blue-500/15 text-blue-200 ring-blue-300/15",
    hoverClass: "hover:border-blue-300/35 hover:shadow-blue-950/20",
  },
  ...(whatsappUrl
    ? [{
        label: "WhatsApp",
        account: "تواصل مباشر",
        href: whatsappUrl,
        icon: MessageCircle,
        accent: "from-emerald-500/25 via-green-500/15 to-lime-400/15",
        iconClass: "bg-emerald-500/15 text-emerald-200 ring-emerald-300/15",
        hoverClass: "hover:border-emerald-300/35 hover:shadow-emerald-950/20",
      }]
    : []),
] as const;

function FooterBrand() {
  return (
    <section aria-labelledby="footer-brand-title" className="lg:max-w-md">
      <a href="/" className="group inline-flex min-h-14 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20" aria-label="شركة عمران التجارية - الصفحة الرئيسية">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
          <img src="/brand/logo.png" alt="لوجو عمران" className="h-full w-full object-contain p-1.5" loading="lazy" decoding="async" />
        </span>
        <span>
          <span id="footer-brand-title" className="block text-xl font-black tracking-tight text-white sm:text-2xl">شركة عمران التجارية</span>
          <span className="mt-0.5 block text-xs font-bold text-white/60 sm:text-sm">لعب أطفال - هدايا</span>
        </span>
      </a>
      <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-white/72 sm:text-[15px]">لعب أطفال وهدايا — فرحة تبدأ من الاختيار، مع صور وتفاصيل تساعدك تختار والتواصل مباشرة عبر واتساب.</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/65">
        <ShieldCheck size={16} aria-hidden="true" /> كتالوج المنتجات يعتمد على البيانات المعتمدة فقط
      </div>
    </section>
  );
}

function FooterNavigation() {
  return (
    <nav aria-labelledby="footer-nav-title">
      <h2 id="footer-nav-title" className="text-sm font-black text-white">تصفح المتجر</h2>
      <ul className="mt-4 space-y-1.5">
        {FOOTER_NAVIGATION.map(link => (
          <li key={link.href}>
            <a href={link.href} className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-white/68 transition duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/15">{link.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterCompanyInfo() {
  return (
    <section aria-labelledby="footer-company-title">
      <h2 id="footer-company-title" className="text-sm font-black text-white">شركة عمران التجارية</h2>
      <div className="mt-4 space-y-3">
        <p className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-white/68"><Store size={17} className="mt-1 shrink-0 text-brand-yellow" aria-hidden="true" /><span>المتجر الرسمي: omrantoys.store</span></p>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-black text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-whatsapp-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25">
            <MessageCircle size={18} aria-hidden="true" /> تواصل عبر واتساب <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}

function FooterSocial() {
  return (
    <section aria-labelledby="footer-social-title">
      <div className="flex items-center gap-2">
        <h2 id="footer-social-title" className="text-sm font-black text-white">الحسابات الرسمية</h2>
        <BadgeCheck size={17} className="text-brand-yellow" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs font-semibold leading-6 text-white/55">روابط مباشرة للحسابات الرسمية المعتمدة داخل المتجر.</p>
      <div className="mt-4 grid gap-3">
        {socialLinks.map(({ label, account, href, icon: Icon, accent, iconClass, hoverClass }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`افتح حساب ${label} الرسمي لشركة عمران التجارية`}
            className={`group relative isolate flex min-h-[68px] overflow-hidden rounded-2xl border border-white/12 bg-white/[0.055] p-[1px] text-white shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.075] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20 ${hoverClass}`}
          >
            <span className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent} opacity-70 transition duration-300 group-hover:opacity-100`} aria-hidden="true" />
            <span className="flex w-full items-center justify-between gap-3 rounded-[15px] bg-brand-navy/78 px-3.5 py-3 backdrop-blur-sm">
              <span className="flex min-w-0 items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-300 group-hover:scale-105 ${iconClass}`}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="min-w-0 text-start">
                  <span className="flex items-center gap-1.5 text-sm font-black">
                    {label}
                    <BadgeCheck size={14} className="text-brand-yellow" aria-hidden="true" />
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/55">{account}</span>
                </span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/45 transition duration-300 group-hover:-translate-x-0.5 group-hover:bg-white/[0.1] group-hover:text-white">
                <ArrowUpLeft size={16} aria-hidden="true" />
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function FooterBottom() {
  const currentYear = new Date().getFullYear();
  return (
    <div className="border-t border-white/10 bg-black/10">
      <div className="container flex flex-col items-center justify-between gap-3 py-4 text-center sm:min-h-16 sm:flex-row sm:text-start">
        <p className="text-xs font-semibold leading-6 text-white/55 sm:text-sm">© {currentYear} شركة عمران التجارية. جميع الحقوق محفوظة.</p>
        <a href="/" className="inline-flex min-h-10 items-center rounded-lg px-2 text-xs font-bold text-white/45 transition hover:bg-white/[0.05] hover:text-white/75 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10">omrantoys.store · شركة عمران التجارية</a>
      </div>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer dir="rtl" className="relative overflow-hidden border-t border-brand-navy bg-brand-navy text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-brand-yellow/70 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute -start-24 top-8 h-48 w-48 rounded-full bg-brand-blue/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -end-24 bottom-20 h-56 w-56 rounded-full bg-brand-yellow/10 blur-3xl" aria-hidden="true" />
      <div className="container relative grid gap-9 py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-[1.45fr_.7fr_.9fr_1.05fr] lg:gap-12 lg:py-14">
        <FooterBrand />
        <FooterNavigation />
        <FooterCompanyInfo />
        <FooterSocial />
      </div>
      <FooterBottom />
    </footer>
  );
}
