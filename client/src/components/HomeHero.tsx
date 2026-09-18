import { ArrowLeft, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { whatsappNumber } from "@/lib/productFormat";

export default function HomeHero() {
  const number = whatsappNumber();
  const whatsappUrl = number
    ? `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات عمران تويز.")}`
    : null;

  return (
    <section className="relative overflow-hidden border-b border-brand-border bg-[linear-gradient(135deg,#123b6d_0%,#1769e0_52%,#2f80ed_100%)] text-white" aria-labelledby="home-hero-title">
      <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 right-1/3 h-60 w-60 rounded-full bg-brand-yellow/15 blur-3xl" aria-hidden="true" />

      <div className="container relative grid gap-8 py-10 sm:py-14 lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:gap-12 lg:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-extrabold backdrop-blur-sm sm:text-sm">
            <Sparkles size={16} aria-hidden="true" />
            اختيارات أكتر. اختيار أسهل.
          </div>

          <h1 id="home-hero-title" className="mt-5 max-w-3xl text-4xl font-black leading-[1.18] tracking-tight sm:text-5xl lg:text-6xl">
            لعب أطفال تختارها بثقة
          </h1>

          <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-white/85 sm:text-lg sm:leading-9">
            عمران تويز بيسهّل عليك الوصول للعبة المناسبة بسرعة، بصور واضحة وبيانات مؤكدة واستفسار مباشر على واتساب.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-brand-navy shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:text-base"
            >
              شوف لعب الأطفال
              <ArrowLeft size={18} aria-hidden="true" />
            </a>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { cta_location: "home_hero", page_location: window.location.href })}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-whatsapp-hover hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 sm:text-base"
              >
                <MessageCircle size={18} aria-hidden="true" />
                استفسر على واتساب
              </a>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-white/80 sm:text-sm">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} aria-hidden="true" /> بيانات منتج بدون تخمين</span>
            <span>• صور المنتج هي الأساس</span>
            <span>• مناسب للأفراد والتجار</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-4 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-5">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-xl sm:p-7">
              <div className="mx-auto flex aspect-square max-w-56 items-center justify-center rounded-[1.75rem] bg-brand-cream p-6 ring-1 ring-brand-border">
                <img src="/brand/logo.png" alt="عمران تويز" width="512" height="512" className="h-full w-full object-contain" loading="eager" fetchPriority="high" decoding="async" />
              </div>
              <div className="mt-5 text-center">
                <p className="text-xl font-black text-brand-navy sm:text-2xl">عمران تويز</p>
                <p className="mt-2 text-sm font-bold leading-6 text-brand-muted">لما تختار عمران تويز… إنت بتختار ثقة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
