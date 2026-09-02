/**
 * client/src/admin/AdminProductsPage.tsx — قائمة منتجات لوحة الإدارة.
 * كتالوج مدموج: شيت Google Sheets + تجاوزات المدراء (يشمل المخفي).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@shared/products";
import { fetchAdminProducts, formatEGP } from "@/lib/adminApi";
import { BrutalCard, GhostButton, Notice, PageTitle, Spinner, TextInput } from "./ui";

const PAGE_SIZE = 20;

export default function AdminProductsPage({
  navigate,
}: {
  navigate: (to: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>("loading");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string, start: number) => {
    setStatus("loading");
    setError("");
    try {
      const data = await fetchAdminProducts({ search: query, limit: PAGE_SIZE, offset: start });
      setProducts(data.products);
      setTotal(data.total);
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المنتجات");
      setProducts([]);
      setTotal(0);
      setStatus("error");
    }
  }, []);

  // تحميل أولي + عند تغيير الصفحة
  useEffect(() => {
    void load(search, offset);
  }, [load, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  // بحث مع تأخير بسيط
  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setOffset(0);
      void load(value, 0);
    }, 350);
  }, [load]);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <PageTitle
        title="إدارة المنتجات"
        subtitle={`المصدر: Google Sheets + تجاوزات اللوحة — ${total} منتج`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <TextInput
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="بحث بالاسم أو الوصف أو التصنيف…"
          />
        </div>
        {status === "not_configured" ? (
          <Notice kind="warn" className="flex-1">
            الشيت غير مضبوط — اضبط PRODUCTS_SHEET_URL ثم أعد النشر.
          </Notice>
        ) : null}
      </div>

      {error ? <Notice kind="error" className="mb-4">{error}</Notice> : null}

      {status === "loading" && products.length === 0 ? (
        <Spinner label="جارٍ تحميل الكتالوج…" />
      ) : products.length === 0 ? (
        <BrutalCard className="p-10 text-center">
          <div className="text-sm font-bold text-slate-400">
            {search ? "لا نتائج للبحث المطلوب" : "لا منتجات — أضف صفًا في الشيت"}
          </div>
        </BrutalCard>
      ) : (
        <BrutalCard className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead>
              <tr className="border-b-2 border-ink-deep bg-slate-900 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
                <th className="px-3 py-2">الصورة</th>
                <th className="px-3 py-2">الاسم</th>
                <th className="px-3 py-2">السعر</th>
                <th className="px-3 py-2">التصنيف</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-900/50">
                  <td className="px-3 py-2">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 border border-slate-700 object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center border border-slate-800 font-mono text-[10px] text-slate-600">
                        —
                      </div>
                    )}
                  </td>
                  <td className="max-w-52 truncate px-3 py-2 font-bold text-slate-200">{p.name}</td>
                  <td className="px-3 py-2 text-slate-300">{formatEGP(p.price)}</td>
                  <td className="px-3 py-2 text-slate-400">{p.category || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-none border px-1.5 py-0.5 font-mono text-[10px] font-black uppercase ${
                        p.active
                          ? "border-emerald-600 bg-emerald-950/40 text-emerald-400"
                          : "border-red-600 bg-red-950/40 text-red-400"
                      }`}
                    >
                      {p.active ? "معروض" : "مخفي"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <GhostButton onClick={() => navigate(`/admin/products/${encodeURIComponent(p.id)}`)}>
                      تعديل
                    </GhostButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BrutalCard>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <GhostButton disabled={currentPage <= 1} onClick={() => setOffset(offset - PAGE_SIZE)}>
            → السابق
          </GhostButton>
          <span className="font-mono text-xs text-slate-500">
            صفحة {currentPage} من {pages}
          </span>
          <GhostButton disabled={currentPage >= pages} onClick={() => setOffset(offset + PAGE_SIZE)}>
            التالي ←
          </GhostButton>
        </div>
      ) : null}
    </div>
  );
}
