/**
 * محرّر/عارض منتج واحد — كل الحقول من الكتالوج الحقيقي.
 *
 * قنوات الحفظ (صادقة بلا حفظ وهمي في المتصفح):
 *   1. بوابة إجراءات مباشرة إن كانت VITE_ADMIN_ACTIONS_WEBHOOK_URL مفعّلة
 *      (تُنفّذ بصلاحيات الموظف وتتحقق من الهوية على الخادم).
 *   2. حزمة تعديل TSV موثّقة جاهزة للصق في الشيت الرئيسي (قناة التشغيل
 *      اليدوية المعتمدة حاليًا) مع سجل تدقيق.
 * لا يمكن للمحرر تجاوز بوابة النشر: النشر يتطلب PASS + PUBLISHED + active.
 */
import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { toast, Toaster } from "sonner";
import {
  ArrowRight,
  ClipboardCopy,
  Download,
  ExternalLink,
  Save,
  Send,
} from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Card,
  CardHeader,
  InfoBanner,
  LoadingState,
  PermissionGate,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/admin/components/primitives";
import { ConfirmDialog } from "@/admin/components/ConfirmDialog";
import {
  AvailabilityBadge,
  BrandBadge,
  QaBadge,
  VisibilityBadge,
  WorkflowBadge,
} from "@/admin/components/StatusBadges";
import { useAdminCatalog } from "@/admin/dataHooks";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { postAdminAction, adminActionsConfigured } from "@/lib/admin/adminGateway";
import { emitAudit } from "@/lib/admin/auditClient";
import {
  copyPacket,
  downloadPacket,
  productChangePacket,
} from "@/lib/admin/changePackets";
import { formatPrice } from "@/admin/adminFormat";
import type { AdminProduct } from "@/lib/admin/adminCatalog";
import type { QaStatus, WorkflowStatus } from "@shared/products";

type EditableDraft = {
  name: string;
  sku: string;
  category: string;
  description: string;
  price: string;
  availability: string;
  tags: string;
  active: boolean;
};

function draftFrom(product: AdminProduct): EditableDraft {
  return {
    name: product.name,
    sku: product.sku ?? "",
    category: product.category,
    description: product.description,
    price: product.price === null ? "" : String(product.price),
    availability: product.availability,
    tags: product.tags.join("، "),
    active: product.active,
  };
}

function diffDraft(product: AdminProduct, draft: EditableDraft): Record<string, string | number | boolean | null> {
  const changes: Record<string, string | number | boolean | null> = {};
  if (draft.name.trim() !== product.name) changes.name = draft.name.trim();
  if (draft.sku.trim() !== (product.sku ?? "")) changes.sku = draft.sku.trim();
  if (draft.category.trim() !== product.category) changes.category = draft.category.trim();
  if (draft.description.trim() !== product.description) changes.description = draft.description.trim();
  if (draft.availability !== product.availability) changes.availability = draft.availability;
  if (draft.tags.trim() !== product.tags.join("، ")) changes.tags = draft.tags.trim();
  if (draft.active !== product.active) changes.active = draft.active;
  if (draft.price.trim() !== "") {
    const numericPrice = Number(draft.price);
    if (Number.isFinite(numericPrice) && numericPrice >= 0 && numericPrice !== product.price) {
      changes.price = numericPrice;
    }
  } else if (product.price !== null) {
    changes.price = null;
  }
  return changes;
}

