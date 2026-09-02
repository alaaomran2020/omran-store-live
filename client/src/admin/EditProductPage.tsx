/**
 * client/src/admin/EditProductPage.tsx — تعديل منتج واحد بحسب الصلاحيات.
 *
 * الحقول تُفعَّل/تُعطَّل حسب RBAC (UX فقط): الإنفاذ الحقيقي في الخادم —
 * أي حقل خارج صلاحيات المدير يُرفض بـ 403 حتى لو أُرسل يدويًا.
 * الحقول المعطَّلة تُستبعد من الحمولة المرسلة أصلًا.
 */
import { useCallback, useEffect, useState } from "react";
import type { Product } from "@shared/products";
import {
  editableFields,
  fetchAdminProduct,
  formatEGP,
  isSuperAdmin,
  patchAdminProduct,
} from "@/lib/adminApi";
import { useAdminSession } from "./AdminApp";
import { BrutalCard, Field, GhostButton, Notice, PageTitle, PrimaryButton, Spinner, TextArea, TextInput } from "./ui";

export default function EditProductPage({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: string) => void;
}) {
  const { session } = useAdminSession();
  const admin = session.admin;
  const perms = editableFields(admin);
  const superAdmin = isSuperAdmin(admin);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // قيم النموذج
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAdminProduct(id)
      .then(({ product: p }) => {
        if (!alive) return;
        setProduct(p);
        setName(p.name);
        setPrice(p.price != null ? String(p.price) : "");
        setDescription(p.description ?? "");
        setImage(p.imageSource ?? "");
        setActive(p.active);
      })
      .catch(err => {
        if (alive) setError(err instanceof Error ? err.message : "فشل تحميل المنتج");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const save = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (saving || !product) return;
      setSaving(true);
      setSaved(false);
      setError("");
      const fields: Record<string, unknown> = {};
      if (perms.name) fields.name = name;
      if (perms.price) fields.price = price.trim() === "" ? null : Number(price);
      if (perms.description) fields.description = description;
      if (perms.images) fields.image = image;
      if (perms.active) fields.active = active;
      try {
        const data = await patchAdminProduct(product.id, fields);
        setProduct(data.product);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل الحفظ");
      } finally {
        setSaving(false);
      }
    },
    [saving, product, perms, name, price, description, image, active]
  );

  if (loading) return <Spinner label="جارٍ تحميل المنتج…" />;

  if (!product) {
    return (
      <div>
        <PageTitle title="المنتج غير موجود" />
        <Notice kind="error" className="mb-4">{error || "لا يمكن عرض هذا المنتج"}</Notice>
        <GhostButton onClick={() => navigate("/admin/products")}>← العودة للمنتجات</GhostButton>
      </div>
    );
  }

  const lockedHint = (field: keyof typeof perms) =>
    perms[field] ? undefined : "لا تملك صلاحية تعديل هذا الحقل (RBAC)";

  return (
    <div className="max-w-2xl">
      <PageTitle
        title="تعديل المنتج"
        subtitle={`${product.id} · المصدر: Google Sheets (التعديلات تُحفظ كتجاوز في قاعدة البيانات)`}
      />

      <GhostButton className="mb-4" onClick={() => navigate("/admin/products")}>
        → العودة للمنتجات
      </GhostButton>

      {error ? <Notice kind="error" className="mb-4">{error}</Notice> : null}
      {saved ? (
        <Notice kind="success" className="mb-4">
          حُفظ التعديل بنجاح — يظهر للزوار خلال دقائق (مدة كاش الكتالوج).
        </Notice>
      ) : null}

      <form onSubmit={save} className="flex flex-col gap-5">
        <BrutalCard className="p-5">
          <div className="flex gap-5">
            <div className="shrink-0">
              {image ? (
                <img
                  src={image}
                  alt={name}
                  className="h-24 w-24 border-2 border-slate-700 object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center border-2 border-slate-800 font-mono text-[10px] text-slate-600">
                  بلا صورة
                </div>
              )}
            </div>
            <div className="flex-1">
              <Field label="اسم المنتج" hint={lockedHint("name")}>
                <TextInput
                  value={name}
                  disabled={!perms.name}
                  onChange={e => setName(e.target.value)}
                  placeholder="اسم المنتج"
                />
              </Field>
            </div>
          </div>
        </BrutalCard>

        <BrutalCard className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="السعر (ج.م)" hint={lockedHint("price")}>
              <TextInput
                dir="ltr"
                inputMode="decimal"
                value={price}
                disabled={!perms.price}
                onChange={e => setPrice(e.target.value)}
                placeholder={product.price != null ? String(product.price) : "السعر عند الطلب"}
              />
            </Field>
            <Field label="الحالة" hint={superAdmin ? "إظهار/إخفاء من المتجر" : "متاح للمدير العام فقط"}>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={!perms.active}
                  onClick={() => setActive(v => !v)}
                  className={`relative h-6 w-11 rounded-none border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? "border-emerald-500 bg-emerald-600" : "border-slate-600 bg-slate-800"
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className={`absolute top-0.5 h-3.5 w-3.5 bg-white transition-all ${
                      active ? "right-0.5" : "right-[calc(100%-1.125rem)]"
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-slate-300">
                  {active ? "معروض في المتجر" : "مخفي"}
                </span>
              </div>
            </Field>
          </div>
        </BrutalCard>

        <BrutalCard className="p-5">
          <div className="flex flex-col gap-4">
            <Field label="الوصف" hint={lockedHint("description")}>
              <TextArea
                value={description}
                disabled={!perms.description}
                onChange={e => setDescription(e.target.value)}
                placeholder="وصف المنتج"
              />
            </Field>
            <Field label="رابط الصورة" hint={lockedHint("images")}>
              <TextInput
                dir="ltr"
                value={image}
                disabled={!perms.images}
                onChange={e => setImage(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </BrutalCard>

        <div className="flex items-center justify-between">
          <GhostButton type="button" onClick={() => navigate("/admin/products")}>
            إلغاء
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "جارٍ الحفظ…" : "حفظ التعديل"}
          </PrimaryButton>
        </div>

        <p className="font-mono text-[10px] leading-relaxed text-slate-600">
          السعر المعروض: {formatEGP(product.price)}
        </p>
      </form>
    </div>
  );
}
