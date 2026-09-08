import { useEffect, useState } from "react";
import { Heart, Trash2, X } from "lucide-react";
import {
  SAVED_PRODUCTS_OPEN_EVENT,
  SAVED_PRODUCTS_UPDATED_EVENT,
  clearWishlist,
  readWishlist,
  removeWishlist,
  savedProductUrl,
  type SavedProduct,
} from "@/lib/savedProducts";

function catalogLabel(item: SavedProduct) {
  return item.catalog === "popup" ? "POP UP" : "عمران تويز";
}

export function SavedProductsPanel() {
  const [wishlist, setWishlist] = useState<SavedProduct[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setWishlist(readWishlist());
    const handleOpen = () => {
      sync();
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-brand-navy/60 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="المفضلة"
        className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[1.5rem] bg-white shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md sm:rounded-none"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-4 sm:px-5">
          <div>
            <p className="text-lg font-extrabold text-brand-navy">المفضلة</p>
            <p className="mt-0.5 text-xs font-bold text-brand-muted">محفوظة على الجهاز ده فقط — بدون حساب أو تسجيل دخول</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق المفضلة"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-border text-brand-muted hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          {wishlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-border bg-brand-cream p-8 text-center">
              <Heart className="mx-auto text-brand-muted" size={34} aria-hidden="true" />
              <p className="mt-3 font-extrabold text-brand-navy">المفضلة فاضية</p>
              <p className="mt-2 text-sm leading-7 text-brand-muted">احفظ المنتجات اللي عايز ترجع لها بعدين من كارت المنتج.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlist.map(item => (
                <article key={item.productId} className="flex gap-3 rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-brand-cream">
                    {item.image && (
                      <img src={item.image} alt="" loading="lazy" decoding="async" width={160} height={160} className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-extrabold text-brand-ink">{item.name}</p>
                        <p className="mt-1 text-[11px] font-bold text-brand-muted">{catalogLabel(item)} · {item.category || "بدون تصنيف"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWishlist(removeWishlist(item.productId))}
                        aria-label={`حذف ${item.name} من المفضلة`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-red hover:bg-red-50"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <a href={savedProductUrl(item)} className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-brand-sky px-3 text-xs font-extrabold text-brand-blue">
                      عرض المنتج
                    </a>
                  </div>
                </article>
              ))}
              <button
                type="button"
                onClick={() => setWishlist(clearWishlist())}
                className="min-h-11 w-full rounded-xl text-xs font-extrabold text-brand-muted hover:bg-red-50 hover:text-brand-red"
              >
                مسح المفضلة
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
