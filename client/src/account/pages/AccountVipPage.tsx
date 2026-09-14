import { Link } from "wouter";
import { Crown } from "lucide-react";
import { Card, CardHeader } from "@/admin/components/primitives";

export default function AccountVipPage() {
  return (
    <div dir="rtl">
      <h1 className="mb-4 text-xl font-black text-brand-ink">برنامج VIP</h1>
      <Card>
        <CardHeader title="خليك مميز — برنامج العملاء" icon={<Crown size={18} className="text-brand-warning" />} />
        <div className="space-y-3 p-5 text-sm leading-7 text-brand-muted">
          <p>
            برنامج VIP الحالي في مرحلة الإطلاق التجريبي، وتسجيل الاهتمام متاح عبر صفحة البرنامج. ربط البطاقة بالحساب
            يتطلب بوابة العضويات الخادمية (نفس بنية OTP) — لا تُعرض حالة عضوية مخترعة.
          </p>
          <Link href="/vip" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-extrabold text-white hover:bg-brand-blue-hover">
            <Crown size={16} /> صفحة برنامج VIP
          </Link>
        </div>
      </Card>
    </div>
  );
}
