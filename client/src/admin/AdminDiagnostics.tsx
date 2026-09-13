import { useAdminCatalog } from "./adminData";
export default function AdminDiagnostics() {
  const q = useAdminCatalog();
  const rows = [
    ["Build version", import.meta.env.VITE_APP_VERSION || "1.0.0"],
    [
      "Commit SHA",
      import.meta.env.VITE_COMMIT_SHA || "غير متاح في حزمة البناء",
    ],
    ["Environment", import.meta.env.PROD ? "production" : "development"],
    ["Cloudflare Access", "جلسة الهوية مؤكدة"],
    ["Catalog status", q.isLoading ? "جاري الفحص" : q.isError ? "خطأ" : "متصل"],
    [
      "Products available",
      q.isLoading ? "—" : String(q.data?.products.length || 0),
    ],
    [
      "Last successful read",
      q.data?.fetchedAt
        ? new Date(q.data.fetchedAt).toLocaleString("ar-EG")
        : "غير متاح",
    ],
    ["Last deploy", "غير متاح داخل Runtime"],
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black">System Health</h2>
        <p className="text-sm text-slate-500">
          تشخيص آمن لا يعرض مفاتيح أو متغيرات حساسة.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-4 sm:grid-cols-[220px_1fr]">
              <dt className="text-sm text-slate-500">{k}</dt>
              <dd
                className="break-all font-mono text-sm font-bold"
                dir={k.includes("SHA") || k.includes("version") ? "ltr" : "rtl"}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <button
        onClick={() => q.refetch()}
        className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
      >
        إعادة فحص الكتالوج
      </button>
    </div>
  );
}
