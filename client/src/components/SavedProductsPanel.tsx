import { useEffect, useMemo, useState } from "react";
import { Heart, Scale, Trash2, X } from "lucide-react";
import {
  SAVED_PRODUCTS_OPEN_EVENT,
  SAVED_PRODUCTS_UPDATED_EVENT,
  clearCompare,
  clearWishlist,
  readCompare,
  readWishlist,
  removeCompare,
  removeWishlist,
  savedProductUrl,
  type SavedProduct,
} from "@/lib/savedProducts";

type SavedView = "wishlist" | "compare";

const availabilityLabel: Record<SavedProduct["availability"], string> = {
  available: "متاح",
  unavailable: "غير متاح",
  preorder: "طلب مسبق",
  unknown: "غير محدد",
};

function catalogLabel(item: SavedProduct) {
  return item.catalog === "popup" ? "POP UP" : "عمران تويز";
}

export function SavedProductsPanel() {
  const [wishlist, setWishlist] = useState<SavedProduct[]>([]);
  const [compare, setCompare] = useState<SavedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SavedView>("wishlist");

  useEffect(() => {
    const sync = () => {
      setWishlist(readWishlist());
      setCompare(readCompare());
    };
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ view?: SavedView }>).detail;
      sync();
      setView(detail?.view === "compare" ? "compare" : "wishlist");
      setOpen(true);
    };
    sync();
    window.addEventListener(SAVED_PRODUCTS_UPDATED_EVENT, sync);
    window.addEventListener(SAVED_PRODUCTS_OPEN_EVENT, handleOpen);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_PRODUCTS_UPDATED_EVENT, sync);
      window.removeEventListener(SAVED_PRODUCTS_OPEN_EVENT, handleOpen);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const compareCatalog = compare[0]?.catalog ?? null;
  const compareRows = useMemo(() => [
    ["الكود", (item: SavedProduct) => item.sku || item.productId],
    ["القسم", (item: SavedProduct) => item.category || "—"],
    ["الماركة", (item: SavedProduct) => item.brand || "—"],
    ["التوفر", (item: SavedProduct) => availabilityLabel[item.availability]],
    ["العمر", (item: SavedProduct) => item.ageMin !== null && item.ageMax !== null ? `${item.ageMin}–${item.ageMax} سنة` : "—"],
    ["الخامة", (item: SavedProduct) => item.material || "—"],
    ["عدد القطع", (item: SavedProduct) => item.piecesCount !== null ? String(item.piecesCount) : "—"],
    ["المقاسات", (item: SavedProduct) => item.dimensions || "—"],
  ] as const, []);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[90] bg-brand-navy/60 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <section dir="rtl" role="dialog" aria-modal="true" aria-label={view === "wishlist" ? "المفضلة" : "مقارنة المنتجات"}
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[1.5rem] bg-white shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-2xl sm:rounded-none"
            onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-4 sm:px-5">
              <div>
                <p className="text-lg font-extrabold text-brand-navy">{view === "wishlist" ? "المفضلة" : "مقارنة المنتجات"}</p>
                <p className="mt-0.5 text-xs font-bold text-brand-muted">محفوظة على الجهاز ده فقط — بدون حساب أو تسجيل دخول</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-border text-brand-muted hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-brand-border p-3 sm:p-4">
              <button type="button" onClick={() => setView("wishlist")} aria-pressed={view === "wishlist"} className={`min-h-11 rounded-xl text-sm font-extrabold ${view === "wishlist" ? "bg-brand-navy text-white" : "bg-brand-cream text-brand-navy"}`}>
                المفضلة ({wishlist.length})
              </button>
              <button type="button" onClick={() => setView("compare")} aria-pressed={view === "compare"} className={`min-h-11 rounded-xl text-sm font-extrabold ${view === "compare" ? "bg-brand-blue text-white" : "bg-brand-cream text-brand-navy"}`}>
                المقارنة ({compare.length}/3)
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
              {view === "wishlist" ? (
                wishlist.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-brand-border bg-brand-cream p-8 text-center">
                    <Heart className="mx-auto text-brand-muted" size={34} />
                    <p className="mt-3 font-extrabold text-brand-navy">المفضلة فاضية</p>
                    <p className="mt-2 text-sm leading-7 text-brand-muted">احفظ المنتجات اللي عايز ترجع لها بعدين من كارت المنتج أو صفحة التفاصيل.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wishlist.map(item => (
                      <article key={item.productId} className="flex gap-3 rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-brand-cream">
                          {item.image && <img src={item.image} alt="" loading="lazy" decoding="async" width={160} height={160} className="h-full w-full object-contain" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-extrabold text-brand-ink">{item.name}</p>
                              <p className="mt-1 text-[11px] font-bold text-brand-muted">{catalogLabel(item)} · {item.category || "بدون تصنيف"}</p>
                            </div>
                            <button type="button" onClick={() => setWishlist(removeWishlist(item.productId))} aria-label={`حذف ${item.name} من المفضلة`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-red hover:bg-red-50"><Trash2 size={15} /></button>
                          </div>
                          <a href={savedProductUrl(item)} className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-brand-sky px-3 text-xs font-extrabold text-brand-blue">عرض المنتج</a>
                        </div>
                      </article>
                    ))}
                    <button type="button" onClick={() => setWishlist(clearWishlist())} className="min-h-11 w-full rounded-xl text-xs font-extrabold text-brand-muted hover:bg-red-50 hover:text-brand-red">مسح المفضلة</button>
                  </div>
                )
              ) : compare.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-brand-border bg-brand-cream p-8 text-center">
                  <Scale className="mx-auto text-brand-muted" size={34} />
                  <p className="mt-3 font-extrabold text-brand-navy">مفيش منتجات للمقارنة</p>
                  <p className="mt-2 text-sm leading-7 text-brand-muted">اختار لحد 3 منتجات من نفس القسم. عمران تويز وPOP UP يفضلوا منفصلين في المقارنة.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-3 rounded-xl bg-brand-sky px-3 py-2 text-xs font-extrabold text-brand-navy">المقارنة الحالية: {compareCatalog === "popup" ? "POP UP" : "عمران تويز"}</div>
                  <div className="overflow-x-auto rounded-2xl border border-brand-border">
                    <table className="min-w-[620px] w-full border-collapse text-right text-xs">
                      <thead>
                        <tr className="bg-brand-cream">
                          <th className="w-28 border-b border-brand-border p-3 text-brand-muted">البيان</th>
                          {compare.map(item => (
                            <th key={item.productId} className="min-w-40 border-b border-brand-border p-3 align-top">
                              <p className="line-clamp-2 font-extrabold text-brand-navy">{item.name}</p>
                              <button type="button" onClick={() => setCompare(removeCompare(item.productId))} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-red"><Trash2 size={13} /> حذف</button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareRows.map(([label, value]) => (
                          <tr key={label} className="border-b border-brand-border last:border-0">
                            <th className="p-3 font-extrabold text-brand-muted">{label}</th>
                            {compare.map(item => <td key={item.productId} className="p-3 font-bold text-brand-ink">{value(item)}</td>)}
                          </tr>
                        ))}
                        <tr>
                          <th className="p-3 font-extrabold text-brand-muted">المنتج</th>
                          {compare.map(item => <td key={item.productId} className="p-3"><a href={savedProductUrl(item)} className="inline-flex min-h-9 items-center rounded-lg bg-brand-sky px-3 font-extrabold text-brand-blue">عرض التفاصيل</a></td>)}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={() => setCompare(clearCompare())} className="mt-3 min-h-11 w-full rounded-xl text-xs font-extrabold text-brand-muted hover:bg-red-50 hover:text-brand-red">مسح المقارنة</button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
