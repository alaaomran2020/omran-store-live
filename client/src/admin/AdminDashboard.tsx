import { Link } from "wouter";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  FolderTree,
  HeartHandshake,
  MessageCircle,
  PackagePlus,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { useAdminCatalog } from "./adminData";

function Metric({
  label,
  value,
  icon: Icon,
  unavailable = false,
}: {
  label: string;
  value: number | string;
  icon: typeof Boxes;
  unavailable?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-xl bg-slate-100 p-2 text-blue-700">
          <Icon size={20} />
        </span>
        {unavailable && (
          <span className="text-[10px] font-bold text-slate-400">غير متصل</span>
        )}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const query = useAdminCatalog();
  const products = query.data?.products || [];
  const published = products.filter(
    p => p.active && p.workflowStatus === "PUBLISHED" && p.qaStatus === "PASS"
  );
  const categories = new Set(products.map(p => p.category).filter(Boolean));
  const attention = products.filter(
    p => !p.active || p.workflowStatus !== "PUBLISHED" || p.qaStatus !== "PASS"
  );
  return (
    <div className="space-y-6">
      <section aria-labelledby="overview">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="overview" className="text-lg font-black">
              نظرة عامة
            </h2>
            <p className="text-sm text-slate-500">
              بيانات الكتالوج الحقيقية المتاحة حاليًا
            </p>
          </div>
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold"
          >
            <RefreshCw
              size={16}
              className={query.isFetching ? "animate-spin" : ""}
            />
            تحديث
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="إجمالي المنتجات المتاحة للمصدر"
            value={query.isLoading ? "…" : products.length}
            icon={Boxes}
          />
          <Metric
            label="المنتجات المنشورة"
            value={query.isLoading ? "…" : published.length}
            icon={CheckCircle2}
          />
          <Metric
            label="تحتاج مراجعة (المتاحة فقط)"
            value={query.isLoading ? "…" : attention.length}
            icon={AlertTriangle}
          />
          <Metric
            label="الأقسام"
            value={query.isLoading ? "…" : categories.size}
            icon={FolderTree}
          />
          <Metric
            label="منخفض المخزون"
            value="—"
            icon={Warehouse}
            unavailable
          />
          <Metric
            label="استفسارات واتساب"
            value="—"
            icon={MessageCircle}
            unavailable
          />
          <Metric
            label="أعضاء VIP"
            value="—"
            icon={HeartHandshake}
            unavailable
          />
          <Metric
            label="العمليات الأخيرة"
            value="—"
            icon={RefreshCw}
            unavailable
          />
        </div>
      </section>
      {query.isError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
        >
          تعذر قراءة مصدر الكتالوج الآن. لم يتم عرض أرقام تقديرية.
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black">إجراءات سريعة</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/product-intake"
              className="flex min-h-14 items-center gap-3 rounded-xl bg-blue-600 px-4 font-bold text-white"
            >
              <PackagePlus />
              إضافة منتج
            </Link>
            <Link
              href="/admin/products"
              className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 px-4 font-bold"
            >
              <Boxes />
              عرض المنتجات
            </Link>
            <Link
              href="/admin/categories"
              className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 px-4 font-bold"
            >
              <FolderTree />
              مراجعة الأقسام
            </Link>
            <Link
              href="/admin/vip-operations"
              className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 px-4 font-bold"
            >
              <HeartHandshake />
              عملية VIP
            </Link>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black">صحة النظام</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Cloudflare Access</span>
              <b className="text-emerald-700">مُصادق</b>
            </div>
            <div className="flex justify-between">
              <span>مصدر الكتالوج</span>
              <b
                className={query.isError ? "text-red-700" : "text-emerald-700"}
              >
                {query.isLoading
                  ? "جاري الفحص"
                  : query.isError
                    ? "غير متاح"
                    : "متصل"}
              </b>
            </div>
            <div className="flex justify-between">
              <span>آخر قراءة</span>
              <b dir="ltr" className="text-xs">
                {query.data?.fetchedAt
                  ? new Date(query.data.fetchedAt).toLocaleString("ar-EG")
                  : "—"}
              </b>
            </div>
          </div>
          <Link
            href="/admin/diagnostics"
            className="mt-5 inline-flex text-sm font-bold text-blue-700"
          >
            فتح التشخيص الكامل
          </Link>
        </section>
      </div>
    </div>
  );
}
