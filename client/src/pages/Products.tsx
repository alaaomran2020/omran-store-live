import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OfficialSocialEmbeds } from "@/components/OfficialSocialEmbeds";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { SmartProductSearch } from "@/components/SmartProductSearch";
import AnnouncementBar from "@/components/AnnouncementBar";
import { searchCatalog } from "@/lib/catalogSearch";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";
import { fetchProducts, type Product } from "@/lib/productsClient";
import { AGE_FILTER_OPTIONS, filterProductsByAge, parseAgeRange } from "@/lib/productAge";
import { filterProductsByCatalog, type ProductCatalog } from "@/lib/productCatalog";
import { trackEvent } from "@/lib/analytics";
import { productCategories } from "@shared/products";
import { shareProductsPage, type ProductShareOutcome } from "@/lib/productShare";
import { Facebook, Instagram, MessageCircle, RefreshCw, Share2, Sparkles } from "lucide-react";
import { whatsappNumber } from "@/lib/productFormat";

const ALL = "__all__";
const storeWhatsAppUrl = (() => {
  const number = whatsappNumber();
  if (!number) return null;
  const text = encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات شركة عمران التجارية.");
  return `https://wa.me/${number}?text=${text}`;
})();

function readInitialParams() {
  if (typeof window === "undefined") {
    return { search: "", category: ALL, age: ALL, product: null as string | null };
  }
  const params = new URLSearchParams(window.location.search);
  const age = params.get("age");
  return {
    search: params.get("search") ?? "",
    category: params.get("category") ?? ALL,
    age: parseAgeRange(age) ? age! : ALL,
    product: params.get("product"),
  };
}

type ProductsProps = { catalog?: ProductCatalog; showAnnouncement?: boolean };

