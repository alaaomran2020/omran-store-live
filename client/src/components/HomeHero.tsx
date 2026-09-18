import { ArrowLeft, MessageCircle, ShieldCheck, Sparkles, Store, ShoppingBag } from "lucide-react";
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
      data-omran-hero
      className="relative overflow-hidden border-b border-brand-border bg-brand-cream"
      aria-labelledby="home-hero-title"
    >
      <div className="pointer-events-none absolute left-[7%] top-16 h-9 w-9 rotate-12 rounded-xl bg-brand-yellow/70 shadow-sm" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[8%] top-24 h-7 w-7 rounded-full bg-brand-red/15 shadow-sm" aria-hidden="true" />
      <div className="container grid gap-9 py-10 sm:py-14 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-16 lg:py-18">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-white/85 px-3.5 py-2 text-xs font-black text-brand-navy shadow-sm backdrop-blur sm:text-sm">
            <ShieldCheck size={16} className="text-brand-blue" aria-hidden="true" />
            شركة عمران التجارية · طنطا
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-sky px-3 py-1.5 text-xs font-black text-brand-navy">
            <Sparkles size={15} aria-hidden="true" />
            اختيارات أكتر… بطريقة أسهل
          </div>

          <h1 id="home-hero-title" className="font-hand-ar mt-5 max-w-3xl text-[2.7rem] font-bold leading-[1.18] text-brand-navy sm:text-5xl lg:text-6xl">
            لما تختار عمران تويز…
            <span className="mt-1 block text-brand-blue">إنت بتختار ثقة وفرحة</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base font-extrabold leading-8 text-brand-muted sm:text-lg sm:leading-9">
            لعب أطفال بصور واضحة ومعلومات مؤكدة، للبيت ولأصحاب المحلات واللي بيبيع أونلاين.
            شوف المنتج الأول، وبعدها اسأل عن السعر والكميات على واتساب.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {audienceItems.map(({ icon: Icon, label }, index) => (
              <span
                key={label}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black shadow-sm sm:text-sm ${
                  index === 0
                    ? "border-brand-blue/20 bg-brand-sky text-brand-navy"
                    : index === 1
                      ? "border-brand-yellow/50 bg-brand-yellow/15 text-brand-navy"
                      : "border-brand-success/25 bg-brand-success/10 text-brand-navy"
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#featured-products"
              className="omran-pressable inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(18,59,109,.22)] hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 sm:text-base"
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
                className="omran-pressable inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(8,122,67,.2)] hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:text-base"
              >
                <MessageCircle size={18} aria-hidden="true" />
                استفسر عبر واتساب
              </a>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-2xl">
          <div className="pointer-events-none absolute -left-3 top-12 z-10 rounded-2xl bg-brand-yellow px-3 py-2 text-xs font-black text-brand-navy shadow-lg sm:text-sm omran-float" aria-hidden="true">
            لعب تفرّحهم 💛
          </div>
          <div className="pointer-events-none absolute -right-2 bottom-20 z-10 rounded-2xl bg-white px-3 py-2 text-xs font-black text-brand-navy shadow-lg ring-1 ring-brand-border sm:text-sm omran-float-delayed" aria-hidden="true">
            صور أوضح ✨
          </div>

          <div className="relative grid grid-cols-5 gap-3 sm:gap-4">
            <figure className="col-span-5 overflow-hidden rounded-[2.2rem] border-[6px] border-white bg-white shadow-[0_28px_65px_rgba(18,59,109,.16)] transition duration-500 hover:-rotate-[.4deg]">
              <img
                src="/categories/category-cars.webp"
                alt="عربيات لعب أطفال"
                width="720"
                height="480"
                className="aspect-[16/8.4] w-full rounded-[1.7rem] object-cover transition duration-500 hover:scale-[1.025]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </figure>

            <figure className="col-span-2 overflow-hidden rounded-[1.8rem] border-[5px] border-white bg-white shadow-[0_18px_42px_rgba(18,59,109,.12)] transition duration-500 hover:-translate-y-1">
              <img
                src="/categories/category-dolls.webp"
                alt="عرايس لعب أطفال"
                width="360"
                height="360"
                className="aspect-square w-full rounded-[1.35rem] object-cover"
                loading="eager"
                decoding="async"
              />
            </figure>

            <div className="col-span-3 flex min-h-40 flex-col justify-between rounded-[1.8rem] border border-brand-blue/20 bg-brand-sky p-4 shadow-[0_18px_42px_rgba(18,59,109,.1)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <img src="/brand/logo.png" alt="" width="120" height="120" className="h-14 w-14 object-contain" aria-hidden="true" />
                <span className="rounded-full bg-brand-red/10 px-2.5 py-1 text-[11px] font-black text-brand-red">مبهج وواضح</span>
              </div>
              <div>
                <p className="text-xl font-black text-brand-navy sm:text-2xl">عمران تويز</p>
                <p className="mt-1 text-xs font-extrabold leading-6 text-brand-muted sm:text-sm">اختيار واضح. استفسار أسرع. تجربة أريح.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
