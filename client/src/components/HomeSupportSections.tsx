import { BriefcaseBusiness, ChevronDown, MapPin, MessageCircle, PackageCheck, ShieldCheck, Store } from "lucide-react";
import { whatsappNumber } from "@/lib/productFormat";

const faqs = [
  ["هل الأسعار موجودة على كل المنتجات؟", "بنظهر فقط البيانات المتاحة فعليًا. لو السعر أو الكمية مش منشورين، استفسر عنهم مباشرة على واتساب."],
  ["هل في تعامل لأصحاب المحلات؟", "أيوه. عمران تويز يخدم أصحاب المحلات والبائعين أونلاين، والاستفسار عن الكميات بيتم مباشرة عبر واتساب."],
  ["لو ملقتش المنتج اللي بدور عليه؟", "جرّب البحث بكلمة أقصر أو باسم القسم، ولو مفيش نتيجة ابعت لنا على واتساب باسم أو صورة المنتج المطلوب."],
  ["هل POP UP جزء من نفس كتالوج اللعب؟", "لا. POP UP – Gifts & Balloons له صفحة وهوية وكتالوج مستقلين عن عمران تويز."],
] as const;

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: "معلومات بدون تخمين", description: "بنظهر الموجود فعليًا في بيانات المنتج، ومش بنختلق سعر أو مواصفة أو تقييم." },
  { icon: PackageCheck, title: "المنتج هو الأساس", description: "صور واضحة وكود المنتج وتصنيف يساعدوك تعرف أنت بتسأل عن إيه بالضبط." },
  { icon: Store, title: "للأفراد والتجار", description: "نفس الكتالوج يخدم البيت وأصحاب المحلات والبائعين أونلاين بدون تعقيد." },
] as const;

export default function HomeSupportSections() {
  const number = whatsappNumber();
  const b2bUrl = number ? `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أنا صاحب محل / ببيع أونلاين وعايز أستفسر عن الجملة والكميات من عمران تويز.")}` : null;

  return (
    <>
      <section id="b2b" className="scroll-mt-28 border-b border-brand-border bg-white py-8 sm:py-11" aria-labelledby="b2b-title">
        <div className="container">
          <div className="grid gap-4 rounded-[2rem] border border-brand-blue/15 bg-[radial-gradient(circle_at_15%_15%,rgba(255,212,92,.2),transparent_28%),linear-gradient(135deg,#102f53_0%,#123b6d_100%)] p-5 text-white shadow-[0_18px_50px_rgba(18,59,109,.16)] sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ffd45c] px-3 py-1.5 text-xs font-black text-[#4b3500]"><BriefcaseBusiness size={15} aria-hidden="true" /> للجملة وB2B</span>
              <h2 id="b2b-title" className="mt-3 text-2xl font-black sm:text-3xl">صاحب محل؟ بتبيع أونلاين؟</h2>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-white/88 sm:text-base">ابدأ من الكتالوج، اختار المنتجات اللي تهمك، وابعت الاستفسار بالكود عشان نراجع معاك السعر والكميات المتاحة.</p>
            </div>
            {b2bUrl && (
              <a href={b2bUrl} target="_blank" rel="noreferrer" className="omran-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-whatsapp-hover">
                <MessageCircle size={18} aria-hidden="true" /> استفسر عن الجملة
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-brand-border bg-brand-cream py-8 sm:py-11" aria-labelledby="why-omran-title">
        <div className="container">
          <div className="text-center">
            <p className="text-xs font-black text-[#1558b0] sm:text-sm">ليه عمران تويز؟</p>
            <h2 id="why-omran-title" className="mt-1 text-2xl font-black text-brand-navy sm:text-3xl">اختيار أوضح من أول خطوة</h2>
          </div>
          <div className="mx-auto mt-6 grid max-w-5xl gap-3 md:grid-cols-3">
            {TRUST_ITEMS.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-[1.6rem] border border-brand-border/80 bg-white p-5 shadow-[0_10px_26px_rgba(18,59,109,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(18,59,109,.11)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-sky text-brand-blue"><Icon size={20} aria-hidden="true" /></span>
                <h3 className="mt-4 text-base font-black text-brand-navy">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-brand-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-brand-border bg-white py-8 sm:py-11" aria-labelledby="faq-title">
        <div className="container grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-black text-[#1558b0] sm:text-sm">أسئلة سريعة</p>
            <h2 id="faq-title" className="mt-1 text-2xl font-black text-brand-navy sm:text-3xl">قبل ما تستفسر</h2>
            <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-brand-muted">معلومات مباشرة تساعدك تستخدم الكتالوج أسرع من غير تفاصيل مالهاش لازمة.</p>
          </div>
          <div className="space-y-2">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-brand-border bg-[#fffdfa] px-4 py-1 open:bg-white">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-black text-brand-navy">
                  {question}
                  <ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="border-t border-brand-border pb-4 pt-3 text-sm font-semibold leading-7 text-brand-muted">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="branches" className="scroll-mt-28 border-b border-brand-border bg-brand-cream py-8 sm:py-11" aria-labelledby="branches-title">
        <div className="container">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#1558b0] sm:text-sm">فروعنا في طنطا</p>
              <h2 id="branches-title" className="mt-1 text-2xl font-black text-brand-navy sm:text-3xl">زورنا في الفرع الأقرب</h2>
            </div>
            <MapPin className="text-brand-blue" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="omran-pressable rounded-[1.6rem] border border-brand-blue/20 bg-white p-5 shadow-[0_10px_26px_rgba(18,59,109,.07)]">
              <span className="inline-flex rounded-full bg-brand-yellow px-2.5 py-1 text-[11px] font-black text-brand-navy">الفرع الرئيسي</span>
              <h3 className="mt-3 text-lg font-black text-brand-navy">فرع السيد البدوي</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-brand-muted">ميدان السيد البدوي، شارع درب الأبشيهي، طنطا.</p>
            </article>
            <article className="omran-pressable rounded-[1.6rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(18,59,109,.07)]">
              <h3 className="text-lg font-black text-brand-navy">فرع الاستاد</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-brand-muted">أمام نادي سيتي كلوب ومطعم سي السيد، طنطا.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