export default function ProductEditorPage() {
  const params = useParams();
  const productId = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const { products, isLoading } = useAdminCatalog();
  const { actor, can } = useAdminIdentity();

  const product = products.find(p => p.id === productId) ?? null;
  const [draft, setDraft] = useState<EditableDraft | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  useEffect(() => {
    if (product) setDraft(draftFrom(product));
  }, [productId, product === null]);

  const changes = product && draft ? diffDraft(product, draft) : {};
  const dirty = Object.keys(changes).length > 0;
  const directWrite = adminActionsConfigured();

  useEffect(() => {
    if (!product || !draft) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, product, draft]);

  if (isLoading) {
    return (
      <AdminPageShell title="المنتج">
        <LoadingState />
      </AdminPageShell>
    );
  }
  if (!product || !draft) {
    return (
      <AdminPageShell title="المنتج غير موجود">
        <Card className="p-8 text-center">
          <p className="mb-4 text-sm font-bold text-brand-muted">
            لا يوجد منتج بالمعرّف {productId} في الكتالوج الحالي.
          </p>
          <Link href="/products" className="text-sm font-extrabold text-brand-blue hover:underline">
            عودة للمنتجات
          </Link>
        </Card>
      </AdminPageShell>
    );
  }

  const set = <K extends keyof EditableDraft>(key: K, value: EditableDraft[K]) =>
    setDraft(d => (d ? { ...d, [key]: value } : d));

  const validationError = (() => {
    if (!draft.name.trim()) return "اسم المنتج مطلوب.";
    if (draft.price.trim() !== "" && (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0)) {
      return "السعر يجب أن يكون رقمًا موجبًا أو اتركه فارغًا (للاستفسار).";
    }
    if (draft.sku && /\s/.test(draft.sku)) return "SKU لا يحتوي مسافات.";
    return null;
  })();

  const handoffPacket = () =>
    productChangePacket(
      product,
      changes,
      actor,
      reason.trim() || "تعديل من لوحة الإدارة"
    );

  async function save() {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      if (directWrite) {
        const result = await postAdminAction("product_update", {
          product_id: product!.id,
          changes_json: JSON.stringify(changes),
          reason: reason.trim(),
          actor_id: actor.id,
        });
        if (result.ok) {
          emitAudit(actor, {
            action: "PRODUCT_UPDATED",
            targetType: "PRODUCT",
            targetId: product!.id,
            targetName: product!.name,
            metadata: { fields: Object.keys(changes).join(","), newStatus: draft!.active ? "active" : "hidden" },
          });
          toast.success("تم إرسال التعديل لبوابة التشغيل بنجاح");
          setReason("");
        } else {
          downloadPacket(handoffPacket());
          toast.warning("تعذّر الإرسال المباشر — تم تنزيل حزمة تعديل للصق اليدوي");
        }
      } else {
        downloadPacket(handoffPacket());
        emitAudit(actor, {
          action: "PRODUCT_UPDATED",
          targetType: "PRODUCT",
          targetId: product!.id,
          targetName: product!.name,
          metadata: { fields: Object.keys(changes).join(","), channel: "manual_packet" },
        });
        toast.success("تم إعداد حزمة التعديل للصق في الشيت الرئيسي");
      }
    } finally {
      setSaving(false);
    }
  }

  async function copyPacketToClipboard() {
    if (await copyPacket(handoffPacket())) toast.success("تم نسخ حزمة التعديل");
    else toast.error("تعذّر النسخ — استخدم زر التنزيل");
  }

  async function statusAction(nextWorkflow: WorkflowStatus, nextQa: QaStatus | null, action: "PRODUCT_PUBLISHED" | "PRODUCT_UNPUBLISHED" | "PRODUCT_ARCHIVED", label: string) {
    const target = product!;
    const fields: Record<string, string | null> = { workflow_status: nextWorkflow };
    if (nextQa !== null) fields.qa_status = nextQa;
    if (directWrite) {
      const result = await postAdminAction("product_status", {
        product_id: target.id,
        workflow_status: nextWorkflow,
        qa_status: nextQa ?? "",
        actor_id: actor.id,
      });
      if (!result.ok) {
        downloadPacket(productChangePacket(target, fields, actor, `تغيير حالة نشر: ${label}`));
        toast.warning("تعذّر الإرسال المباشر — تم تنزيل حزمة التغيير للصق اليدوي");
      } else {
        toast.success(label === "نشر" ? "تم اعتماد النشر عبر البوابة" : "تم تنفيذ تغيير الحالة");
      }
    } else {
      downloadPacket(productChangePacket(target, fields, actor, `تغيير حالة نشر: ${label}`));
      toast.success("حزمة تغيير الحالة جاهزة للصق في الشيت الرئيسي");
    }
    emitAudit(actor, {
      action,
      targetType: "PRODUCT",
      targetId: target.id,
      targetName: target.name,
      metadata: { newStatus: nextWorkflow },
    });
    setConfirmPublish(false);
  }

  const canEdit = can("product:update");

  return (
    <AdminPageShell
      title={product.name}
      subtitle={`${product.id}${product.sku ? ` · SKU ${product.sku}` : ""}`}
      actions={
        <Link
          href="/products"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-extrabold text-brand-navy hover:bg-brand-sky"
        >
          <ArrowRight size={16} /> رجوع
        </Link>
      }
    >
      <Toaster position="top-center" dir="rtl" richColors closeButton />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="البيانات الأساسية" subtitle="معلومات النشر" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <TextInput label="اسم المنتج" value={draft.name} disabled={!canEdit} onChange={e => set("name", e.target.value)} className="sm:col-span-2" />
              <TextInput label="SKU" value={draft.sku} disabled={!canEdit} onChange={e => set("sku", e.target.value)} />
              <TextInput label="القسم" value={draft.category} disabled={!canEdit} onChange={e => set("category", e.target.value)} />
              <TextInput label="السعر (ج.م) — اتركه فارغًا للاستفسار" inputMode="decimal" value={draft.price} disabled={!canEdit} onChange={e => set("price", e.target.value)} />
              <TextInput label="الوسوم (مفصولة بفاصلة)" value={draft.tags} disabled={!canEdit} onChange={e => set("tags", e.target.value)} />
              <TextAreaField label="الوصف" value={draft.description} disabled={!canEdit} onChange={e => set("description", e.target.value)} className="sm:col-span-2" />
            </div>
          </Card>

          <Card>
            <CardHeader title="الوسائط" subtitle="الصورة الحالية كما يقرأها الكتالوج" />
            <div className="flex flex-wrap items-center gap-4 p-5">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-36 w-36 rounded-xl border border-brand-border bg-brand-cream object-cover"
                  onError={e => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
                />
              ) : (
                <div className="grid h-36 w-36 place-items-center rounded-xl border-2 border-dashed border-brand-border text-center text-[11px] font-bold text-brand-disabled">
                  لا صورة
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2 text-xs font-semibold text-brand-muted">
                <p>جاهزية الصورة: {product.imageReadiness === "local" ? "أصل محلي معالَج" : product.imageReadiness === "drive" ? "رابط Google Drive خارجي" : "بدون صورة"}</p>
                <p className="break-all" dir="ltr">المعرّف في درايف: {product.sourceDriveId ?? "—"}</p>
                <PermissionGate permission="product:create">
                  <Link href="/product-intake" className="inline-flex text-sm font-extrabold text-brand-blue hover:underline">
                    رفع صورة جديدة عبر إدخال المنتج
                  </Link>
                </PermissionGate>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="التوفر والمخزون" subtitle="الحالة الموثّقة في المصدر" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <SelectField label="حالة التوفر" value={draft.availability} disabled={!can("inventory:update")} onChange={e => set("availability", e.target.value)}>
                <option value="unknown">بلا بيانات مخزون</option>
                <option value="available">متوفر</option>
                <option value="unavailable">نفد من المخزون</option>
                <option value="preorder">طلب مسبق</option>
              </SelectField>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-brand-border accent-brand-blue"
                    checked={draft.active}
                    disabled={!canEdit}
                    onChange={e => set("active", e.target.checked)}
                  />
                  المنتج ظاهر (active)
                </label>
              </div>
              <p className="text-[11px] leading-5 text-brand-muted sm:col-span-2">
                الكميات الرقمية وعتبة المخزون المنخفض غير موجودة في مصادر المتجر الحالية، لذلك لا تُعرض ولا تُقدَّر. فعّل ورقة مخزون موثوقة لإتاحة تحديث الكميات.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="حالات التشغيل" subtitle="بوابة النشر الثلاثية" />
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between"><span className="font-bold">النشر</span><WorkflowBadge status={product.workflowStatus} /></div>
              <div className="flex items-center justify-between"><span className="font-bold">الجودة</span><QaBadge status={product.qaStatus} /></div>
              <div className="flex items-center justify-between"><span className="font-bold">الظهور</span><VisibilityBadge product={product} /></div>
              <div className="flex items-center justify-between"><span className="font-bold">التوفر</span><AvailabilityBadge availability={product.availability} /></div>
              <div className="flex items-center justify-between"><span className="font-bold">المصدر</span><BrandBadge brand={product.sourceBrand} /></div>
              <div className="flex items-center justify-between"><span className="font-bold">السعر الحالي</span><span className="font-extrabold">{formatPrice(product.price)}</span></div>
              {product.reviewReason ? (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">
                  سبب عدم النشر الموثّق: {product.reviewReason}
                </div>
              ) : null}
            </div>
          </Card>

          {canEdit ? (
            <Card>
              <CardHeader title="حفظ التعديلات" subtitle={directWrite ? "البوابة المباشرة مفعّلة" : "القناة اليدوية المعتمدة حاليًا"} />
              <div className="space-y-3 p-5">
                {validationError ? <InfoBanner tone="warning">{validationError}</InfoBanner> : null}
                <TextAreaField label="سبب التعديل (للمراجعة والتدقيق)" value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: تصحيح السعر من المصدر" />
                <div className="rounded-xl bg-brand-cream p-3 text-[11px] leading-5 text-brand-muted">
                  {dirty
                    ? `الحقول المعدّلة: ${Object.keys(changes).join("، ")}`
                    : "لا تعديلات غير محفوظة."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminButton onClick={save} loading={saving} disabled={!dirty}>
                    {directWrite ? <Save size={16} /> : <Send size={16} />}
                    {directWrite ? "حفظ عبر البوابة" : "إصدار حزمة تعديل"}
                  </AdminButton>
                  <AdminButton variant="secondary" size="sm" onClick={copyPacketToClipboard} disabled={!dirty}>
                    <ClipboardCopy size={15} /> نسخ
                  </AdminButton>
                  <AdminButton variant="ghost" size="sm" onClick={() => downloadPacket(handoffPacket())} disabled={!dirty}>
                    <Download size={15} /> تنزيل TSV
                  </AdminButton>
                </div>
              </div>
            </Card>
          ) : (
            <InfoBanner>دورك يسمح بالعرض فقط. التعديل مخصص لمسؤول الكتالوج أو المالك.</InfoBanner>
          )}

          <Card>
            <CardHeader title="إجراءات النشر" />
            <div className="space-y-2 p-5">
              <PermissionGate permission="product:publish">
                {product.workflowStatus !== "PUBLISHED" || product.qaStatus !== "PASS" ? (
                  <AdminButton variant="success" className="w-full" onClick={() => setConfirmPublish(true)}>
                    اعتماد ونشر
                  </AdminButton>
                ) : (
                  <AdminButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => statusAction("REVIEW", "NEEDS_REVIEW", "PRODUCT_UNPUBLISHED", "سحب للمراجعة")}
                  >
                    سحب من النشر للمراجعة
                  </AdminButton>
                )}
              </PermissionGate>
              <PermissionGate permission="product:archive">
                <AdminButton
                  variant="danger"
                  className="w-full"
                  onClick={() => statusAction("DRAFT", null, "PRODUCT_ARCHIVED", "أرشفة")}
                >
                  أرشفة المنتج
                </AdminButton>
              </PermissionGate>
              <a
                href={`/products?focus=${encodeURIComponent(product.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border px-4 py-2.5 text-sm font-extrabold text-brand-navy hover:bg-brand-sky"
              >
                <ExternalLink size={15} /> معاينة في المتجر
              </a>
              <p className="pt-1 text-[11px] leading-5 text-brand-muted">
                النشر لا يتجاوز البوابة: PUBLISHED + PASS + active فقط يصل للجمهور، ويمكن سحب منتج لكن لا يمكن نشر منتج راسب آليًا.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {confirmPublish ? (
        <ConfirmDialog
          title="اعتماد ونشر المنتج"
          description="تأكيد النشر يصدر حزمة/إجراء بحالة PUBLISHED و PASS. هل تمت المراجعة البصرية للصورة والبيانات؟"
          confirmLabel="نعم، اعتمد وانشر"
          onConfirm={() => statusAction("PUBLISHED", "PASS", "PRODUCT_PUBLISHED", "نشر")}
          onCancel={() => setConfirmPublish(false)}
        />
      ) : null}
    </AdminPageShell>
  );
}
