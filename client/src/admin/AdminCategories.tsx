import { ExternalLink } from "lucide-react";
import { useAdminCatalog } from "./adminData";

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "-");
export default function AdminCategories() {
  const { data, isLoading, isError } = useAdminCatalog();
  const products = data?.products || [];
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
    .sort()
    .map((name, index) => ({
      name,
      count: products.filter(p => p.category === name).length,
      order: index + 1,
    }));
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black">أقسام الكتالوج</h2>
        <p className="text-sm text-slate-500">
          مشتقة من بيانات المنتجات الحالية؛ لا يوجد Model كتابة مستقل للأقسام.
        </p>
      </div>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
      ) : isError ? (
        <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-800">
          تعذر قراءة الأقسام من الكتالوج.
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          لا توجد أقسام في المصدر الحالي.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categories.map(c => (
            <article
              key={c.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{c.name}</h3>
                  <p dir="ltr" className="mt-1 text-xs text-slate-400">
                    /{slugify(c.name)}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {c.count} منتج
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-400">ترتيب العرض</dt>
                  <dd className="font-bold">{c.order}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">الحالة</dt>
                  <dd className="font-bold text-emerald-700">نشط</dd>
                </div>
                <div>
                  <dt className="text-slate-400">الصورة</dt>
                  <dd>غير موثقة بالمصدر</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Coming Soon</dt>
                  <dd>غير مستخدم</dd>
                </div>
              </dl>
              <a
                href={`/products?category=${encodeURIComponent(c.name)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-blue-700"
              >
                <ExternalLink size={15} />
                معاينة القسم
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