export default function Products({ catalog = "toys", showAnnouncement = true }: ProductsProps) {
  const isPopup = catalog === "popup";
  const initial = useMemo(readInitialParams, []);
  const [shareOutcome, setShareOutcome] = useState<ProductShareOutcome | null>(null);
  const [search, setSearch] = useState(initial.search);
  const [category, setCategory] = useState<string>(initial.category);
  const [age, setAge] = useState<string>(isPopup ? ALL : initial.age);
  const [openProductId, setOpenProductId] = useState<string | null>(initial.product);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const payload = productsQuery.data;
  const sourceProducts = payload?.products ?? [];
  const products = useMemo(() => filterProductsByCatalog(sourceProducts, catalog), [sourceProducts, catalog]);
  const notConfigured = payload?.status === "not_configured";
  const sourceError = payload?.status === "error";
  const categories = useMemo(() => productCategories(products), [products]);

  const filteredProducts = useMemo(() => {
    const byCategory = category === ALL ? products : products.filter(product => product.category === category);
    return isPopup || age === ALL ? byCategory : filterProductsByAge(byCategory, age);
  }, [products, category, age, isPopup]);
  const searchResult = useMemo(() => searchCatalog(filteredProducts, search), [filteredProducts, search]);
  const visibleProducts = searchResult.products;

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const timer = setTimeout(() => trackEvent("product_search", { term, results: visibleProducts.length, catalog }), 600);
    return () => clearTimeout(timer);
  }, [search, visibleProducts.length, catalog]);

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === ALL) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    updateUrl({ search: value || null });
  }, [updateUrl]);

  const openProduct = products.find(product => product.id === openProductId) ?? null;
  const handleOpenDetails = useCallback((product: Product) => {
    setOpenProductId(product.id);
    trackEvent("product_view", { product: product.name, id: product.id, catalog });
    updateUrl({ product: product.id });
  }, [updateUrl, catalog]);
  const handleCloseDetails = useCallback(() => {
    setOpenProductId(null);
    updateUrl({ product: null });
  }, [updateUrl]);
  const handleCategoryFilter = (value: string) => {
    setCategory(value);
    updateUrl({ category: value });
    trackEvent("product_filter", { category: value === ALL ? "الكل" : value, catalog });
  };
  const handleAgeFilter = (value: string) => {
    setAge(value);
    updateUrl({ age: value });
    trackEvent("product_age_filter", { age: value === ALL ? "الكل" : value });
  };
  const handleShare = async () => {
    const nativeShare = typeof navigator !== "undefined" && navigator.share ? navigator.share.bind(navigator) : undefined;
    const copyToClipboard = typeof navigator !== "undefined" && navigator.clipboard ? navigator.clipboard.writeText.bind(navigator.clipboard) : undefined;
    trackEvent("product_share", { catalog });
    setShareOutcome(await shareProductsPage({ url: window.location.href, nativeShare, copyToClipboard }));
  };
  const shareMessage = {
    shared: "تم فتح خيارات المشاركة.",
    copied: "تم نسخ رابط الصفحة.",
    dismissed: "تم إلغاء المشاركة.",
    unavailable: "تعذر النسخ تلقائياً؛ يمكنك نسخ الرابط من شريط العنوان.",
  } as const;

  const categoryChip = (value: string, label: string) => (
    <button key={value} type="button" onClick={() => handleCategoryFilter(value)} aria-pressed={category === value} data-testid="category-chip"
      className={`min-h-11 shrink-0 snap-start rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 ${category === value ? isPopup ? "bg-[#5e2181] text-white shadow" : "bg-brand-navy text-white shadow" : isPopup ? "border border-[#e8d8f1] bg-white text-[#5e2181] hover:border-[#8a3aaa]" : "border border-brand-border bg-brand-surface text-brand-muted hover:border-brand-blue hover:text-brand-blue"}`}>
      {label}
    </button>
  );
  const ageChip = (value: string, label: string) => (
    <button key={value} type="button" onClick={() => handleAgeFilter(value)} aria-pressed={age === value} data-testid="age-chip"
      className={`min-h-11 shrink-0 snap-start rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15 ${age === value ? "bg-brand-blue text-white shadow" : "border border-brand-border bg-brand-sky/40 text-brand-navy hover:border-brand-blue hover:bg-brand-sky"}`}>
      {label}
    </button>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      {showAnnouncement && <AnnouncementBar />}
      <header className="sticky top-0 z-40 border-b border-brand-border/80 bg-brand-cream/95 backdrop-blur">
        <div className="container flex min-h-16 items-center justify-between gap-3 sm:min-h-20 sm:gap-4">
          <a href="/" className="min-w-0 truncate text-base font-extrabold tracking-tight text-brand-navy sm:text-xl">شركة عمران التجارية</a>
          <nav className="flex shrink-0 items-center gap-1 text-xs font-bold text-brand-muted sm:gap-3 sm:text-sm">
            <a href="/products" className={`inline-flex min-h-11 items-center rounded-xl px-3 transition hover:bg-brand-sky hover:text-brand-blue ${!isPopup ? "text-brand-blue" : ""}`}>لعب الأطفال</a>
            <a href="/popup" className={`inline-flex min-h-11 items-center rounded-xl px-3 transition hover:bg-[#f7effb] hover:text-[#6b278f] ${isPopup ? "text-[#6b278f]" : ""}`}>POP UP</a>
          </nav>
        </div>
      </header>
      <main>
        <section className={`container grid gap-5 py-8 sm:gap-8 sm:py-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-20 ${isPopup ? "relative" : ""}`}>
          <div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isPopup ? "bg-[#f6e8fb] text-[#6b278f]" : "bg-brand-yellow/25 text-brand-navy"}`}><Sparkles size={15} /> {isPopup ? "POP UP – Gifts & Balloons" : "كتالوج لعب أطفال موثّق"}</span>
            <h1 className={`mt-4 max-w-3xl text-[2rem] font-extrabold leading-[1.16] sm:mt-5 sm:text-5xl lg:text-6xl ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>
              {isPopup ? <>هدايا، بالونات ومستلزمات حفلات <span className="text-[#8a3aaa]">POP UP</span></> : <>اكتشف لعب الأطفال من <span className="text-brand-blue">شركة عمران التجارية</span></>}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-muted sm:mt-5 sm:text-lg sm:leading-8">{isPopup ? "واجهة مستقلة لمنتجات POP UP المعتمدة فقط. لا تظهر هنا ألعاب الأطفال العامة، وللسعر والتوفر تواصل معنا عبر واتساب." : "شاهد ألعاب الأطفال المعتمدة وصورها وتفاصيلها، واختار حسب السن لما تكون بيانات العمر موثقة، وللسعر والتوفر تواصل معنا عبر واتساب."}</p>
            <div className="mt-5 sm:mt-6">
              <button type="button" onClick={handleShare} className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 sm:w-auto sm:rounded-full sm:shadow-lg ${isPopup ? "bg-[#6b278f] hover:bg-[#572073] focus-visible:ring-[#6b278f]/20" : "bg-brand-blue hover:bg-brand-blue-hover focus-visible:ring-brand-blue/20"}`}><Share2 size={18} aria-hidden="true" /> مشاركة المنتجات</button>
              <p aria-live="polite" className={`mt-2 min-h-5 text-xs font-semibold sm:mt-3 sm:text-sm ${isPopup ? "text-[#6b278f]" : "text-brand-blue"}`}>{shareOutcome ? shareMessage[shareOutcome] : ""}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-5 text-white shadow-lg sm:rounded-[2rem] sm:p-7 sm:shadow-xl ${isPopup ? "bg-[linear-gradient(135deg,#35134f,#6b278f_58%,#9c4caa)]" : "bg-brand-navy"}`}>
            <p className={`text-xs font-bold sm:text-sm ${isPopup ? "text-[#ffd85d]" : "text-brand-yellow"}`}>{isPopup ? "قسم مستقل داخل عمران" : "معلومة مهمة"}</p>
            <p className="mt-2 text-base font-bold leading-7 sm:mt-3 sm:text-xl sm:leading-8">{isPopup ? "الكتالوج هنا يعتمد على تصنيف المنتج نفسه: بالونات، هدايا أو مستلزمات حفلات. أي منتج غير مصنف بهذه الفئات لا يدخل POP UP." : "فلترة العمر تستخدم فقط العمر الأدنى والأقصى الموثقين. أي منتج بدون بيانات عمر مؤكدة يظل ظاهرًا في كتالوج الألعاب العام فقط."}</p>
          </div>
        </section>
        <section id="feed" className={`scroll-mt-16 border-t py-8 sm:scroll-mt-20 sm:py-14 ${isPopup ? "border-[#eadcf2] bg-[#fcf8ff]" : "border-brand-border bg-brand-surface"}`}>
          <div className="container">
            <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8 sm:flex-wrap sm:items-end sm:gap-4">
              <div className="min-w-0">
                <p className={`text-xs font-bold sm:text-sm ${isPopup ? "text-[#a13b87]" : "text-brand-red"}`}>{isPopup ? "Gifts & Balloons & Party Supplies" : "اكتشف الاختيار المناسب"}</p>
                <h2 className={`mt-1 text-2xl font-extrabold sm:text-3xl ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>{isPopup ? "كتالوج POP UP" : "كتالوج لعب الأطفال"}</h2>
              </div>
              <button type="button" onClick={() => productsQuery.refetch()} aria-label="تحديث الكتالوج" className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 sm:rounded-full sm:px-4 ${isPopup ? "border-[#e4d3ee] text-[#6b278f] hover:border-[#8a3aaa] hover:bg-white focus-visible:ring-[#8a3aaa]/15" : "border-brand-border text-brand-blue hover:border-brand-blue hover:bg-brand-blue/5 focus-visible:ring-brand-blue/15"}`}><RefreshCw size={16} className={productsQuery.isFetching ? "animate-spin" : ""} /><span className="hidden sm:inline">تحديث</span></button>
            </div>
            {products.length > 0 && (
              <div className="mb-5 space-y-3 sm:mb-8 sm:space-y-4">
                <SmartProductSearch value={search} onChange={handleSearchChange} result={searchResult} isPopup={isPopup} />
                {categories.length > 0 && (
                  <div>
                    <p className={`mb-2 text-xs font-extrabold sm:hidden ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>التصنيف</p>
                    <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                      {categoryChip(ALL, isPopup ? "كل POP UP" : "كل التصنيفات")}
                      {categories.map(name => categoryChip(name, name))}
                    </div>
                  </div>
                )}
                {!isPopup && (
                  <div className="rounded-2xl border border-brand-border bg-brand-cream p-3.5 sm:p-4">
                    <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-3">
                      <p className="text-sm font-extrabold text-brand-navy">اختار حسب السن</p>
                      {age !== ALL && <button type="button" onClick={() => handleAgeFilter(ALL)} className="min-h-9 rounded-lg px-2 text-xs font-bold text-brand-blue hover:bg-brand-sky hover:underline">إلغاء الفلتر</button>}
                    </div>
                    <div className="-mx-3.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                      {ageChip(ALL, "كل الأعمار")}
                      {AGE_FILTER_OPTIONS.map(range => ageChip(range.key, range.key === "13+" ? "13+ سنة" : `${range.key} سنوات`))}
                    </div>
                    <p className="mt-2.5 text-[11px] leading-5 text-brand-muted sm:mt-3 sm:text-xs sm:leading-6">المنتجات ذات العمر غير المؤكد لا تدخل في نتائج فلترة السن.</p>
                  </div>
                )}
              </div>
            )}
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
            ) : products.length === 0 ? (
              <div className="space-y-8 sm:space-y-10">
                <div className={`rounded-2xl border p-6 text-center sm:rounded-[2rem] sm:p-10 ${isPopup ? "border-[#e4d3ee] bg-white" : "border-brand-border bg-brand-cream"}`}>
                  <span className={`inline-flex rounded-2xl p-4 ${isPopup ? "bg-[#f6e8fb] text-[#6b278f]" : "bg-brand-yellow/25 text-brand-navy"}`}><Sparkles size={30} aria-hidden="true" /></span>
                  <p className={`mt-5 text-xl font-extrabold sm:text-2xl ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>{sourceError || productsQuery.isError ? "المنتجات غير متاحة للعرض حاليًا" : isPopup && sourceProducts.length > 0 ? "لا توجد منتجات POP UP منشورة حاليًا" : "المتجر قيد التجهيز — المنتجات قادمة قريبًا"}</p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-brand-muted">{sourceError || productsQuery.isError ? "نعمل على تحديث الكتالوج الآن. جرّب التحديث أو تواصل معنا عبر واتساب." : isPopup && sourceProducts.length > 0 ? "سيظهر هنا فقط أي منتج يتم تصنيفه صراحة ضمن بالونات أو هدايا أو مستلزمات حفلات؛ ألعاب الأطفال العامة مستبعدة بالكامل." : notConfigured ? "سنضيف أول المنتجات بعد اعتماد بياناتها وصورها." : "بمجرد إضافة أول منتج معتمد سيظهر هنا تلقائيًا."}</p>
                  <button type="button" onClick={() => productsQuery.refetch()} className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition sm:w-auto sm:rounded-full ${isPopup ? "bg-[#6b278f] hover:bg-[#572073]" : "bg-brand-blue hover:bg-brand-blue-hover"}`}><RefreshCw size={16} /> تحديث الكتالوج</button>
                </div>
                {!isPopup && <OfficialSocialEmbeds />}
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs font-bold text-brand-muted sm:mb-6 sm:text-sm" data-testid="product-count">{visibleProducts.length} من {products.length} منتجًا</p>
                {visibleProducts.length === 0 ? (
                  <div className={`rounded-2xl border p-6 text-center sm:rounded-[2rem] sm:p-10 ${isPopup ? "border-[#e4d3ee] bg-white" : "border-brand-border bg-brand-cream"}`}>
                    <p className={`text-base font-extrabold sm:text-lg ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>{!isPopup && age !== ALL ? "لا توجد منتجات ببيانات عمر موثقة تطابق الفئة دي" : "لا توجد نتائج مطابقة لبحثك"}</p>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-brand-muted">{!isPopup && age !== ALL ? "المنتجات ذات العمر غير المؤكد لا بنضمها تلقائيًا لأي فئة عمرية." : "غيّر البحث أو امسح الفلاتر وحاول تاني."}</p>
                    <button type="button" onClick={() => { setSearch(""); setCategory(ALL); setAge(ALL); updateUrl({ search: null, category: null, age: null }); }} className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-5 py-2 text-sm font-bold transition sm:w-auto sm:rounded-full ${isPopup ? "border-[#e4d3ee] text-[#6b278f] hover:border-[#8a3aaa] hover:bg-[#f7effb]" : "border-brand-border text-brand-blue hover:border-brand-blue hover:bg-brand-blue/5"}`}>مسح البحث والفلاتر</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">{visibleProducts.map(product => <ProductCard key={product.id} product={product} onOpenDetails={handleOpenDetails} />)}</div>
                )}
              </>
            )}
          </div>
        </section>
        <section className="border-t border-brand-border bg-brand-cream py-8 sm:py-10">
          <div className="container flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-brand-muted">تابعنا على المنصات الرسمية:</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <a href={SOCIAL_EMBED_CONFIG.instagramProfileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5 sm:rounded-full sm:px-4"><Instagram size={16} /> Instagram</a>
              <a href={SOCIAL_EMBED_CONFIG.facebookPageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/5 sm:rounded-full sm:px-4"><Facebook size={16} /> Facebook</a>
            </div>
          </div>
        </section>
        <footer className={`border-t py-8 text-white sm:py-10 ${isPopup ? "border-[#35134f] bg-[#35134f]" : "border-brand-navy bg-brand-navy"}`}>
          <div className="container flex flex-col items-stretch gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-right">
            <div><p className="text-lg font-extrabold">شركة عمران التجارية</p><p className="mt-2 max-w-md text-sm leading-7 text-white/70">{isPopup ? "POP UP – Gifts & Balloons — هدايا، بالونات ومستلزمات حفلات ضمن شركة عمران التجارية." : "لعب أطفال — صور وتفاصيل تساعدك تختار، والاستفسار مباشرة عبر واتساب."}</p></div>
            {storeWhatsAppUrl && <a href={storeWhatsAppUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-whatsapp px-6 py-3 text-sm font-bold text-white transition active:scale-[0.99] hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:w-auto sm:rounded-full"><MessageCircle size={18} aria-hidden="true" /> تواصل معنا عبر واتساب</a>}
          </div>
          <div className="container mt-6 border-t border-white/15 pt-4 text-center text-xs font-bold text-white/55">© 2026 شركة عمران التجارية — جميع الحقوق محفوظة</div>
        </footer>
      </main>
      <ProductDetailsDialog product={openProduct} onClose={handleCloseDetails} />
    </div>
  );
}
