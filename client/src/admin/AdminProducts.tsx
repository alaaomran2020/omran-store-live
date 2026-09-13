import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useAdminCatalog } from "./adminData";

const PAGE_SIZE = 20;
export default function AdminProducts() {
  const { data, isLoading, isError, refetch } = useAdminCatalog();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [qa, setQa] = useState("");
  const [availability, setAvailability] = useState("");
  const [sort, setSort] = useState("order");
  const [page, setPage] = useState(1);
  const products = data?.products || [];
  const categories = useMemo(
    () => [...new Set(products.map(p => p.category).filter(Boolean))].sort(),
    [products]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("ar");
    return products
      .filter(
        p =>
          (!q ||
            `${p.name} ${p.sku || ""} ${p.id}`
              .toLocaleLowerCase("ar")
              .includes(q)) &&
          (!category || p.category === category) &&
          (!active || String(p.active) === active) &&
          (!workflow || p.workflowStatus === workflow) &&
          (!qa || p.qaStatus === qa) &&
          (!availability || p.availability === availability)
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "ar")
          : sort === "category"
            ? a.category.localeCompare(b.category, "ar")
            : (a.sortOrder ?? a.rowIndex) - (b.sortOrder ?? b.rowIndex)
      );
  }, [products, search, category, active, workflow, qa, availability, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE
  );
  const update =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  const selectClass =
    "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black">كل المنتجات</h2>
        <p className="text-sm text-slate-500">
          قراءة فقط من مصدر الكتالوج الحالي؛ التعديل يتم من قاعدة التشغيل.
        </p>
      </div>
      <section
        aria-label="فلاتر المنتجات"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative xl:col-span-2">
            <span className="sr-only">بحث</span>
            <Search
              className="absolute right-3 top-3 text-slate-400"
              size={19}
            />
            <input
              value={search}
              onChange={update(setSearch)}
              placeholder="ابحث بالاسم أو SKU أو ID"
              className={`${selectClass} w-full pr-10`}
            />
          </label>
          <select
            aria-label="القسم"
            value={category}
            onChange={update(setCategory)}
            className={selectClass}
          >
            <option value="">كل الأقسام</option>
            {categories.map(x => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="الظهور"
            value={active}
            onChange={update(setActive)}
            className={selectClass}
          >
            <option value="">كل حالات الظهور</option>
            <option value="true">ظاهر</option>
            <option value="false">مخفي</option>
          </select>
          <select
            aria-label="سير العمل"
            value={workflow}
            onChange={update(setWorkflow)}
            className={selectClass}
          >
            <option value="">كل حالات النشر</option>
            <option>PUBLISHED</option>
            <option>REVIEW</option>
            <option>DRAFT</option>
            <option>REJECTED</option>
            <option>ERROR</option>
          </select>
          <select
            aria-label="الجودة"
            value={qa}
            onChange={update(setQa)}
            className={selectClass}
          >
            <option value="">كل حالات QA</option>
            <option>PASS</option>
            <option>NEEDS_REVIEW</option>
            <option>FAIL</option>
          </select>
          <select
            aria-label="التوفر"
            value={availability}
            onChange={update(setAvailability)}
            className={selectClass}
          >
            <option value="">كل حالات التوفر</option>
            <option value="available">متاح</option>
            <option value="unavailable">غير متاح</option>
            <option value="preorder">طلب مسبق</option>
            <option value="unknown">غير محدد</option>
          </select>
          <select
            aria-label="الترتيب"
            value={sort}
            onChange={update(setSort)}
            className={selectClass}
          >
            <option value="order">ترتيب العرض</option>
            <option value="name">الاسم</option>
            <option value="category">القسم</option>
          </select>
        </div>
      </section>
      {isLoading ? (
        <div role="status" className="grid gap-3">
          {[1, 2, 3].map(x => (
            <div
              key={x}
              className="h-16 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5"
        >
          <b>تعذر تحميل المنتجات.</b>
          <button
            onClick={() => refetch()}
            className="mr-3 font-bold text-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <b>لا توجد نتائج مطابقة</b>
          <p className="mt-2 text-sm text-slate-500">
            غيّر البحث أو الفلاتر الحالية.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[920px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-4">المنتج</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">القسم</th>
                  <th className="p-4">الظهور</th>
                  <th className="p-4">النشر</th>
                  <th className="p-4">QA</th>
                  <th className="p-4">التوفر</th>
                  <th className="p-4">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image || "/brand/logo-256.png"}
                          alt=""
                          className="h-11 w-11 rounded-lg bg-slate-100 object-contain"
                          loading="lazy"
                        />
                        <div>
                          <b>{p.name}</b>
                          <div className="text-xs text-slate-400" dir="ltr">
                            {p.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="p-4">{p.category || "غير محدد"}</td>
                    <td className="p-4">
                      <Badge ok={p.active}>{p.active ? "ظاهر" : "مخفي"}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge ok={p.workflowStatus === "PUBLISHED"}>
                        {p.workflowStatus || "غير محدد"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge ok={p.qaStatus === "PASS"}>
                        {p.qaStatus || "غير محدد"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {p.availability === "unknown"
                        ? "غير محدد"
                        : p.availability}
                    </td>
                    <td className="p-4">
                      <a
                        href={`/products?product=${encodeURIComponent(p.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`معاينة ${p.name}`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 font-bold text-blue-700"
                      >
                        <ExternalLink size={15} />
                        فتح
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              عرض {visible.length} من {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
                className="min-h-10 rounded-lg border bg-white px-4 disabled:opacity-40"
              >
                السابق
              </button>
              <span className="px-3 py-2">
                {current} / {pages}
              </span>
              <button
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
                className="min-h-10 rounded-lg border bg-white px-4 disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
    >
      {children}
    </span>
  );
}
