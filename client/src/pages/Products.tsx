import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OfficialSocialEmbeds } from "@/components/OfficialSocialEmbeds";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";
import { fetchProducts } from "@/lib/productsClient";
import { trackEvent } from "@/lib/analytics";
import { productCategories, searchProducts, type Product } from "@shared/products";
import { shareProductsPage, type ProductShareOutcome } from "@/lib/productShare";
import {
  Facebook,
  Instagram,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/**
 * صفحة المنتجات — نفس التصميم والوظائف، لكن مصدر البيانات صار Google Sheets
 * (CSV منشور للويب) عبر `@/lib/productsClient`. لا قاعدة بيانات، لا لوحة تحكم،
 * لا مفاتيح API: صف في الشيت = منتج على الموقع.
 */

const ALL = "__all__";

export default function Products() {
  const [shareOutcome, setShareOutcome] = useState<ProductShareOutcome | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: ({ signal }) => fetchProducts(signal),
    // كاش في المتصفح: لا نطلب الشيت مع كل تفاعل للمستخدم. الحافة تخزّن 5 دقائق
    // أيضًا، فالمنتج الجديد يظهر تلقائيًا خلال دقائق بلا Deploy.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const payload = productsQuery.data;
  const products = payload?.products ?? [];
  const notConfigured = payload?.status === "not_configured";
  const sourceError = payload?.status === "error";

  const categories = useMemo(() => productCategories(products), [products]);

  const visibleProducts = useMemo(() => {
    const byCategory =
      category === ALL ? products : products.filter(p => p.category === category);
    return searchProducts(byCategory, search);
  }, [products, search, category]);

  // بحث: حدث تحليلات واحد بعد توقف الكتابة، لا حدث لكل حرف.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const timer = setTimeout(
      () => trackEvent("product_search", { term, results: visibleProducts.length }),
      600
    );
    return () => clearTimeout(timer);
  }, [search, visibleProducts.length]);

  // رابط قابل للمشاركة لكل منتج: ?product=<id> يفتح نافذة التفاصيل مباشرة.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("product");
    if (id) setOpenProductId(id);
  }, []);

  const openProduct = products.find(p => p.id === openProductId) ?? null;

  const handleOpenDetails = useCallback((product: Product) => {
    setOpenProductId(product.id);
    trackEvent("product_view", { product: product.name, id: product.id });
    const url = new URL(window.location.href);
    url.searchParams.set("product", product.id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleCloseDetails = useCallback(() => {
    setOpenProductId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleFilter = (value: string) => {
    setCategory(value);
    trackEvent("product_filter", { category: value === ALL ? "الكل" : value });
  };

  const handleShare = async () => {
    const nativeShare =
      typeof navigator !== "undefined" && navigator.share
        ? navigator.share.bind(navigator)
        : undefined;
    const copyToClipboard =
      typeof navigator !== "undefined" && navigator.clipboard
        ? navigator.clipboard.writeText.bind(navigator.clipboard)
        : undefined;

    trackEvent("product_share", {});
    setShareOutcome(
      await shareProductsPage({ url: window.location.href, nativeShare, copyToClipboard })
    );
  };

  const shareMessage = {
    shared: "تم فتح خيارات المشاركة.",
    copied: "تم نسخ رابط الصفحة.",
    dismissed: "تم إلغاء المشاركة.",
    unavailable: "تعذر النسخ تلقائياً؛ يمكنك نسخ الرابط من شريط العنوان.",
  } as const;

  const filterChip = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => handleFilter(value)}
      aria-pressed={category === value}
      data-testid="category-chip"
      className={`min-h-10 rounded-full px-4 py-2 text-sm font-bold transition ${
        category === value
          ? "bg-emerald-900 text-white shadow"
          : "border border-stone-300 text-stone-600 hover:border-emerald-700 hover:text-emerald-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f3ec] text-stone-900">
      <header className="border-b border-stone-200/80 bg-[#f7f3ec]/90 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <a href="/products" className="text-xl font-black tracking-tight text-emerald-950">عمران للألعاب</a>
          <nav className="flex items-center gap-4 text-sm font-bold text-stone-600"><a href="#feed" className="hover:text-emerald-800">المنتجات</a><a href="/settings/social" className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 hover:border-emerald-700 hover:text-emerald-800"><ShieldCheck size={15} /> الإعدادات</a></nav>
        </div>
      </header>
      <main>
        <section className="container grid gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-20">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-900"><Sparkles size={15} /> كتالوج محدَّث أولًا بأول</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.15] text-emerald-950 sm:text-6xl">ألعاب أطفال مختارة من <span className="text-orange-700">عمران للألعاب</span></h1><p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">كل منتج تراه هنا معروض بسعره وتفاصيله، والطلب يتم مباشرة عبر واتساب — بلا حسابات وبلا خطوات معقدة.</p><div className="mt-6"><button type="button" onClick={handleShare} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 active:scale-[0.97]"><Share2 size={18} aria-hidden="true" /> مشاركة المنتجات</button><p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-emerald-900">{shareOutcome ? shareMessage[shareOutcome] : ""}</p></div></div>
          <div className="rounded-[2rem] bg-emerald-950 p-7 text-emerald-50 shadow-xl"><p className="text-sm font-bold text-emerald-200">معلومة مهمة</p><p className="mt-3 text-xl font-bold leading-8">الأسعار والتوفر يُحدَّثان من إدارة المتجر مباشرةً، ويظهر التحديث على الموقع خلال دقائق. للاستفسار عن أي منتج اضغط زر واتساب على بطاقته.</p></div>
        </section>

        <section id="feed" className="border-t border-stone-200 bg-white py-14">
          <div className="container">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-orange-700">تحديث تلقائي عند تحميل الصفحة</p>
                <h2 className="mt-1 text-3xl font-black text-emerald-950">كتالوج المنتجات</h2>
              </div>
              <button
                type="button"
                onClick={() => productsQuery.refetch()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-emerald-900 transition hover:border-emerald-700"
              >
                <RefreshCw size={15} className={productsQuery.isFetching ? "animate-spin" : ""} /> تحديث
              </button>
            </div>

            {products.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[230px] flex-1 sm:max-w-sm">
                  <Search size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ابحث في المنتجات…"
                    aria-label="ابحث في المنتجات"
                    data-testid="product-search"
                    className="min-h-11 w-full rounded-full border border-stone-300 bg-white py-2.5 pl-4 pr-11 text-sm font-semibold text-stone-800 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {filterChip(ALL, "الكل")}
                    {categories.map(name => filterChip(name, name))}
                  </div>
                )}
              </div>
            )}

            {productsQuery.isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="space-y-10">
                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/60 p-10 text-center">
                  <span className="inline-flex rounded-2xl bg-emerald-100 p-4 text-emerald-900"><Sparkles size={30} aria-hidden="true" /></span>
                  <p className="mt-5 text-2xl font-black text-emerald-950">
                    {sourceError || productsQuery.isError
                      ? "المنتجات غير متاحة للعرض حاليًا"
                      : "المتجر قيد التجهيز — المنتجات قادمة قريبًا"}
                  </p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-stone-600">
                    {sourceError || productsQuery.isError
                      ? "نعمل على تحديث الكتالوج الآن. جرّب التحديث بعد قليل، أو تواصل معنا مباشرةً عبر صفحاتنا الرسمية بالأسفل."
                      : notConfigured
                        ? "سنضيف أول المنتجات خلال وقت قصير جدًا. تابع صفحاتنا الرسمية حتى ذلك الحين."
                        : "بمجرد إضافة أول منتج سيظهر هنا تلقائيًا ببطاقته وسعره."}
                  </p>
                  <button
                    type="button"
                    onClick={() => productsQuery.refetch()}
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    <RefreshCw size={16} /> تحديث الكتالوج
                  </button>
                </div>
                <OfficialSocialEmbeds />
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm font-bold text-stone-500" data-testid="product-count">
                  {visibleProducts.length} من {products.length} منتجًا
                </p>
                {visibleProducts.length === 0 ? (
                  <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-10 text-center">
                    <p className="text-lg font-black text-emerald-950">لا توجد نتائج مطابقة لبحثك</p>
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setCategory(ALL); }}
                      className="mt-4 inline-flex min-h-10 items-center rounded-full border border-stone-300 px-5 py-2 text-sm font-bold text-emerald-900 hover:border-emerald-700"
                    >
                      مسح البحث والفلاتر
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleProducts.map(product => (
                      <ProductCard key={product.id} product={product} onOpenDetails={handleOpenDetails} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="border-t border-stone-200 bg-[#f7f3ec] py-10">
          <div className="container flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-bold text-stone-600">تابعنا على المنصات الرسمية:</p>
            <div className="flex flex-wrap items-center gap-3">
              <a href={SOCIAL_EMBED_CONFIG.instagramProfileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-bold text-[#b0195e] hover:border-[#d62976]"><Instagram size={16} /> Instagram</a>
              <a href={SOCIAL_EMBED_CONFIG.facebookPageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#1877f2] hover:border-[#1877f2]"><Facebook size={16} /> Facebook</a>
            </div>
          </div>
        </section>
      </main>

      <ProductDetailsDialog product={openProduct} onClose={handleCloseDetails} />
    </div>
  );
}
