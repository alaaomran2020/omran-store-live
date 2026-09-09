import { Link } from "wouter";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";

const sections = [
  ["البيانات المستخدمة", "الاسم ورقم الهاتف وبيانات العضوية والكروت والاستخدامات والمشتريات والنقاط والشكاوى، بالإضافة إلى الموظف الذي سجل أو راجع العملية."],
  ["الغرض", "إصدار وتفعيل الكارت، التحقق من الأهلية، منع التكرار، حساب المزايا، معالجة الاستبدال والشكاوى، والمراجعة المالية والأمنية."],
  ["المشاركة", "يحصل الموظف أو الشريك على أقل قدر لازم لتنفيذ العملية. لا يحصل الشريك على قائمة العملاء أو أرقامهم لمجرد المشاركة."],
  ["الحماية", "لا نضع رقم الهاتف أو بيانات العميل داخل QR، ولا نعرض رقم الهاتف كاملًا في صفحة تحقق عامة، ونقيد الوصول للسجلات الداخلية حسب دور الموظف."],
  ["الطلبات", "طلبات الوصول أو التصحيح أو المحو أو الاعتراض تُسجل كتذكرة، مع التحقق من هوية مقدم الطلب قبل كشف أو تعديل البيانات."],
];

export default function VipPrivacy() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <AnnouncementBar /><BrandHeader />
      <main className="container max-w-4xl py-10 sm:py-14">
        <Link href="/vip" className="text-sm font-black text-brand-blue">العودة لبرنامج Omran VIP</Link>
        <h1 className="mt-4 text-3xl font-black text-brand-navy">خصوصية برنامج Omran VIP</h1>
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-950">
          نسخة تجريبية للمراجعة. لن يبدأ تسجيل عضويات حقيقية قبل اعتماد مسؤول الخصوصية ومدد الاحتفاظ ومسار معالجة البيانات.
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
          البرنامج لا يستهدف تسجيل الأطفال؛ يسجل ولي الأمر أو شخص بالغ مسؤول. التسويق يحتاج اختيارًا مستقلًا ولا ينتج تلقائيًا عن شراء الكارت.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
