/**
 * أداء واتساب — ضغطات الاستفسار الفعلية فقط من دفتر Analytics_Events.
 * لا محتوى محادثات ولا رسائل ولا أرقام عملاء. عند عدم تفعيل إجراء القراءة
 * تُعرض الحالة الصادقة مع شرح المطلوب (بلا أي رقم مختلق).
 */
import { Link } from "wouter";
import { MessageCircle, Phone, RefreshCw } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  Card,
  CardHeader,
  EmptyState,
  LoadingState,
  MetricCard,
} from "@/admin/components/primitives";
import { ChartCard, HBarChart, LineTrendChart } from "@/admin/components/charts";
import { useWhatsAppMetrics } from "@/admin/dataHooks";
import { AdminButton } from "@/admin/components/primitives";
import { STORE_CONTACT } from "@shared/storeContent";

export default function WhatsAppPage() {
  const query = useWhatsAppMetrics();
  const result = query.data;
  const data = result?.status === "live" ? result.data : null;

  return (
    <AdminPageShell
      title="أداء واتساب"
      subtitle="ضغطات استفسار المنتجات من دفتر الأحداث الأولي — قناة التحويل الأساسية"
      actions={
        <AdminButton variant="secondary" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
          <RefreshCw size={15} /> تحديث
        </AdminButton>
      }
    >
      {query.isLoading ? (
        <LoadingState />
      ) : !data ? (
        <Card>
          <CardHeader title="البيانات غير متاحة حاليًا" icon={<MessageCircle size={18} />} />
          <div className="p-5">
            <EmptyState
              tone="warning"
              icon={<MessageCircle size={22} />}
              title="قراءة تحليلات واتساب غير مفعّلة على البوابة"
              description="الواجهة تُصدر أحداث product_whatsapp_click. المطلوب تفعيل إجراء القراءة whatsapp_metrics على Admin Runtime يُرجع الإجمالي وآخر 7 أيام وأكثر المنتجات/الأقسام ضغطًا. حتى ذلك الحين تُعرض هذه الصفحة حالة صادقة بدل أرقام مقدّرة."
              action={
                <a
                  href={`https://wa.me/${STORE_CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-whatsapp px-5 text-sm font-extrabold text-white hover:bg-whatsapp-hover"
                >
                  <Phone size={16} /> اختبار رابط واتساب
                </a>
              }
            />
          </div>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard label="إجمالي الضغطات" value={data.total} icon={<MessageCircle size={18} />} tone="whatsapp" />
            <MetricCard label="ضغطات اليوم" value={data.today} icon={<MessageCircle size={18} />} tone="green" />
            <MetricCard label="آخر 7 أيام" value={data.last7} icon={<MessageCircle size={18} />} tone="blue" />
            <MetricCard label="منتجات تفاعلت" value={data.topProducts.length} icon={<MessageCircle size={18} />} tone="purple" />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="اتجاه الضغطات (14 يومًا)" subtitle="يوم بيوم من الأحداث الفعلية">
              <LineTrendChart points={data.trend} />
            </ChartCard>
            <ChartCard title="أقسام حسب الضغطات" subtitle="من سجل الأحداث الفعلي">
              <HBarChart data={data.topCategories} emptyTitle="لا ضغطات مصنّفة بعد" />
            </ChartCard>
          </div>

          <ChartCard className="mt-4" title="أكثر المنتجات ضغطًا" subtitle="المنتجات التي فتح العميل استفسار واتساب منها">
            <HBarChart data={data.topProducts} emptyTitle="لا ضغطات منتجات بعد" />
          </ChartCard>
        </>
      )}

      <Card className="mt-5">
        <CardHeader title="حدود الخصوصية والبيانات" />
        <ul className="list-disc space-y-1.5 px-8 py-5 text-xs font-semibold leading-6 text-brand-muted">
          <li>تعرض اللوحة تجميعات ضغطات مجهولة الهوية فقط — لا رسائل ولا محادثات ولا محتوى عملاء.</li>
          <li>الحدث يُسجَّل مرة واحدة لكل ضغطة فعلية على زر الاستفسار في بطاقة/تفاصيل المنتج.</li>
          <li>أي مؤشر مبيعات/طلبات/إيرادات غير موجود عمدًا: لا مصدر موثوق له حاليًا.</li>
          <li>
            راجع <Link href="/admin/reports" className="font-extrabold text-brand-blue hover:underline">التقارير</Link> لتقرير تغطية الكتالوج المشتق بالكامل من البيانات.
          </li>
        </ul>
      </Card>
    </AdminPageShell>
  );
}
