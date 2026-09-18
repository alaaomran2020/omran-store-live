/**
 * الملف الشخصي — الحد الأدنى بعد التحقق من الموبايل: الاسم الكامل (مطلوب
 * لإكمال الحساب) والبريد الاختياري. الحفظ عبر بوابة Same-origin فقط؛ لا
 * حفظ محلي لبيانات الهوية.
 */
import { useState } from "react";
import { toast, Toaster } from "sonner";
import { AdminButton, Card, CardHeader, EmptyState, InfoBanner, TextInput } from "@/admin/components/primitives";
import { useAccountSession } from "@/account/AccountSession";
import { postCustomerAction } from "@/lib/auth/authClient";
import { formatDateTime } from "@/admin/adminFormat";

export default function ProfilePage() {
  const { session, refresh } = useAccountSession();
  const customer = session?.authenticated ? session.customer : null;
  const [fullName, setFullName] = useState(customer?.fullName ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [saving, setSaving] = useState(false);

  if (!customer) return <Card className="p-5"><EmptyState title="بيانات الحساب غير متاحة" description="تعذر تحميل بيانات حسابك. سجّل الدخول من جديد أو حاول لاحقًا." tone="warning" /></Card>;
  const pending = customer.status === "PENDING_PROFILE";

  async function save() {
    if (!customer) return;
    if (fullName.trim().length < 3) {
      toast.error("اكتب اسمك الكامل (3 أحرف على الأقل).");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("البريد الإلكتروني غير صحيح.");
      return;
    }
    setSaving(true);
    try {
      // إجراء عبر بوابة الحسابات Same-origin (شطيرة العميل)؛ يُرفض إن لم تُنشر.
      const result = await postCustomerAction("customer_profile_update", {
        customer_id: customer.customerId,
        full_name: fullName.trim(),
        email: email.trim(),
      });
      if (!result.ok) {
        toast.error(
          result.code === "UNAUTHENTICATED"
            ? "انتهت الجلسة — سجّل الدخول مجددًا."
            : "بوابة الحسابات غير مفعّلة حاليًا — لم يُحفظ أي تغيير وهمي."
        );
        return;
      }
      await refresh();
      toast.success("تم حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl">
      <Toaster position="top-center" dir="rtl" richColors closeButton />
      <h1 className="mb-4 text-xl font-black text-brand-ink">بياناتي</h1>
      {pending ? (
        <InfoBanner tone="warning">أهلاً بيك في عمران تويز 👋 أكمل اسمك لتفعيل الحساب بالكامل. الموبايل موثّق بالفعل عبر رمز التحقق.</InfoBanner>
      ) : null}
      <Card className="mt-4">
        <CardHeader title="المعلومات الأساسية" subtitle="الموبايل لا يُغيَّر إلا بعد تحقق OTP جديد" />
        <div className="space-y-4 p-5">
          <TextInput label="رقم الموبايل (موثّق)" value={customer.mobile} dir="ltr" disabled />
          <TextInput label="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثال: منى أحمد" />
          <TextInput label="البريد الإلكتروني (اختياري)" type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-brand-muted">
              تحقق الموبايل: {customer.mobileVerifiedAt ? formatDateTime(customer.mobileVerifiedAt) : "—"}
            </p>
            <AdminButton onClick={save} loading={saving}>حفظ البيانات</AdminButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
