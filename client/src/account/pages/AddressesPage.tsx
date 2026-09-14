/**
 * العناوين — قراءة/إضافة عبر بوابة الحسابات. بلا بوابة: حالة صادقة بلا عناوين
 * مزيفة أو حفظ وهمي.
 */
import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { AdminButton, Card, CardHeader, EmptyState, TextAreaField, TextInput } from "@/admin/components/primitives";
import { useAccountSession } from "@/account/AccountSession";
import { postCustomerAction } from "@/lib/auth/authClient";

export default function AddressesPage() {
  const { session } = useAccountSession();
  const addresses = session?.authenticated ? session.addresses : [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", line1: "", district: "", city: "طنطا", notes: "" });

  async function add() {
    if (form.line1.trim().length < 8) {
      toast.error("اكتب العنوان بوضوح (شارع/منطقة على الأقل).");
      return;
    }
    const result = await postCustomerAction("customer_address_create", {
      label: form.label.trim(),
      line1: form.line1.trim(),
      line2: form.district.trim(),
      city: form.city.trim(),
      notes: form.notes.trim(),
    });
    if (!result.ok) {
      toast.error(
        result.code === "UNAUTHENTICATED"
          ? "انتهت الجلسة — سجّل الدخول مجددًا."
          : "بوابة الحسابات غير مفعّلة — لا تُحفظ عناوين محليًا."
      );
      return;
    }
    toast.success("أُضيف العنوان.");
    setOpen(false);
    setForm({ label: "", line1: "", district: "", city: "طنطا", notes: "" });
  }

  return (
    <div dir="rtl">
      <Toaster position="top-center" dir="rtl" richColors closeButton />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-brand-ink">العناوين</h1>
        <AdminButton size="sm" onClick={() => setOpen(value => !value)}>
          <Plus size={15} /> عنوان جديد
        </AdminButton>
      </div>

      {addresses.length === 0 && !open ? (
        <Card className="p-5">
          <EmptyState icon={<MapPin size={22} />} title="لا عناوين محفوظة بعد" description="أضف عنوانًا لتسهيل الطلب عبر واتساب مستقبلًا. العناوين تُحفظ على بوابة الحسابات الآمنة عند تفعيلها." />
        </Card>
      ) : null}

      <div className="space-y-3">
        {addresses.map(address => (
          <Card key={address.addressId} className="p-4">
            <p className="text-sm font-extrabold text-brand-ink">{address.label ?? "عنوان"} {address.isDefault ? "· الافتراضي" : ""}</p>
            <p className="mt-1 text-xs leading-6 text-brand-muted">{address.line1} {address.line2 ?? ""}، {address.city}.</p>
          </Card>
        ))}
      </div>

      {open ? (
        <Card className="mt-4">
          <CardHeader title="عنوان جديد" />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <TextInput label="مسمّى (بيت/شغل)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            <TextInput label="المحافظة/المدينة" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <TextInput label="المنطقة/الحي" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="sm:col-span-2" />
            <TextAreaField label="تفاصيل العنوان" value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <AdminButton onClick={add}><Plus size={15} /> حفظ العنوان</AdminButton>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
