import { ArrowLeft, MessageCircle, ShieldCheck, Store, ShoppingBag } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { whatsappNumber } from "@/lib/productFormat";

const audienceItems = [
  { icon: ShoppingBag, label: "للبيت" },
  { icon: Store, label: "لأصحاب المحلات" },
  { icon: ShoppingBag, label: "للي بيبيع أونلاين" },
] as const;

export default function HomeHero() {
  const number = whatsappNumber();
  const whatsappUrl = number
    ? `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات عمران تويز.")}`
    : null;

  return (
    <section
      className="relative overflow-hidden border-b border-brand-border bg-[radial-gradient(circle_at_15%_10%,rgba(23,105,224,.12),transparent_30%),linear-gradient(180deg,#fff_0%,#f8f5f0_100%)]"
      aria-labelledby="home-hero-title"
    >
      <div className="container grid gap-8 py-9 sm:py-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-14 lg:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-brand-sky px-3 py-2 text-xs font-black text-brand-navy sm:text-sm">
            <ShieldCheck size={16} aria-hidden="true" />
            شركة عمران التجارية · طنطا
          </div>

          <h1 id="home-hero-title" className="mt-5 max-w-3xl text-4xl font-black leading-[1.18] tracking-[-0.035em] text-brand-navy sm:text-5xl lg:text-6xl">
            لما تختار عمران تويز…
            <span className="mt-1 block text-brand-blue">إنت بتختار ثقة</span>
          </h1>

          <p className="mt-4 max-w-2xl text-base font-bold leading-8 text-brand-muted sm:text-lg sm:leading-9">
            لعب أطفال بصور واضحة ومعلومات متاحة فعليًا، للبيت ولأصحاب المحلات واللي بيبيع أونلاين.
            اختار المنتج الأول، وبعدها استفسر عن السعر والكميات على واتساب.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {audienceItems.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2 text-xs font-extrabold text-brand-navy shadow-sm sm:text-sm">
                <Icon size={15} className="text-brand-blue" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#featured-products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/15 transition hover:-translate-y-0.5 hover:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 sm:text-base"
            >
              شوف المنتجات
              <ArrowLeft size={18} aria-hidden="true" />
            </a>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { cta_location: "home_hero", page_location: window.location.href })}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/5 transition hover:-translate-y-0.5 hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:text-base"
              >
                <MessageCircle size={18} aria-hidden="true" />
                استفسر عبر واتساب
              </a>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <figure className="col-span-2 overflow-hidden rounded-[2rem] border border-white bg-white p-3 shadow-[0_24px_60px_rgba(18,59,109,.14)]">
              <img
                src="/categories/category-cars.webp"
                alt="عربيات لعب أطفال"
                width="720"
                height="480"
                className="aspect-[16/8] w-full rounded-[1.4rem] object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </figure>
            <figure className="overflow-hidden rounded-[1.6rem] border border-white bg-white p-2.5 shadow-[0_16px_40px_rgba(18,59,109,.11)]">
              <img src="/categories/category-dolls.webp" alt="عرايس لعب أطفال" width="360" height="360" className="aspect-square w-full rounded-[1.15rem] object-cover" loading="eager" decoding="async" />
            </figure>
            <div className="flex min-h-40 flex-col justify-between rounded-[1.6rem] border border-brand-blue/10 bg-brand-sky p-4 shadow-[0_16px_40px_rgba(18,59,109,.09)] sm:p-5">
              <img src="/brand/logo.png" alt="" width="120" height="120" className="h-14 w-14 object-contain" aria-hidden="true" />
              <div>
                <p className="text-lg font-black text-brand-navy sm:text-xl">عمران تويز</p>
                <p className="mt-1 text-xs font-bold leading-6 text-brand-muted sm:text-sm">اختيار واضح. استفسار أسرع. ثقة أكبر.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
