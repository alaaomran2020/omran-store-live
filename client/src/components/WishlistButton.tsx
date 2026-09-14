import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { isInWishlist, subscribeWishlist, toggleWishlist } from "@/lib/wishlist";
import { trackEvent } from "@/lib/analytics";

/**
 * زر المفضلة — يعمل على الجهاز فورًا (معرّف المنتج فقط). لا يخزّن أي جلسة
 * أو توكن؛ مزامنة الأجهزة تنتظر حساب العميل الخادمي.
 */
export function WishlistButton({
  productId,
  productName,
  variant = "outline",
  className,
}: {
  productId: string;
  productName?: string;
  variant?: "outline" | "solid";
  className?: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isInWishlist(productId));
    return subscribeWishlist(() => setActive(isInWishlist(productId)));
  }, [productId]);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      onClick={() => {
        const added = toggleWishlist(productId);
        setActive(added);
        try {
          trackEvent(added ? "wishlist_added" : "wishlist_removed", {
            product_id: productId,
            product_name: productName ?? productId,
          });
        } catch {
          // التحليلات اختيارية ولا تمنع إجراء المفضلة.
        }
      }}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue",
        active
          ? "border-brand-red bg-brand-red/5 text-brand-red"
          : variant === "solid"
            ? "border-brand-border bg-white text-brand-navy hover:border-brand-blue hover:bg-brand-sky"
            : "border-brand-border bg-white text-brand-blue hover:border-brand-blue hover:bg-brand-sky",
        className
      )}
    >
      <Heart size={18} aria-hidden="true" fill={active ? "currentColor" : "none"} />
      {active ? "في المفضلة" : "أضف للمفضلة"}
    </button>
  );
}
