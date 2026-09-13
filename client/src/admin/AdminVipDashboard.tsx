import { Link } from "wouter";
import { HeartHandshake } from "lucide-react";
const metrics = [
  "الكروت المصدرة",
  "المفعّلة",
  "الموقوفة",
  "المستبدلة",
  "عمليات الاستخدام",
  "الشكاوى",
  "الشركاء",
  "العروض",
];
export default function AdminVipDashboard() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black">متابعة Omran VIP</h2>
        <p className="text-sm text-slate-500">
          تشغيل يدوي آمن مرتبط بالشيت الحالي.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(x => (
          <div
            key={x}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <HeartHandshake size={19} className="text-blue-700" />
            <div className="mt-4 text-2xl font-black">—</div>
            <p className="text-sm text-slate-500">{x}</p>
            <span className="mt-2 inline-block text-[10px] font-bold text-slate-400">
              لا توجد واجهة قراءة
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-black">عمليات VIP</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          الأرقام غير متاحة للقراءة داخل المشروع، لكن شاشة تجهيز العمليات
          الحالية محفوظة وتعمل ضمن لوحة الإدارة.
        </p>
        <Link
          href="/admin/vip-operations"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 font-bold text-white"
        >
          فتح شاشة العمليات
        </Link>
      </div>
    </div>
  );
}
