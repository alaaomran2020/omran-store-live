import { toast, Toaster } from "sonner";
import { ShieldCheck } from "lucide-react";
import {
  AdminButton,
  Card,
  CardHeader,
} from "@/admin/components/primitives";
import { useAccountSession } from "@/account/AccountSession";
import { clearWishlist } from "@/lib/wishlist";

export default function AccountSettingsPage() {
  const { logout } = useAccountSession();

  return (
    <div dir="rtl">
      <Toaster position="top-center" dir="rtl" richColors closeButton />
      <h1 className="mb-4 text-xl font-black text-brand-ink">الإعدادات</h1>

      <Card>
        <CardHeader title="البيانات المحلية" subtitle="المفضلة تُحفظ على هذا الجهاز فقط حتى تفعيل المزامنة" />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <AdminButton
            variant="secondary"
            onClick={() => {
              clearWishlist();
              toast.success("تم مسح المفضلة على هذا الجهاز.");
            }}
          >
            مسح المفضلة المحلية
          </AdminButton>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="الأمان" icon={<ShieldCheck size={18} className="text-brand-success" />} />
        <div className="space-y-3 p-5 text-xs leading-6 text-brand-muted">
          <p>الدخول برقم الموبايل ورمز OTP، والجلسة شطيرة آمنة (HttpOnly/Secure/SameSite) — لا توكنات تُخزَّن في المتصفح.</p>
          <p>تسجيل الخروج يُبطل الجلسة على الخادم فورًا.</p>
          <AdminButton variant="danger" onClick={() => void logout()}>تسجيل الخروج</AdminButton>
        </div>
      </Card>
    </div>
  );
}
