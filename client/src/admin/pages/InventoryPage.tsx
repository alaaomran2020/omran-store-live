/**
 * إدارة المخزون — تعرض فقط ما توثّقه المصادر:
 *   - متوفر / نفد / طلب مسبق مشتقة من عمود availability الحقيقي.
 *   - "بلا بيانات" لمن لا يوثّق توفره (لا يُفترض أنه متوفر!).
 * لا توجد كميات رقمية ولا عتبات مخزون منخفض في أي مصدر حالي، لذلك تظهر
 * الحالة صراحةً بدل اختراع أرقام، مع قناة تحديث موثّقة (بوابة/حزمة TSV).
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast, Toaster } from "sonner";
import { Download, Save, Warehouse } from "lucide-react";
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
import { useAdminCatalog, useEgyptSystemInventory } from "@/admin/dataHooks";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { adminActionsConfigured, postAdminAction } from "@/lib/admin/adminGateway";
import { inventoryChangePacket, downloadPacket } from "@/lib/admin/changePackets";
import { emitAudit } from "@/lib/admin/auditClient";
import type { AdminAvailability, AdminProduct } from "@/lib/admin/adminCatalog";
import { reconcileEgyptProduct } from "@/lib/admin/egyptSystemInventory";

const OPTIONS: { value: AdminAvailability; label: string }[] = [
  { value: "available", label: "متوفر" },
  { value: "unavailable", label: "نفد من المخزون" },
  { value: "preorder", label: "طلب مسبق" },
];

export default function InventoryPage() {
  const { products, isLoading } = useAdminCatalog();
  const egyptInventory = useEgyptSystemInventory();
  const { filtered, search, setSearch, filter, setFilter } = useDebouncedProducts(products);
  const { actor } = useAdminIdentity();
  const [edits, setEdits] = useState<Record<string, AdminAvailability>>({});
  const directWrite = adminActionsConfigured();

  const counts = useMemo(
    () => ({
      available: products.filter(p => p.availability === "available").length,
      unavailable: products.filter(p => p.availability === "unavailable").length,
      preorder: products.filter(p => p.availability === "preorder").length,
      unknown: products.filter(p => p.availability === "unknown").length,
    }),
    [products]
  );

  if (isLoading) {
    return (
      <AdminPageShell title="المخزون">
        <LoadingState />
      </AdminPageShell>
    );
  }

  const rows = filtered.filter(p => (filter === "ALL" ? true : p.availability === filter));
  const effectiveStatus = (product: AdminProduct): AdminAvailability => edits[product.id] ?? product.availability;
  const editedCount = Object.keys(edits).length;
  const egyptFor = (productId: string) => reconcileEgyptProduct(egyptInventory.data, productId);

  async function applyEdits() {
    const changes = Object.entries(edits).map(([id, availability]) => ({ id, availability, availableQty: null, lowStockThreshold: null }));
    if (directWrite) {
      const result = await postAdminAction("inventory_update", { changes_json: JSON.stringify(changes), actor_id: actor.id });
      if (!result.ok) {
        downloadPacket(inventoryChangePacket(changes, actor));
        toast.warning("تعذّر الإرسال المباشر — تم تنزيل حزمة المخزون للصق اليدوي");
      } else {
        toast.success("تم إرسال تحديث المخزون");
      }
    } else {
      downloadPacket(inventoryChangePacket(changes, actor));
      toast.success("حزمة تحديث المخزون جاهزة للصق في الشيت الرئيسي");
    }
    emitAudit(actor, {
      action: "INVENTORY_UPDATED",
      targetType: "INVENTORY",
      targetId: `batch-${editedCount}`,
      targetName: `${editedCount} منتج`,
      metadata: { updatedCount: editedCount },
    });
    setEdits({});
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

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs font-bold">
          <div>
            <p className="font-extrabold text-brand-navy">مصدر الجرد: Egypt System / ESStores</p>
            <p className="mt-1 text-brand-muted">
              {egyptInventory.data?.status === "READY"
                ? `لقطة موثّقة: ${egyptInventory.data.generated_at ?? "بدون وقت"}`
                : "عقد الربط جاهز — في انتظار تصدير SQL الموثّق من جهاز العمل"}
            </p>
          </div>
          <Badge tone={egyptInventory.data?.status === "READY" ? "green" : "amber"}>
            {egyptInventory.data?.status === "READY" ? "متصل بلقطة موثّقة" : "بانتظار التصدير"}
          </Badge>
        </div>
      </Card>

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
          {counts.unknown === products.length ? (
            <EmptyState
              tone="warning"
              title="لا توجد بيانات توفر رقمية/صرحية في الكتالوج"
              description="الكميات تُحفظ في الشيت الرئيسي. فعّل عمود availability أو أوراق المخزون المرتبطة، أو حدّث الحالات يدويًا هنا لإصدار حزمة اعتماد — لا تُعرض أرقام مخزون تقديرية أبدًا."
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
                      <Link href={`/products?product=${encodeURIComponent(product.id)}`} className="font-extrabold text-brand-navy hover:underline">
                        {product.name}
                      </Link>
                      <p dir="ltr" className="text-[10px] font-bold text-brand-disabled">{product.id}</p>
                    </td>
                    <td className="px-4 py-3"><AvailabilityBadge availability={effectiveStatus(product)} /></td>
                    <td className="px-4 py-3 text-xs font-bold text-brand-disabled">
                      {(() => {
                        const egypt = egyptFor(product.id);
                        if (egypt?.isVerified && egypt.onHandQty !== null) {
                          return (
                            <span className="font-extrabold text-brand-navy">
                              {egypt.onHandQty} <span className="text-[10px] text-brand-muted">— {egypt.mapping.store_name_ar}</span>
                            </span>
                          );
                        }
                        if (egypt?.mapping.match_status === "CANDIDATE") {
                          return (
                            <span title={egypt.mapping.note} className="text-brand-muted">
                              مطابقة مرشحة مع Egypt System — تحتاج تأكيد العبوة/الباركود
                            </span>
                          );
                        }
                        return "غير موثّقة رقميًا";
                      })()}
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
        <Badge tone="slate">تشغيلي</Badge>
        <span>
          العتبات الرقمية للأسهم المنخفض وكميات إعادة الطلب تتطلب ورقة مخزون موثوقة — راجع{" "}
          <Link href="/admin/settings" className="font-extrabold text-brand-blue hover:underline">الإعدادات</Link> لحالة المصدر.
        </span>
        <Download size={13} className="opacity-0" aria-hidden="true" />
      </div>
    </AdminPageShell>
  );
}
