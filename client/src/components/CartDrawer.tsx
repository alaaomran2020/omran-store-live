import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import {
  CART_UPDATED_EVENT,
  buildCartWhatsAppUrl,
  cartItemCount,
  clearCart,
  readCart,
  removeCartItem,
  setCartItemQuantity,
  type CartItem,
} from "@/lib/cart";

export function CartDrawer() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(readCart());
    const sync = () => setItems(readCart());
    window.addEventListener(CART_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const totalCount = cartItemCount(items);
  const waUrl = useMemo(() => buildCartWhatsAppUrl(items), [items]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`فتح طلبك${totalCount ? ` — ${totalCount} قطعة` : ""}`}
        className="fixed bottom-5 left-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-navy px-4 py-3 text-sm font-extrabold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 sm:bottom-6 sm:left-6"
      >
        <ShoppingBag size={18} aria-hidden="true" />
        <span>طلبك</span>
        {totalCount > 0 && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-yellow px-1.5 py-0.5 text-xs font-black text-brand-navy">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] bg-brand-navy/60 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <aside
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="طلبك"
            className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-4 sm:px-5">
              <div>
                <p className="text-lg font-extrabold text-brand-navy">طلبك</p>
                <p className="mt-0.5 text-xs font-bold text-brand-muted">جهّز الكميات وبعدين ابعت الطلب على واتساب</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق الطلب"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-border text-brand-muted transition hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-brand-border bg-brand-cream p-7 text-center">
                  <ShoppingBag className="mx-auto text-brand-muted" size={34} aria-hidden="true" />
                  <p className="mt-3 text-base font-extrabold text-brand-navy">طلبك فاضي حاليًا</p>
                  <p className="mt-2 text-sm leading-7 text-brand-muted">أضف المنتجات اللي عايز تستفسر عنها، وبعدها ابعت الطلب كامل على واتساب.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <article key={item.lineId} className="rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
                      <div className="flex gap-3">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-brand-cream">
                          {item.image ? (
                            <img src={item.image} alt="" loading="lazy" decoding="async" width={160} height={160} className="h-full w-full object-contain" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-extrabold leading-6 text-brand-ink">{item.name}</p>
                          <p className="mt-1 text-[11px] font-bold text-brand-muted" dir="ltr">SKU: {item.sku || item.productId}</p>
                          {Object.keys(item.selections).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {Object.entries(item.selections).map(([name, value]) => (
                                <span key={name} className="rounded-full bg-brand-sky px-2 py-1 text-[10px] font-extrabold text-brand-navy">
                                  {name}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-brand-border pt-3">
                        <div className="inline-flex items-center rounded-xl border border-brand-border bg-brand-cream p-1">
                          <button
                            type="button"
                            onClick={() => setItems(setCartItemQuantity(item.lineId, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            aria-label={`تقليل كمية ${item.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-navy transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={15} aria-hidden="true" />
                          </button>
                          <span className="min-w-9 text-center text-sm font-black text-brand-navy" aria-label={`الكمية ${item.quantity}`}>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setItems(setCartItemQuantity(item.lineId, item.quantity + 1))}
                            aria-label={`زيادة كمية ${item.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-navy transition hover:bg-white"
                          >
                            <Plus size={15} aria-hidden="true" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setItems(removeCartItem(item.lineId))}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-brand-red transition hover:bg-red-50"
                        >
                          <Trash2 size={15} aria-hidden="true" /> حذف
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-brand-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
              {items.length > 0 && (
                <div className="mb-3 flex items-center justify-between text-sm font-extrabold text-brand-navy">
                  <span>إجمالي القطع</span>
                  <span>{totalCount}</span>
                </div>
              )}
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25"
                >
                  <MessageCircle size={18} aria-hidden="true" /> إرسال الطلب على واتساب
                </a>
              ) : (
                <button type="button" disabled className="min-h-12 w-full rounded-xl bg-brand-border px-4 py-3 text-sm font-extrabold text-brand-muted">
                  أضف منتجًا أولًا
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems(clearCart())}
                  className="mt-2 min-h-11 w-full rounded-xl text-xs font-extrabold text-brand-muted transition hover:bg-brand-cream hover:text-brand-red"
                >
                  مسح الطلب بالكامل
                </button>
              )}
              <p className="mt-2 text-center text-[11px] font-bold leading-5 text-brand-muted">السلة لتجهيز الاستفسار فقط؛ السعر والتوفر يتم تأكيدهما عبر واتساب.</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
