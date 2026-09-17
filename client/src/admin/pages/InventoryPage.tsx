/**
 * إدارة المخزون — تعرض فقط ما توثّقه المصادر:
 *   - متوفر / نفد / طلب مسبق مشتقة من عمود availability الحقيقي.
 *   - "بلا بيانات" لمن لا يوثّق توفره (لا يُفترض أنه متوفر!).
 * الكميات والعتبات الرقمية تُقرأ من عقد inventory الحي فقط؛ القيم غير الموثقة
 * تظل null ولا يتم تقديرها أو الرجوع إلى TSV/Sheets كقناة تشغيل.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast, Toaster } from "sonner";
import { Save, Warehouse } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  FilterSelect,
  LoadingState,
  MetricCard,
  PermissionGate,
  SearchField,
} from "@/admin/components/primitives";
import { AvailabilityBadge } from "@/admin/components/StatusBadges";
import { useDebouncedProducts } from "@/admin/hooks/useDebouncedProducts";
import { useAdminCatalog, useInventory } from "@/admin/dataHooks";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { postAdminAction, type InventoryRecord } from "@/lib/admin/adminGateway";
import { emitAudit } from "@/lib/admin/auditClient";
import type { AdminAvailability, AdminProduct } from "@/lib/admin/adminCatalog";

const OPTIONS: { value: AdminAvailability; label: string }[] = [
  { value: "available", label: "متوفر" },
  { value: "unavailable", label: "نفد من المخزون" },
  { value: "preorder", label: "طلب مسبق" },
];

export default function InventoryPage() {
  const { products, isLoading } = useAdminCatalog();
  const inventoryQuery = useInventory();
  const inventoryRows = inventoryQuery.data?.status === "live" ? inventoryQuery.data.data : [];
  const inventoryByProduct = useMemo(() => new Map(inventoryRows.map(row => [row.productId, row])), [inventoryRows]);
  const { filtered, search, setSearch, filter, setFilter } = useDebouncedProducts(products);
  const { actor } = useAdminIdentity();
  const [edits, setEdits] = useState<Record<string, AdminAvailability>>({});

  const counts = useMemo(
    () => ({
      available: inventoryRows.filter(row => row.inventoryStatus === "IN_STOCK" || row.inventoryStatus === "LOW_STOCK").length,
      unavailable: inventoryRows.filter(row => row.inventoryStatus === "OUT_OF_STOCK").length,
      preorder: 0,
      unknown: inventoryRows.filter(row => row.inventoryStatus === "UNKNOWN" || row.inventoryStatus === "DISCONTINUED").length,
    }),
    [inventoryRows]
  );

  if (isLoading || inventoryQuery.isLoading) {
    return (
      <AdminPageShell title="المخزون">
        <LoadingState />
      </AdminPageShell>
    );
  }

  const statusFromInventory = (record: InventoryRecord | undefined): AdminAvailability => {
    if (!record) return "unknown";
    if (record.inventoryStatus === "IN_STOCK" || record.inventoryStatus === "LOW_STOCK") return "available";
    if (record.inventoryStatus === "OUT_OF_STOCK") return "unavailable";
    return "unknown";
  };
  const effectiveStatus = (product: AdminProduct): AdminAvailability =>
    edits[product.id] ?? statusFromInventory(inventoryByProduct.get(product.id));
  const rows = filtered.filter(p => (filter === "ALL" ? true : effectiveStatus(p) === filter));
  const editedCount = Object.keys(edits).length;

  async function applyEdits() {
    const changes = Object.entries(edits).map(([id, availability]) => ({
      id,
      availability,
      availableQty: inventoryByProduct.get(id)?.availableQty ?? null,
      lowStockThreshold: inventoryByProduct.get(id)?.lowStockThreshold ?? null,
    }));
    const result = await postAdminAction("inventory_update", {
      changes_json: JSON.stringify(changes),
      actor_id: actor.id,
    });
    if (!result.ok) {
      toast.error(`فشل حفظ المخزون على البوابة الحية: ${result.message}`);
      return;
    }
    emitAudit(actor, {
      action: "INVENTORY_UPDATED",
      targetType: "INVENTORY",
      targetId: `batch-${editedCount}`,
      targetName: `${editedCount} منتج`,
      metadata: { updatedCount: editedCount, channel: "live_gateway" },
    });
    toast.success("تم حفظ تحديث المخزون على البوابة الحية");
    setEdits({});
    await inventoryQuery.refetch();
  }

  return (
    <AdminPageShell
      title="المخزون"
      subtitle="حالات التوفر الموثّقة فقط — بلا كميات أو مخزون منخفض مخترع"
      actions={
        <PermissionGate permission="inventory:update">
          <AdminButton size="sm" disabled={editedCount === 0} onClick={applyEdits}>
            <Save size={15} /> اعتماد التعديلات ({editedCount})
          </AdminButton>
        </PermissionGate>
      }
    >
      <Toaster position="top-center" dir="rtl" richColors closeButton />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="متوفر" value={counts.available} icon={<Warehouse size={18} />} tone="green" />
        <MetricCard label="نفد من المخزون" value={counts.unavailable} icon={<Warehouse size={18} />} tone="red" />
        <MetricCard label="طلب مسبق" value={counts.preorder} icon={<Warehouse size={18} />} tone="purple" />
        <MetricCard label="بلا بيانات مخزون" value={counts.unknown} icon={<Warehouse size={18} />} tone="amber" />
      </section>

      <Card className="mt-5">
        <CardHeader
          title="حالة المنتجات"
          subtitle="غياب بيانات الكميات يعني أن 'مخزون منخفض' و'الكمية المتبقية' غير متاحين حاليًا"
        />
        <div className="p-4">
          {inventoryQuery.data?.status !== "live" ? (
            <EmptyState
              tone="warning"
              title="المخزون الحي غير متاح"
              description="تعذّر قراءة inventory من البوابة الحية. لا توجد عودة تلقائية إلى TSV أو الشيتات كقناة تشغيل."
            />
          ) : null}
          <div className="grid grid-cols-1 gap-3 pb-4 md:grid-cols-3">
            <SearchField value={search} onChange={setSearch} placeholder="ابحث عن منتج…" className="md:col-span-2" label="بحث مخزون" />
            <FilterSelect
              label="حالة التوفر"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "ALL", label: "كل الحالات" },
                { value: "available", label: "متوفر" },
                { value: "unavailable", label: "نفد" },
                { value: "preorder", label: "طلب مسبق" },
                { value: "unknown", label: "بلا بيانات" },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-brand-border text-right text-[11px] font-black uppercase text-brand-muted">
                  <th className="px-4 py-3">المنتج</th>
                  <th className="px-4 py-3">الحالة الحالية</th>
                  <th className="px-4 py-3">الكمية</th>
                  <PermissionGate permission="inventory:update">
                    <th className="px-4 py-3">تحديث سريع</th>
                  </PermissionGate>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map(product => (
                  <tr key={`${product.sourceBrand}:${product.id}`} className="border-b border-brand-border/70 last:border-0 hover:bg-brand-cream/70">
                    <td className="px-4 py-3">
                      <Link href={`/products/${encodeURIComponent(product.id)}`} className="font-extrabold text-brand-navy hover:underline">
                        {product.name}
                      </Link>
                      <p dir="ltr" className="text-[10px] font-bold text-brand-disabled">{product.id}</p>
                    </td>
                    <td className="px-4 py-3"><AvailabilityBadge availability={effectiveStatus(product)} /></td>
                    <td className="px-4 py-3 text-xs font-bold tabular-nums text-brand-muted">
                      {inventoryByProduct.get(product.id)?.onHandQty ?? "—"}
                      {inventoryByProduct.get(product.id)?.availableQty !== null && inventoryByProduct.get(product.id)?.availableQty !== undefined
                        ? ` / متاح ${inventoryByProduct.get(product.id)?.availableQty}`
                        : ""}
                    </td>
                    <PermissionGate permission="inventory:update">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {OPTIONS.map(option => {
                            const selected = effectiveStatus(product) === option.value;
                            const changed = edits[product.id] !== undefined;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setEdits(prev => ({ ...prev, [product.id]: option.value }))}
                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition ${selected ? "bg-brand-blue text-white" : "border border-brand-border bg-white text-brand-navy hover:bg-brand-sky"}`}
                              >
                                {option.label}
                                {changed && selected ? " •" : ""}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </PermissionGate>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 ? (
              <p className="px-4 py-3 text-center text-xs font-bold text-brand-muted">
                عرض أول 100 منتج مطابق — استخدم البحث للوصول للباقي ({rows.length} إجمالاً).
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-muted">
        <Badge tone="green">Live</Badge>
        <span>الكمية والعتبات تُقرأ من عقد inventory الحي فقط. لا يوجد fallback تشغيلي إلى TSV/Sheets.</span>
      </div>
    </AdminPageShell>
  );
}
