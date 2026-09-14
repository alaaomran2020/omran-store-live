/**
 * إدارة الأقسام — يربط التصنيفات المرجعية المعتمدة (shared/taxonomy) مع
 * الأقسام الواردة فعليًا من الكتالوج، ويكشف التغطية والأقسام غير المطابقة
 * دون تخمين. التعديل/الترتيب يُرسل عبر البوابة أو كحزمة TSV موثّقة.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast, Toaster } from "sonner";
import { ArrowUpDown, ClipboardCopy, FolderTree, Link2 } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  LoadingState,
  PermissionGate,
  type DataTableColumn,
} from "@/admin/components/primitives";
import { BrandBadge } from "@/admin/components/StatusBadges";
import { useAdminCatalog } from "@/admin/dataHooks";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { canonicalCategory, VISIBLE_CATEGORIES } from "@shared/taxonomy";
import { adminActionsConfigured, postAdminAction } from "@/lib/admin/adminGateway";
import { categoryChangePacket, copyPacket, downloadPacket } from "@/lib/admin/changePackets";
import { emitAudit } from "@/lib/admin/auditClient";

type CategoryRow = {
  id: string;
  name: string;
  canonical: string | null;
  omran: number;
  popup: number;
  aliases: number;
};

export default function CategoriesPage() {
  const { products, isLoading } = useAdminCatalog();
  const { actor } = useAdminIdentity();
  const [brandFilter, setBrandFilter] = useState<"OMRAN" | "POPUP" | "ALL">("OMRAN");
  const directWrite = adminActionsConfigured();

  const { rows, unmapped, mappedTaxonomy } = useMemo(() => {
    const live = new Map<string, { omran: number; popup: number; canonical: string | null }>();
    for (const product of products) {
      const raw = product.category.trim();
      if (!raw) continue;
      const entry = live.get(raw) ?? { omran: 0, popup: 0, canonical: canonicalCategory(raw)?.name ?? null };
      if (product.sourceBrand === "POPUP") entry.popup += 1;
      else entry.omran += 1;
      live.set(raw, entry);
    }
    const rows: CategoryRow[] = [...live.entries()]
      .map(([name, value]) => ({
        id: canonicalCategory(name)?.id ?? `raw:${name}`,
        name,
        canonical: value.canonical,
        omran: value.omran,
        popup: value.popup,
        aliases: 1,
      }))
      .sort((a, b) => b.omran + b.popup - (a.omran + a.popup));

    const unmapped = rows.filter(row => !row.canonical);
    const canonicalNames = new Set(rows.map(row => row.canonical).filter(Boolean));
    const mappedTaxonomy = VISIBLE_CATEGORIES.map(category => ({
      ...category,
      productCount: [...live.entries()]
        .filter(([raw]) => canonicalCategory(raw)?.id === category.id)
        .reduce((sum, [, v]) => sum + v.omran, 0),
    }));
    return { rows, unmapped, mappedTaxonomy, canonicalNames };
  }, [products]);

  const visibleRows = rows.filter(row =>
    brandFilter === "ALL" ? true : brandFilter === "OMRAN" ? row.omran > 0 : row.popup > 0
  );

  async function emitReorder() {
    const packet = categoryChangePacket(
      mappedTaxonomy.map(c => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, visible: c.visibility === "visible" })),
      actor
    );
    if (directWrite) {
      const result = await postAdminAction("category_reorder", {
        categories_json: JSON.stringify(mappedTaxonomy.map(c => ({ id: c.id, sortOrder: c.sortOrder }))),
        actor_id: actor.id,
      });
      if (!result.ok) downloadPacket(packet);
    } else {
      downloadPacket(packet);
    }
    emitAudit(actor, { action: "CATEGORY_REORDERED", targetType: "CATEGORY", targetId: "all", targetName: "كل الأقسام" });
    toast.success(directWrite ? "تم إرسال ترتيب الأقسام" : "تم تنزيل حزمة ترتيب الأقسام للصق في الشيت");
  }

  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: "name",
      header: "القسم في الكتالوج",
      render: row => (
        <div>
          <p className="font-extrabold text-brand-ink">{row.name}</p>
          {row.canonical && row.canonical !== row.name ? (
            <p className="text-[11px] font-bold text-brand-muted">يُطابق: {row.canonical}</p>
          ) : null}
        </div>
      ),
    },
    { key: "canonical", header: "الحالة", render: row => (row.canonical ? <Badge tone="green">مطابق للمعجم</Badge> : <Badge tone="amber">غير مطابق</Badge>) },
    { key: "omran", header: "منتجات Omran", render: row => <span className="tabular-nums font-bold">{row.omran}</span> },
    { key: "popup", header: "منتجات POP UP", render: row => <span className="tabular-nums font-bold">{row.popup}</span> },
    {
      key: "view",
      header: "عرض",
      render: () => (
        <Link
          href={`/products`}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-extrabold text-brand-blue hover:bg-brand-sky"
        >
          <Link2 size={14} /> منتجات
        </Link>
      ),
    },
  ];

  return (
    <AdminPageShell
      title="الأقسام"
      subtitle="التصنيفات المرجعية مقابل ما يرد فعليًا من الكتالوج"
      actions={
        <PermissionGate permission="category:reorder">
          <AdminButton variant="secondary" size="sm" onClick={emitReorder}>
            <ArrowUpDown size={15} /> إصدار حزمة ترتيب
          </AdminButton>
        </PermissionGate>
      }
    >
      <Toaster position="top-center" dir="rtl" richColors closeButton />
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="أقسام الكتالوج الفعلية"
                subtitle="مرتبطة بالتصنيفات المعتمدة عبر التطبيع والمرادفات"
                icon={<FolderTree size={18} />}
                action={
                  <div className="flex gap-1">
                    {(["OMRAN", "POPUP", "ALL"] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBrandFilter(value)}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${brandFilter === value ? "bg-brand-blue text-white" : "bg-brand-cream text-brand-navy hover:bg-brand-sky"}`}
                      >
                        {value === "OMRAN" ? "Omran" : value === "POPUP" ? "POP UP" : "الكل"}
                      </button>
                    ))}
                  </div>
                }
              />
              <DataTable columns={columns} rows={visibleRows} keyOf={row => row.name} pageSize={25} />
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader title="المعجم المعتمد" subtitle="التصنيفات المرجعية في النظام" />
                <ul className="max-h-80 divide-y divide-brand-border overflow-y-auto">
                  {mappedTaxonomy.map(category => (
                    <li key={category.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{category.name}</p>
                        <p className="truncate text-[11px] text-brand-muted">{category.description}</p>
                      </div>
                      <Badge tone={category.productCount > 0 ? "green" : "slate"}>{category.productCount} منتج</Badge>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader title="أقسام غير مطابقة" subtitle="تحتاج ربطًا أو مرادفًا" />
                <div className="p-5">
                  {unmapped.length === 0 ? (
                    <EmptyState title="كل الأقسام مطابقة" description="لا توجد أقسام واردة خارج المعجم." />
                  ) : (
                    <ul className="space-y-2">
                      {unmapped.map(row => (
                        <li key={row.name} className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                          <span className="truncate">{row.name}</span>
                          <span className="flex items-center gap-1"><BrandBadge brand="OMRAN" /> {row.omran}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <PermissionGate permission="category:update">
                    <p className="mt-3 text-[11px] leading-5 text-brand-muted">
                      لإضافة ربط: أضف الاسم إلى مرادفات القسم في shared/taxonomy ثم أصدِر حزمة التعديل للمراجعة.
                    </p>
                  </PermissionGate>
                </div>
              </Card>
            </div>
          </div>
          <div className="mt-4">
            <AdminButton variant="ghost" size="sm" onClick={async () => {
              const packet = categoryChangePacket([], actor);
              const ok = await copyPacket({ ...packet, rows: rows.map(r => [r.id, r.name, r.omran + r.popup, "", actor.name, new Date().toISOString()]), headers: ["id", "name", "product_count", "note", "changed_by", "changed_at"] });
              toast(ok ? "تم نسخ الأقسام" : "تعذّر النسخ — استخدم التنزيل");
            }}>
              <ClipboardCopy size={14} /> نسخ جدول الأقسام
            </AdminButton>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
