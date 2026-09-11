import { Link } from "wouter";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { SeoMetadata } from "@/components/SeoMetadata";

const sections = [
  ["التفعيل", "الكارت لا يصبح فعالًا إلا بعد إثبات التحصيل ومراجعة موظف مخوّل. الرقم التسلسلي والـQR للمطابقة، وصورة الكارت وحدها لا تمنح خصمًا."],
  ["العروض", "كل عرض له فروع وفترة وحد أدنى للفاتورة وحد أقصى للخصم وعدد استخدامات واستثناءات مستقلة. لا يُجمع عرضان إلا إذا سمحت الشروط المعتمدة."],
  ["الفقد والاستبدال", "عند الفقد يجب إبلاغ الدعم. لا يصدر بديل إلا بعد التحقق وإبطال الكارت السابق وتسجيل الاستبدال."],
  ["الشكاوى", "تُسجل الشكوى برقم تذكرة مع بيانات الزيارة والفاتورة والخصم المتوقع والمطبق، ثم تُراجع مع الجهة المعنية دون كشف بيانات غير لازمة."],
];

export default function VipTerms() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <SeoMetadata path="/vip/terms" title="شروط استخدام Omran VIP" description="شروط تفعيل واستخدام واستبدال كروت Omran VIP." />
      <AnnouncementBar /><BrandHeader />
      <main className="container max-w-4xl py-10 sm:py-14">
        <Link href="/vip" className="text-sm font-black text-brand-blue">العودة لبرنامج Omran VIP</Link>
        <h1 className="mt-4 text-3xl font-black text-brand-navy">شروط استخدام كروت Omran VIP</h1>
        <p className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold leading-7 text-sky-950">
          راجع تفاصيل نوع الكارت وصلاحيته والعروض المتاحة وقت الشراء، لأن لكل عرض شروط استخدام مستقلة.
        </p>
        <div className="mt-7 space-y-4">
          {sections.map(([title, body]) => (
            <section key={title} className="rounded-2xl border border-brand-border bg-white p-5">
              <h2 className="text-lg font-black text-brand-navy">{title}</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-brand-muted">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-6 text-sm font-semibold leading-7 text-brand-muted">
          تفاصيل السعر والصلاحية والاستبدال والإلغاء الخاصة بكل كارت بتظهر للعميل قبل الشراء.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
