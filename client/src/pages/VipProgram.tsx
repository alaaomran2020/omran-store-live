import { BadgeCheck, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { whatsappNumber } from "@/lib/productFormat";

const tiers = [
  { name: "Omran VIP", description: "كارت المزايا الرئيسي. السعر والمدة وحدود الاستخدام تحت الاعتماد التجاري.", features: ["عروض عمران تويز", "عروض الشركاء المعتمدين", "إمكانية إضافة نقاط عمران بعد اعتماد السياسة"] },
  { name: "Omran Silver", description: "كارت أو Voucher مبسط بقواعد استخدام محددة. لا توجد قيمة بيع أو خصم معتمدة حتى الآن.", features: ["عرض محدد وواضح", "حد مالي للاستخدام", "عدد استخدامات مضبوط"] },
];

export default function VipProgram() {
  const support = whatsappNumber();
  const href = support ? `https://wa.me/${support}?text=${encodeURIComponent("مرحبًا، أريد معرفة موعد إطلاق برنامج Omran VIP Card والمزايا المعتمدة.")}` : undefined;
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <AnnouncementBar /><BrandHeader />
      <main>
        <section className="border-b border-brand-border bg-gradient-to-l from-brand-navy via-brand-blue to-sky-600 py-12 text-white sm:py-16">
          <div className="container max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-black"><Sparkles size={17} /> Omran VIP Card Program</span>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">خصومات محسوبة، وشروط واضحة، وتحقق فعلي من الكارت</h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-sky-50">البرنامج تحت الإعداد التجريبي. لن نعرض سعرًا أو شريكًا أو نسبة خصم قبل اعتمادها وتوثيق شروطها.</p>
          </div>
        </section>
        <section className="container max-w-5xl py-10 sm:py-14">
          <div className="grid gap-5 md:grid-cols-2">
            {tiers.map(tier => <article key={tier.name} className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-brand-navy">{tier.name}</h2>
              <p className="mt-3 min-h-14 text-sm font-semibold leading-7 text-brand-muted">{tier.description}</p>
              <ul className="mt-5 space-y-3">{tier.features.map(feature => <li key={feature} className="flex items-start gap-2 text-sm font-bold"><BadgeCheck className="mt-0.5 shrink-0 text-emerald-600" size={18} />{feature}</li>)}</ul>
            </article>)}
          </div>
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-1 shrink-0 text-amber-700" /><div><h2 className="font-black text-amber-950">الحماية قبل الخصم</h2><p className="mt-2 text-sm font-semibold leading-7 text-amber-900">صورة الكارت أو الـQR وحدهما لا يثبتان صلاحية الاستخدام. الموظف أو الشريك لازم يتحقق من الحالة والصلاحية وشروط العرض قبل تسجيل العملية.</p></div></div>
          </div>
          {href && <a href={href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 py-3 text-sm font-black text-white"><MessageCircle size={19} /> اسأل عن موعد الإطلاق</a>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
