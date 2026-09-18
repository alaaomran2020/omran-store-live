/**
 * إدارة المنتجات — قائمة حقيقية على الكتالوج الكامل (كل حالات النشر والجودة).
 * البحث مُخمد (debounced)، الترقيم يرسم صفحة واحدة فقط فتتحمل 3000+ منتج،
 * والفلاتر كلها مشتقة من البيانات الفعلية. مصدر Omran/POP UP منفصلان دائمًا.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Eye, PencilLine, Plus } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  DataTable,
  EmptyState,
  FilterSelect,
  LoadingState,
  SearchField,
  type DataTableColumn,
} from "@/admin/components/primitives";
import { PermissionGate } from "@/admin/components/primitives";
import {
  AvailabilityBadge,
  BrandBadge,
  QaBadge,
  VisibilityBadge,
  WorkflowBadge,
} from "@/admin/components/StatusBadges";
import { useAdminCatalog } from "@/admin/dataHooks";
import { formatPrice } from "@/admin/adminFormat";
import { productCategories } from "@shared/products";
import type { AdminProduct } from "@/lib/admin/adminCatalog";

function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function ProductsPage() {
  const { products, isLoading } = useAdminCatalog();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [qa, setQa] = useState("ALL");
  const [availability, setAvailability] = useState("ALL");
  const [brand, setBrand] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [sort, setSort] = useState("source");
  const [pageSize, setPageSize] = useState("25");
  const debouncedSearch = useDebounced(search);

  const categories = useMemo(() => productCategories(products.map(p => p)), [products]);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const rows = products.filter(p => {
      if (brand !== "ALL" && p.sourceBrand !== brand) return false;
      if (category !== "ALL" && p.category !== category) return false;
      if (availability !== "ALL" && p.availability !== availability) return false;
      if (qa !== "ALL" && (p.qaStatus ?? "UNVERIFIED") !== qa) return false;
      if (status === "PUBLISHED" && !(p.workflowStatus === "PUBLISHED" && p.qaStatus === "PASS" && p.active)) return false;
      if (status === "REVIEW" && p.workflowStatus !== "REVIEW" && !(p.workflowStatus === "PUBLISHED" && p.qaStatus === "NEEDS_REVIEW")) return false;
      if (status === "DRAFT" && p.workflowStatus !== "DRAFT") return false;
      if (status === "REJECTED" && !(p.workflowStatus === "REJECTED" || p.workflowStatus === "ERROR")) return false;
      if (status === "MISSING_STATUS" && p.workflowStatus !== null) return false;
      if (status === "HIDDEN" && p.active !== false) return false;
      if (query) {
        const haystack = [p.id, p.sku ?? "", p.name, p.description, p.category].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "ar");
        case "price-desc":
          return (b.price ?? -1) - (a.price ?? -1);
        case "price-asc":
          return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
        case "qa":
          return (a.qaStatus ?? "").localeCompare(b.qaStatus ?? "");
        default:
          return (a.sortOrder ?? a.rowIndex * 1000) - (b.sortOrder ?? b.rowIndex * 1000) || a.rowIndex - b.rowIndex;
      }
    });
    return sorted;
  }, [products, debouncedSearch, status, qa, availability, brand, category, sort]);

  const columns: DataTableColumn<AdminProduct>[] = [
    {
      key: "name",
      header: "المنتج",
      render: p => (
        <div className="flex items-center gap-3">
          <img
            src={p.image ?? undefined}
            alt=""
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-lg border border-brand-border bg-brand-cream object-cover"
            onError={event => {
              (event.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <div className="min-w-0">
            <p className="truncate font-extrabold text-brand-ink">{p.name}</p>
            <p dir="ltr" className="truncate text-[11px] font-bold text-brand-disabled">
              {p.sku || p.id}
            </p>
          </div>
        </div>
      ),
    },
    { key: "brand", header: "المصدر", render: p => <BrandBadge brand={p.sourceBrand} /> },
    { key: "category", header: "القسم", render: p => <span className="text-xs font-semibold">{p.category || "—"}</span> },
    { key: "price", header: "السعر", render: p => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{formatPrice(p.price)}</span> },
    { key: "workflow", header: "النشر", render: p => <WorkflowBadge status={p.workflowStatus} /> },
    { key: "qa", header: "الجودة", render: p => <QaBadge status={p.qaStatus} /> },
    { key: "visibility", header: "الظهور", render: p => <VisibilityBadge product={p} /> },
    { key: "availability", header: "التوفر", render: p => <AvailabilityBadge availability={p.availability} /> },
    {
      key: "actions",
      header: "إجراءات",
      render: p => (
        <div className="flex items-center gap-1">
          <Link
            href={`/products/${encodeURIComponent(p.id)}`}
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-brand-navy hover:bg-brand-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25"
            title="تعديل/عرض"
          >
            <PencilLine size={16} />
          </Link>
          {p.workflowStatus === "PUBLISHED" && p.qaStatus === "PASS" && p.active ? (
            <Link
              href={`/products?focus=${encodeURIComponent(p.id)}`}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-brand-navy hover:bg-brand-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25"
              title="معاينة بالمتجر"
            >
              <Eye size={16} />
            </Link>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AdminPageShell
      title="المنتجات"
      subtitle={`${products.length} منتج في الكتالوج الكامل — ${filtered.length} مطابق للبحث`}
      actions={
        <PermissionGate permission="product:create">
          <Link href="/product-intake">
            <AdminButton size="sm">
              <Plus size={16} /> إضافة منتج
            </AdminButton>
          </Link>
        </PermissionGate>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <SearchField value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الكود أو SKU…" label="بحث في المنتجات" className="md:col-span-2" />
              <FilterSelect
                label="حالة النشر"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "ALL", label: "كل حالات النشر" },
                  { value: "PUBLISHED", label: "منشور" },
                  { value: "REVIEW", label: "تحت المراجعة" },
                  { value: "DRAFT", label: "مسودة" },
                  { value: "REJECTED", label: "مرفوض/خطأ" },
                  { value: "MISSING_STATUS", label: "غير موثّق" },
                  { value: "HIDDEN", label: "مخفي" },
                ]}
              />
              <FilterSelect
                label="قرار الجودة"
                value={qa}
                onChange={setQa}
                options={[
                  { value: "ALL", label: "كل قرارات الجودة" },
                  { value: "PASS", label: "اجتاز" },
                  { value: "NEEDS_REVIEW", label: "يحتاج مراجعة" },
                  { value: "FAIL", label: "راسب" },
                  { value: "UNVERIFIED", label: "بلا قرار" },
                ]}
              />
              <FilterSelect
                label="المصدر"
                value={brand}
                onChange={setBrand}
                options={[
                  { value: "ALL", label: "كل المصادر" },
                  { value: "OMRAN", label: "Omran Toys" },
                  { value: "POPUP", label: "POP UP" },
                ]}
              />
              <FilterSelect
                label="التوفر"
                value={availability}
                onChange={setAvailability}
                options={[
                  { value: "ALL", label: "كل حالات التوفر" },
                  { value: "available", label: "متوفر" },
                  { value: "unavailable", label: "نفد" },
                  { value: "preorder", label: "طلب مسبق" },
                  { value: "unknown", label: "بلا بيانات" },
                ]}
              />
              <FilterSelect
                label="القسم"
                value={category}
                onChange={setCategory}
                options={[{ value: "ALL", label: "كل الأقسام" }, ...categories.map(c => ({ value: c, label: c }))]}
              />
              <div className="grid grid-cols-2 gap-3">
                <FilterSelect
                  label="الترتيب"
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: "source", label: "ترتيب المصدر" },
                    { value: "name", label: "الاسم (أبجدي)" },
                    { value: "price-desc", label: "السعر: الأعلى" },
                    { value: "price-asc", label: "السعر: الأقل" },
                    { value: "qa", label: "حالة الجودة" },
                  ]}
                />
                <FilterSelect
                  label="لكل صفحة"
                  value={pageSize}
                  onChange={setPageSize}
                  options={[
                    { value: "25", label: "25 / صفحة" },
                    { value: "50", label: "50 / صفحة" },
                    { value: "100", label: "100 / صفحة" },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            {filtered.length === 0 ? (
              <div className="p-5">
                <EmptyState title="لا منتجات مطابقة" description="جرّب تعديل البحث أو الفلاتر." />
              </div>
            ) : (
              <DataTable
                columns={columns}
                rows={filtered}
                keyOf={p => `${p.sourceBrand}:${p.id}:${p.rowIndex}`}
                pageSize={Number(pageSize)}
                caption="كل المنتجات مع حالات النشر والجودة والتوفر"
              />
            )}
          </Card>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-brand-muted">
            <Badge tone="green">منشور</Badge>
            <span>يستوفي البوابة الثلاثية: نشط + PUBLISHED + PASS</span>
            <Badge tone="amber" className="ms-4">تحت المراجعة</Badge>
            <span>محجوب عن الجمهور حتى الاعتماد</span>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
