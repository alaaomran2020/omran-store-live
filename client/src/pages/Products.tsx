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
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { whatsappNumber } from "@/lib/productFormat";

const ALL = "__all__";

const storeWhatsAppUrl = (() => {
  const number = whatsappNumber();
  if (!number) return null;
  const text = encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات شركة عمران التجارية.");
  return `https://wa.me/${number}?text=${text}`;
})();

export default function Products() {
  const [shareOutcome, setShareOutcome] = useState<ProductShareOutcome | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    staleTime: Infinity,
    gcTime: Infinity,
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

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const timer = setTimeout(
      () => trackEvent("product_search", { term, results: visibleProducts.length }),
      600
    );
    return () => clearTimeout(timer);
  }, [search, visibleProducts.length]);

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
      className={`min-h-10 rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15 ${
        category === value
          ? "bg-brand-navy text-white shadow"
          : "border border-brand-border bg-brand-surface text-brand-muted hover:border-brand-blue hover:text-brand-blue"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="sticky top-0 z-40 border-b border-brand-border/80 bg-brand-cream/95 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <a href="/" className="text-xl font-extrabold tracking-tight text-brand-navy">
            شركة عمران التجارية
          </a>
          <nav className="flex items-center gap-4 text-sm font-bold text-brand-muted">
            <a href="#feed" className="transition hover:text-brand-blue">المنتجات</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="container grid gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/25 px-3 py-1.5 text-xs font-bold text-brand-navy">
              <Sparkles size={15} /> كتالوج منتجات موثّق
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.15] text-brand-navy sm:text-6xl">
              اكتشف لعب الأطفال والهدايا من <span className="text-brand-blue">شركة عمران التجارية</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
              شاهد الصور والتفاصيل المتاحة، وللتأكد من السعر والتوفر تواصل معنا مباشرة عبر واتساب.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 active:scale-[0.97]"
              >
                <Share2 size={18} aria-hidden="true" /> مشاركة المنتجات
              </button>
              <p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-brand-blue">
                {shareOutcome ? shareMessage[shareOutcome] : ""}
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-brand-navy p-7 text-white shadow-xl">
            <p className="text-sm font-bold text-brand-yellow">معلومة مهمة</p>
            <p className="mt-3 text-xl font-bold leading-8">
              للتأكد من السعر والتوفر والكميات، اضغط زر واتساب على بطاقة المنتج وتواصل معنا مباشرةً.
            </p>
          </div>
        </section>

        <section id="feed" className="border-t border-brand-border bg-brand-surface py-14">
          <div className="container">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-brand-red">اكتشف الاختيار المناسب</p>
                <h2 className="mt-1 text-3xl font-extrabold text-brand-navy">كتالوج المنتجات</h2>
              </div>
              <button
                type="button"
                onClick={() => productsQuery.refetch()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand-border px-4 py-2 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
              >
                <RefreshCw size={15} className={productsQuery.isFetching ? "animate-spin" : ""} /> تحديث
              </button>
            </div>

            {products.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[230px] flex-1 sm:max-w-sm">
                  <Search
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ابحث في المنتجات…"
                    aria-label="ابحث في المنتجات"
                    data-testid="product-search"
                    className="min-h-11 w-full rounded-full border border-brand-border bg-brand-surface py-2.5 pl-4 pr-11 text-sm font-semibold text-brand-ink outline-none transition placeholder:text-brand-muted focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
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
                <div className="rounded-[2rem] border border-brand-border bg-brand-cream p-10 text-center">
                  <span className="inline-flex rounded-2xl bg-brand-yellow/25 p-4 text-brand-navy">
                    <Sparkles size={30} aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-2xl font-extrabold text-brand-navy">
                    {sourceError || productsQuery.isError
                      ? "المنتجات غير متاحة للعرض حاليًا"
                      : "المتجر قيد التجهيز — المنتجات قادمة قريبًا"}
                  </p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-brand-muted">
                    {sourceError || productsQuery.isError
                      ? "نعمل على تحديث الكتالوج الآن. جرّب التحديث، أو تواصل معنا مباشرةً عبر صفحاتنا الرسمية بالأسفل."
                      : notConfigured
                        ? "سنضيف أول المنتجات بعد اعتماد بياناتها وصورها. تابع صفحاتنا الرسمية حتى ذلك الحين."
                        : "بمجرد إضافة أول منتج معتمد سيظهر هنا تلقائيًا."}
                  </p>
                  <button
                    type="button"
                    onClick={() => productsQuery.refetch()}
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-hover"
                  >
                    <RefreshCw size={16} /> تحديث الكتالوج
                  </button>
                </div>
                <OfficialSocialEmbeds />
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm font-bold text-brand-muted" data-testid="product-count">
                  {visibleProducts.length} من {products.length} منتجًا
                </p>
                {visibleProducts.length === 0 ? (
                  <div className="rounded-[2rem] border border-brand-border bg-brand-cream p-10 text-center">
                    <p className="text-lg font-extrabold text-brand-navy">لا توجد نتائج مطابقة لبحثك</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setCategory(ALL);
                      }}
                      className="mt-4 inline-flex min-h-10 items-center rounded-full border border-brand-border px-5 py-2 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5"
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

        <section className="border-t border-brand-border bg-brand-cream py-10">
          <div className="container flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-bold text-brand-muted">تابعنا على المنصات الرسمية:</p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={SOCIAL_EMBED_CONFIG.instagramProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5"
              >
                <Instagram size={16} /> Instagram
              </a>
              <a
                href={SOCIAL_EMBED_CONFIG.facebookPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5"
              >
                <Facebook size={16} /> Facebook
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-brand-navy bg-brand-navy py-10 text-white">
          <div className="container flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-right">
            <div>
              <p className="text-lg font-extrabold">شركة عمران التجارية</p>
              <p className="mt-2 max-w-md text-sm leading-7 text-white/70">
                لعب أطفال وهدايا — صور وتفاصيل تساعدك تختار، والاستفسار مباشرة عبر واتساب.
              </p>
            </div>
            {storeWhatsAppUrl && (
              <a
                href={storeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-whatsapp px-6 py-3 text-sm font-bold text-white transition hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25"
              >
                <MessageCircle size={18} aria-hidden="true" /> تواصل معنا عبر واتساب
              </a>
            )}
          </div>
          <div className="container mt-6 border-t border-white/15 pt-4 text-center text-xs font-bold text-white/55">
            © 2026 شركة عمران التجارية — جميع الحقوق محفوظة
          </div>
        </footer>
      </main>

      <ProductDetailsDialog product={openProduct} onClose={handleCloseDetails} />
    </div>
  );
}
