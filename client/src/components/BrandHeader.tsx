import { useEffect, useState } from "react";
import { Heart, MessageCircle, ShoppingBag } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { CART_UPDATED_EVENT, cartItemCount, openCartDrawer, readCart } from "@/lib/cart";
import { SAVED_PRODUCTS_UPDATED_EVENT, openSavedProducts, readWishlist } from "@/lib/savedProducts";
import { whatsappNumber } from "@/lib/productFormat";

const whatsappUrl = (() => {
  const number = whatsappNumber();
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات شركة عمران التجارية.")}`;
})();

export default function BrandHeader() {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const syncCart = () => setCartCount(cartItemCount(readCart()));
    const syncWishlist = () => setWishlistCount(readWishlist().length);

    syncCart();
    syncWishlist();

    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener(SAVED_PRODUCTS_UPDATED_EVENT, syncWishlist);
    window.addEventListener("storage", syncCart);
    window.addEventListener("storage", syncWishlist);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener(SAVED_PRODUCTS_UPDATED_EVENT, syncWishlist);
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("storage", syncWishlist);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border/80 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="container flex min-h-[76px] items-center justify-between gap-2 py-2 sm:min-h-[88px] sm:gap-5">
        <a href="/" className="group flex min-w-0 items-center gap-2 sm:gap-4" aria-label="شركة عمران التجارية - الصفحة الرئيسية">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm ring-1 ring-black/[0.02] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md sm:h-16 sm:w-16">
            <img
              src="/brand/logo.png"
              alt="لوجو عمران"
              className="h-full w-full object-contain p-1.5"
              loading="eager"
              decoding="async"
            />
          </span>

          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[12px] font-black leading-tight tracking-[-0.02em] text-brand-navy min-[390px]:text-[13px] sm:text-2xl sm:tracking-tight">
              شركة عمران التجارية
            </span>
            <span className="mt-1 hidden text-[11px] font-bold tracking-wide text-brand-muted min-[390px]:block sm:text-sm">
              لعب أطفال - هدايا
            </span>
          </span>
        </a>

        <nav className="flex shrink-0 items-center gap-1 text-xs font-bold sm:gap-2 sm:text-sm" aria-label="أقسام المتجر">
          <a
            href="/products"
            className="hidden min-h-11 items-center rounded-xl px-3 text-brand-navy transition hover:bg-brand-sky hover:text-brand-blue sm:inline-flex"
          >
            لعب الأطفال
          </a>
          <a
            href="/popup"
            className="hidden min-h-11 items-center rounded-xl px-3 font-black text-[#6b278f] transition hover:bg-[#f7effb] hover:text-[#542170] min-[430px]:inline-flex"
          >
            POP UP
          </a>
          <a href="/videos" className="hidden min-h-11 items-center rounded-xl px-3 text-brand-navy transition hover:bg-brand-sky hover:text-brand-blue lg:inline-flex">الفيديوهات</a>
          <a href="/rewards" className="hidden min-h-11 items-center rounded-xl px-3 text-brand-navy transition hover:bg-brand-sky hover:text-brand-blue lg:inline-flex">نقاط عمران</a>

          <button
            type="button"
            onClick={() => openSavedProducts("wishlist")}
            aria-label={`المفضلة — ${wishlistCount} منتج`}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-navy transition hover:border-brand-red hover:bg-red-50 hover:text-brand-red focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-red/15 sm:w-auto sm:gap-2 sm:px-3"
          >
            <Heart size={18} aria-hidden="true" />
            <span className="hidden sm:inline">المفضلة</span>
            {wishlistCount > 0 && (
              <span className="absolute -left-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-black text-brand-red ring-2 ring-white sm:static sm:ring-0">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={openCartDrawer}
            aria-label={`طلبك — ${cartCount} قطعة`}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-blue bg-brand-sky text-brand-navy transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 sm:w-auto sm:gap-2 sm:px-3"
          >
            <ShoppingBag size={18} aria-hidden="true" />
            <span className="hidden sm:inline">طلبك</span>
            {cartCount > 0 && (
              <span className="absolute -left-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-yellow px-1 text-[10px] font-black text-brand-navy ring-2 ring-white sm:static sm:ring-0">
                {cartCount}
              </span>
            )}
          </button>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="واتساب"
              onClick={() =>
                trackEvent("whatsapp_click", {
                  cta_location: "brand_header",
                  page_location: window.location.href,
                })
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-whatsapp text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-whatsapp-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/20 sm:w-auto sm:gap-2 sm:px-4"
            >
              <MessageCircle size={18} aria-hidden="true" />
              <span className="hidden sm:inline">واتساب</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
