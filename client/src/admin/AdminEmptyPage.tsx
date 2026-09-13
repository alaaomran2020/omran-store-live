import { DatabaseZap } from "lucide-react";

const content: Record<string, { title: string; description: string }> = {
  "/admin/reviews": {
    title: "مراجعة المنتجات",
    description:
      "المصدر العام يعرض المنتجات المجتازة لبوابة النشر فقط، ولا يوفّر صفوف NEEDS_REVIEW للقراءة الآمنة.",
  },
  "/admin/search": {
    title: "البحث والفلاتر",
    description:
      "البحث والفلاتر متاحان داخل صفحة المنتجات. لا يوجد إعداد بحث منفصل قابل للكتابة في المصدر الحالي.",
  },
  "/admin/leads": {
    title: "واتساب وLeads",
    description:
      "التتبّع الحالي يرسل الأحداث إلى سجل التشغيل، لكن المشروع لا يحتوي واجهة قراءة إدارية آمنة لهذه السجلات.",
  },
  "/admin/staff": {
    title: "الموظفون والصلاحيات",
    description:
      "الهوية والحماية مُدارتان عبر Cloudflare Access. لا يوفّر المشروع قائمة مستخدمين أو RBAC قابلة للقراءة من الواجهة.",
  },
  "/admin/reports": {
    title: "التقارير والتحليلات",
    description:
      "لا توجد واجهة قراءة مجمّعة للتقارير داخل المشروع. لن تُعرض نسب تحويل أو رسوم بلا مصدر موثوق.",
  },
  "/admin/activity": {
    title: "سجل النشاط",
    description:
      "لا يحتوي المشروع حاليًا على مصدر Audit Log قابل للقراءة. عمليات VIP اليدوية تبدأ PENDING وتُراجع داخل سجل التشغيل.",
  },
  "/admin/settings": {
    title: "إعدادات النظام",
    description:
      "لا توجد إعدادات آمنة قابلة للكتابة من الواجهة. إعدادات النشر والحماية تبقى خارج حزمة المتصفح.",
  },
};
export default function AdminEmptyPage({ path }: { path: string }) {
  const page = content[path] || {
    title: "القسم غير متاح",
    description: "لا يوجد مصدر بيانات مدعوم لهذا القسم حاليًا.",
  };
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
      <DatabaseZap className="mx-auto text-slate-400" size={38} />
      <h2 className="mt-4 text-xl font-black">{page.title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
        {page.description}
      </p>
      <div className="mx-auto mt-5 max-w-xl rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
        التكامل غير متاح حاليًا — لا توجد بيانات وهمية.
      </div>
    </div>
  );
}
