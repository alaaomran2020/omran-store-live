import { Images, MessageCircle, SlidersHorizontal } from "lucide-react";

const FEATURES = [
  {
    icon: Images,
    title: "شوف المنتج بوضوح",
    description: "صور وتفاصيل وكود المنتج قبل ما تستفسر.",
  },
  {
    icon: SlidersHorizontal,
    title: "اختار بسهولة",
    description: "بحث وفلاتر حسب التصنيف والسن والماركة.",
  },
  {
    icon: MessageCircle,
    title: "اسألنا مباشرة",
    description: "المنتج وكوده بيتضافوا تلقائيًا لاستفسار واتساب.",
  },
] as const;

export default function StoreTrustFeatures() {
  return (
    <section className="border-b border-brand-border bg-brand-sky/35 py-8 sm:py-11" aria-labelledby="trust-features-title">
      <div className="container">
        <div className="text-center">
          <p className="text-xs font-extrabold text-brand-blue sm:text-sm">اختيار أوضح واستفسار أسرع</p>
          <h2 id="trust-features-title" className="mt-1 text-2xl font-black text-brand-navy sm:text-3xl">ليه تختار من عمران تويز؟</h2>
        </div>
        <div className="mx-auto mt-6 grid max-w-5xl gap-3 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article key={title} className="flex items-start gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-sky text-brand-blue">
                <Icon size={21} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-black text-brand-navy sm:text-base">{title}</h3>
                <p className="mt-1 text-xs font-semibold leading-6 text-brand-muted sm:text-sm">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
