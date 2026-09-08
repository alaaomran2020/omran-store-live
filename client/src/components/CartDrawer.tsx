import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { whatsappNumber } from "@/lib/productFormat";
import {
  CART_UPDATED_EVENT,
  addProductToCart,
  buildCartWhatsAppMessage,
  cartItemsForCatalog,
  cartQuantity,
  clearCart,
  readCart,
  removeCartItem,
  setCartItemQuantity,
  type CartItem,
} from "@/lib/cart";
import type { ProductCatalog } from "@/lib/productCatalog";
import { trackEvent } from "@/lib/analytics";

function buildUrl(items: CartItem[], catalog: ProductCatalog): string | null {
  const number = whatsappNumber();
  const selected = cartItemsForCatalog(items, catalog);
  if (!number || selected.length === 0) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildCartWhatsAppMessage(items, catalog))}`;
}

export default function CartDrawer() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener(CART_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const total = cartQuantity(items);
  const toys = useMemo(() => cartItemsForCatalog(items, "toys"), [items]);
  const popup = useMemo(() => cartItemsForCatalog(items, "popup"), [items]);

  const refresh = (next: CartItem[]) => setItems(next);

  const sendCatalog = (catalog: ProductCatalog) => {
    const selected = cartItemsForCatalog(items, catalog);
    trackEvent("cart_whatsapp_click", {
      catalog,
      item_count: selected.length,
      quantity_total: cartQuantity(selected),
      cta_location: "cart_drawer",
      page_location: window.location.href,
    });
  };

  const renderGroup = (catalog: ProductCatalog, title: string, group: CartItem[]) => {
    if (group.length === 0) return null;
    const waUrl = buildUrl(items, catalog);

    return (
      <section className="space-y-3 rounded-2xl border border-brand-border bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-brand-navy">{title}</h3>
            <p className="mt-0.5 text-[11px] font-bold text-brand-muted">
              {group.length} منتج • {cartQuantity(group)} قطعة
            </p>
          </div>
          <button
            type="button"
            onClick={() => refresh(clearCart(catalog))}
            className="rounded-lg px-2 py-1 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
          >
            مسح القسم
          </button>
        </div>

        <div className="space-y-2">
          {group.map(item => (
            <article key={item.productId} className="flex gap-3 rounded-xl border border-brand-border/80 bg-brand-cream/35 p-2.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-white">
                {item.image ? (
                  <img src={item.image} alt="" className="h-full w-full object-contain p-1" loading="lazy" decoding="async" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-muted">
                    <ShoppingCart size={20} aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-xs font-extrabold leading-5 text-brand-ink">{item.name}</h4>
                <p className="mt-0.5 text-[10px] font-bold text-brand-muted" dir="ltr">
                  SKU: {item.sku || item.productId}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center overflow-hidden rounded-xl border border-brand-border bg-white">
                    <button
                      type="button"
                      aria-label={`تقليل كمية ${item.name}`}
                      onClick={() => refresh(setCartItemQuantity(item.productId, item.quantity - 1))}
                      className="flex h-9 w-9 items-center justify-center text-brand-navy transition hover:bg-brand-sky"
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span className="min-w-9 text-center text-sm font-black text-brand-ink" aria-label={`الكمية ${item.quantity}`}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`زيادة كمية ${item.name}`}
                      onClick={() => refresh(setCartItemQuantity(item.productId, item.quantity + 1))}
                      className="flex h-9 w-9 items-center justify-center text-brand-navy transition hover:bg-brand-sky"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-label={`حذف ${item.name} من السلة`}
                    onClick={() => refresh(removeCartItem(item.productId))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => sendCatalog(catalog)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/20"
          >
            <MessageCircle size={18} aria-hidden="true" />
            إرسال طلب {title} على واتساب
          </a>
        )}
      </section>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-brand-navy shadow-sm transition hover:bg-brand-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
        aria-label={`السلة${total ? `، ${total} قطعة` : ""}`}
      >
        <ShoppingCart size={19} aria-hidden="true" />
        <span className="hidden md:inline">السلة</span>
        {total > 0 && (
          <span className="absolute -left-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-blue px-1 text-[11px] font-black text-white shadow-sm">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="سلة المنتجات">
          <button type="button" aria-label="إغلاق السلة" className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-brand-cream shadow-2xl">
            <header className="flex items-center justify-between border-b border-brand-border bg-white px-4 py-4">
              <div>
                <h2 className="text-lg font-black text-brand-navy">سلة الاستفسار</h2>
                <p className="mt-0.5 text-xs font-bold text-brand-muted">راجع الكميات ثم ابعت الطلب على واتساب</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-navy transition hover:bg-brand-sky"
                aria-label="إغلاق"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {items.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border bg-white px-6 text-center">
                  <ShoppingCart size={34} className="text-brand-muted" aria-hidden="true" />
                  <h3 className="mt-3 text-base font-black text-brand-navy">السلة فاضية</h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-brand-muted">ضيف المنتجات اللي عاوز تستفسر عنها، وحدد الكمية من هنا.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {renderGroup("toys", "عمران تويز", toys)}
                  {renderGroup("popup", "POP UP", popup)}
                  {toys.length > 0 && popup.length > 0 && (
                    <p className="rounded-xl border border-brand-border bg-white px-3 py-2 text-[11px] font-bold leading-5 text-brand-muted">
                      حفاظًا على فصل الكتالوجين، طلب عمران تويز وطلب POP UP بيتبعتوا كل واحد برسالة مستقلة.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
