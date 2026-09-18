/**
 * المفضلة — تعمل على الجهاز فورًا (معرّفات المنتجات فقط). عند تفعيل حساب
 * العميل الخادمي تُزامَن الأجهزة عبر نفس المزوّد. هنا تُحل المعرّفات مقابل
 * الكتالوج العام المنشور (لا بيانات مخفية للعملاء إطلاقًا).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Heart, Trash2 } from "lucide-react";
import { Card, EmptyState, LoadingState } from "@/admin/components/primitives";
import { fetchProducts } from "@/lib/productsClient";
import type { Product } from "@/lib/productsClient";
import { getWishlistIds, removeFromWishlist, subscribeWishlist } from "@/lib/wishlist";
import { ProductImage } from "@/components/ProductImage";
import { formatPrice } from "@/admin/adminFormat";

export default function WishlistPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setIds(getWishlistIds());
    sync();
    return subscribeWishlist(sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts()
      .then(payload => {
        if (cancelled) return;
        setProducts(payload.products);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => ids.map(id => products.find(p => p.id === id)).filter((p): p is Product => Boolean(p)), [ids, products]);
  const missing = ids.filter(id => !products.some(p => p.id === id));

  if (loading) {
    return (
      <div dir="rtl">
        <h1 className="mb-4 text-xl font-black text-brand-ink">المفضلة</h1>
        <LoadingState label="جاري تحميل منتجاتك المفضلة…" />
      </div>
    );
  }

  return (
    <div dir="rtl">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-black text-brand-ink">
        <Heart size={20} className="text-brand-red" /> المفضلة
      </h1>
      {items.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<Heart size={22} />}
            title="قائمة المفضلة فارغة"
            description="أضف منتجات من زر القلب في تفاصيل المنتج، وستظهر هنا على هذا الجهاز."
            action={<Link href="/products" className="text-sm font-extrabold text-brand-blue hover:underline">تصفّح المنتجات</Link>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map(product => (
            <Card key={product.id} className="overflow-hidden">
              <Link href={`/products?focus=${encodeURIComponent(product.id)}`} className="block">
                <div className="aspect-square bg-brand-cream">
                  <ProductImage product={product} className="h-full w-full object-contain" sizesHint="200px" />
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/products?focus=${encodeURIComponent(product.id)}`} className="line-clamp-2 block min-h-11 text-xs font-extrabold text-brand-ink hover:text-brand-blue">
                  {product.name}
                </Link>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-black text-brand-navy">{formatPrice(product.price)}</span>
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(product.id)}
                    aria-label={`إزالة ${product.name} من المفضلة`}
                    className="grid min-h-11 min-w-11 place-items-center rounded-xl text-brand-red hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {missing.length > 0 ? (
        <p className="mt-3 text-[11px] font-semibold text-brand-muted">
          {missing.length} عنصر غير متاح حاليًا في الكتالوج المنشور وقد يكون تحت المراجعة.
        </p>
      ) : null}
    </div>
  );
}
