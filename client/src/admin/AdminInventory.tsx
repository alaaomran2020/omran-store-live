import { useAdminCatalog } from "./adminData";
export default function AdminInventory() {
  const { data, isLoading, isError } = useAdminCatalog();
  const products = data?.products || [];
  const known = products.filter(p => p.availability !== "unknown");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black">حالة المخزون</h2>
        <p className="text-sm text-slate-500">
          يعرض فقط حقول المخزون الموثقة في المصدر الحالي.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card
          label="منتجات بحالة موثقة"
          value={isLoading ? "…" : known.length}
        />
        <Card
          label="متاح"
          value={
            isLoading
              ? "…"
              : known.filter(p => p.availability === "available").length
          }
        />
        <Card
          label="غير متاح"
          value={
            isLoading
              ? "…"
              : known.filter(p => p.availability === "unavailable").length
          }
        />
      </div>
      {isError ? (
        <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-800">
          تعذر قراءة مصدر الكتالوج.
        </div>
      ) : !isLoading && known.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <b>المخزون الكمي غير مفعّل في المصدر الحالي</b>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            لا تتوفر Available Quantity أو Low Stock Threshold أو Last Updated.
            لم تُنشأ قيم تقديرية؛ فعّل الأعمدة المعتمدة في قاعدة التشغيل لعرضها
            هنا.
          </p>
        </div>
      ) : null}
    </div>
  );
}
function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <b className="text-2xl">{value}</b>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
