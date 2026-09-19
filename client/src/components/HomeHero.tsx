import { ArrowLeft, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { whatsappNumber } from "@/lib/productFormat";

export default function HomeHero() {
  const number = whatsappNumber();
  const whatsappUrl = number
    ? `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات عمران تويز.")}`
    : null;

  return (
    <section data-omran-hero className="border-b border-brand-border bg-brand-cream" aria-labelledby="home-hero-title">
      <div className="container grid gap-7 py-8 sm:py-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-12 lg:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-black text-brand-blue">عمران تويز · شركة عمران التجارية</p>
          <h1 id="home-hero-title" className="mt-3 text-[2.7rem] font-bold leading-[1.14] text-brand-navy sm:text-5xl lg:text-6xl">
            لعب تفرّحهم.
            <span className="block text-brand-blue">واختيار أسهل ليك.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm font-bold leading-7 text-brand-muted sm:text-lg sm:leading-8">
            شوف اللعب بوضوح، اختار المناسب، واسأل عن السعر والكميات على واتساب.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#categories" className="omran-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(18,59,109,.16)] hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 sm:text-base">
              تصفح اللعب
              <ArrowLeft size={18} aria-hidden="true" />
            </a>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { cta_location: "home_hero", page_location: window.location.href })}
                className="omran-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-3 text-sm font-black text-white hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:text-base"
              >
                <MessageCircle size={18} aria-hidden="true" />
                اسأل على واتساب
              </a>
            )}
          </div>
        </div>

        <figure className="overflow-hidden rounded-[2rem] border border-brand-border bg-brand-surface shadow-[0_20px_50px_rgba(18,59,109,.12)]">
          <img
            src="/categories/category-cars-640.webp"
            srcSet="/categories/category-cars-320.webp 320w, /categories/category-cars-640.webp 640w, /categories/category-cars.webp 720w"
            sizes="(max-width: 1023px) 100vw, 55vw"
            alt="تشكيلة لعب أطفال من عمران تويز"
            width="900"
            height="650"
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </figure>
      </div>
    </section>
  );
}