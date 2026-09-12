import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OfficialSocialEmbeds } from "@/components/OfficialSocialEmbeds";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { ProductFacetControls, type ActiveProductFilter, type ProductSortMode } from "@/components/ProductFacetControls";
import { SmartProductSearch } from "@/components/SmartProductSearch";
import { CatalogBreadcrumbs } from "@/components/CatalogBreadcrumbs";
import AnnouncementBar from "@/components/AnnouncementBar";
import { searchCatalog } from "@/lib/catalogSearch";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";
import { fetchProducts, type Product, type ProductAvailability } from "@/lib/productsClient";
import { AGE_FILTER_OPTIONS, filterProductsByAge, parseAgeRange } from "@/lib/productAge";
import { filterProductsByCatalog, type ProductCatalog } from "@/lib/productCatalog";
import { trackEvent } from "@/lib/analytics";
import { canonicalCategory, displayCategoryName } from "@shared/taxonomy";
import { shareProductsPage, type ProductShareOutcome } from "@/lib/productShare";
import { Facebook, Instagram, RefreshCw, Share2, Sparkles } from "lucide-react";
import { findSimilarProducts } from "@/lib/similarProducts";

const ALL = "__all__";
const PRODUCTS_PAGE_SIZE = 24;
const AVAILABILITY_LABELS: Record<ProductAvailability, string> = {
  available: "متاح",
  unavailable: "غير متاح",
  preorder: "طلب مسبق",
  unknown: "غير محدد",
};

function readInitialParams() {
  if (typeof window === "undefined") {
    return {
      search: "", category: ALL, age: ALL, brand: ALL, tag: ALL, availability: ALL,
      sort: "catalog" as ProductSortMode, product: null as string | null,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const age = params.get("age");
  const availability = params.get("availability");
  const sortParam = params.get("sort");
  const sort: ProductSortMode = sortParam === "name-asc" || sortParam === "name-desc" ? sortParam : "catalog";
  return {
    search: params.get("search") ?? "",
    category: params.get("category") ? displayCategoryName(params.get("category")!) : ALL,
    age: parseAgeRange(age) ? age! : ALL,
    brand: params.get("brand") ?? ALL,
    tag: params.get("tag") ?? ALL,
    availability: ["available", "unavailable", "preorder", "unknown"].includes(availability ?? "") ? availability! : ALL,
    sort,
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
  const [brand, setBrand] = useState<string>(initial.brand);
  const [tag, setTag] = useState<string>(initial.tag);
  const [availability, setAvailability] = useState<string>(initial.availability);
  const [sort, setSort] = useState<ProductSortMode>(initial.sort);
  const [openProductId, setOpenProductId] = useState<string | null>(initial.product);
  const [renderLimit, setRenderLimit] = useState(PRODUCTS_PAGE_SIZE);

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
  const sourceError = payload?.status === "error";
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const name = displayCategoryName(product.category);
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [products]);
  const categories = useMemo(() => Array.from(categoryCounts.keys()).sort((a, b) => {
    const orderA = canonicalCategory(a)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = canonicalCategory(b)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB || a.localeCompare(b, "ar");
  }), [categoryCounts]);
  const brands = useMemo(() => Array.from(new Set(products.map(product => product.brand).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "ar")), [products]);
  const tags = useMemo(() => Array.from(new Set(products.flatMap(product => product.tags))).sort((a, b) => a.localeCompare(b, "ar")), [products]);
  const availabilityValues = useMemo(() => Array.from(new Set(products.map(product => product.availability))), [products]);

  const filteredProducts = useMemo(() => {
    let result = category === ALL ? products : products.filter(product => displayCategoryName(product.category) === category);
    if (!isPopup && age !== ALL) result = filterProductsByAge(result, age);
    if (brand !== ALL) result = result.filter(product => product.brand === brand);
    if (tag !== ALL) result = result.filter(product => product.tags.includes(tag));
    if (availability !== ALL) result = result.filter(product => product.availability === availability);
    return result;
  }, [products, category, age, isPopup, brand, tag, availability]);

  const searchResult = useMemo(() => searchCatalog(filteredProducts, search), [filteredProducts, search]);
  const visibleProducts = useMemo(() => {
    if (sort === "catalog") return searchResult.products;
    return [...searchResult.products].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, "ar", { sensitivity: "base" });
      return sort === "name-asc" ? comparison : -comparison;
    });
  }, [searchResult.products, sort]);
  const renderedProducts = useMemo(
    () => visibleProducts.slice(0, renderLimit),
    [renderLimit, visibleProducts]
  );
  const hasMoreProducts = renderedProducts.length < visibleProducts.length;

  useEffect(() => {
    setRenderLimit(PRODUCTS_PAGE_SIZE);
  }, [search, category, age, brand, tag, availability, sort, catalog]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const timer = setTimeout(() => trackEvent("search", { term, results: visibleProducts.length, catalog }), 600);
    return () => clearTimeout(timer);
  }, [search, visibleProducts.length, catalog]);

  useEffect(() => {
    trackEvent("category_view", {
      category: category === ALL ? (isPopup ? "POP UP" : "لعب الأطفال") : category,
      catalog,
    });
  }, [catalog, category, isPopup]);

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === ALL) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    window.history.replaceState({}, "", url.toString());
  }, []);

  const pushProductUrl = useCallback((productId: string) => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("product") === productId) return;
    url.searchParams.set("product", productId);
    window.history.pushState({}, "", url.toString());
  }, []);

  useEffect(() => {
    const syncProductFromUrl = () => {
      setOpenProductId(new URL(window.location.href).searchParams.get("product"));
    };
    window.addEventListener("popstate", syncProductFromUrl);
    return () => window.removeEventListener("popstate", syncProductFromUrl);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    updateUrl({ search: value || null });
  }, [updateUrl]);

  const openProduct = products.find(product => product.id === openProductId) ?? null;
  const relatedProducts = useMemo(() => {
    if (!openProduct) return [];
    return findSimilarProducts(products, openProduct, 3);
  }, [openProduct, products]);
  const handleOpenDetails = useCallback((product: Product) => {
    setOpenProductId(product.id);
    trackEvent("product_view", {
      product: product.name,
      product_id: product.id,
      sku: product.sku || product.id,
      category: product.category,
      catalog,
    });
    pushProductUrl(product.id);
  }, [catalog, pushProductUrl]);
  const handleCloseDetails = useCallback(() => {
    setOpenProductId(null);
    updateUrl({ product: null });
  }, [updateUrl]);
  const handleSelectRelatedProduct = useCallback((product: Product) => {
    setOpenProductId(product.id);
    trackEvent("product_view", {
      product: product.name,
      product_id: product.id,
      sku: product.sku || product.id,
      category: product.category,
      catalog,
      source: "related_products",
    });
    pushProductUrl(product.id);
  }, [catalog, pushProductUrl]);
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
  const handleBrandFilter = (value: string) => {
    setBrand(value);
    updateUrl({ brand: value });
    trackEvent("product_filter", { brand: value === ALL ? "الكل" : value, catalog });
  };
  const handleTagFilter = (value: string) => {
    setTag(value);
    updateUrl({ tag: value });
    trackEvent("product_filter", { tag: value === ALL ? "الكل" : value, catalog });
  };
  const handleAvailabilityFilter = (value: string) => {
    setAvailability(value);
    updateUrl({ availability: value });
    trackEvent("product_filter", { availability: value === ALL ? "الكل" : value, catalog });
  };
  const handleSort = (value: ProductSortMode) => {
    setSort(value);
    updateUrl({ sort: value === "catalog" ? null : value });
    trackEvent("product_filter", { sort: value, catalog });
  };
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setCategory(ALL);
    setAge(ALL);
    setBrand(ALL);
    setTag(ALL);
    setAvailability(ALL);
    setSort("catalog");
    updateUrl({ search: null, category: null, age: null, brand: null, tag: null, availability: null, sort: null });
    trackEvent("product_filter", { action: "clear_all", catalog });
  }, [catalog, updateUrl]);

  const activeFilters = useMemo<ActiveProductFilter[]>(() => {
    const filters: ActiveProductFilter[] = [];
    if (search.trim()) filters.push({ key: "search", label: `بحث: ${search.trim()}`, onClear: () => handleSearchChange("") });
    if (category !== ALL) filters.push({ key: "category", label: `التصنيف: ${category}`, onClear: () => handleCategoryFilter(ALL) });
    if (!isPopup && age !== ALL) filters.push({ key: "age", label: `العمر: ${age}`, onClear: () => handleAgeFilter(ALL) });
    if (brand !== ALL) filters.push({ key: "brand", label: `الماركة: ${brand}`, onClear: () => handleBrandFilter(ALL) });
    if (tag !== ALL) filters.push({ key: "tag", label: `الوسم: ${tag}`, onClear: () => handleTagFilter(ALL) });
    if (availability !== ALL) filters.push({ key: "availability", label: `التوفر: ${AVAILABILITY_LABELS[availability as ProductAvailability] ?? availability}`, onClear: () => handleAvailabilityFilter(ALL) });
    if (sort !== "catalog") filters.push({ key: "sort", label: sort === "name-asc" ? "الترتيب: أ ← ي" : "الترتيب: ي ← أ", onClear: () => handleSort("catalog") });
    return filters;
  }, [search, category, age, isPopup, brand, tag, availability, sort]);

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

  const categoryChip = (value: string, label: string, count?: number) => (
    <button key={value} type="button" onClick={() => handleCategoryFilter(value)} aria-pressed={category === value} data-testid="category-chip"
      className={`min-h-11 shrink-0 snap-start rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 ${category === value ? isPopup ? "bg-[#5e2181] text-white shadow" : "bg-brand-navy text-white shadow" : isPopup ? "border border-[#e8d8f1] bg-white text-[#5e2181] hover:border-[#8a3aaa]" : "border border-brand-border bg-brand-surface text-brand-muted hover:border-brand-blue hover:text-brand-blue"}`}>
      <span>{label}</span>
      {typeof count === "number" && <span className="mr-1 opacity-70" aria-label={`${count} منتج`}>({count})</span>}
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
      <main>
        <section className={`container grid gap-5 py-8 sm:gap-8 sm:py-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-20 ${isPopup ? "relative" : ""}`}>
          <CatalogBreadcrumbs catalog={catalog} category={category === ALL ? undefined : category} className="lg:col-span-2" />
          <div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isPopup ? "bg-[#f6e8fb] text-[#6b278f]" : "bg-brand-yellow/25 text-brand-navy"}`}><Sparkles size={15} /> {isPopup ? "POP UP – Gifts & Balloons" : "كتالوج لعب الأطفال"}</span>
            <h1 className={`mt-4 max-w-3xl text-[2rem] font-extrabold leading-[1.16] sm:mt-5 sm:text-5xl lg:text-6xl ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>
              {isPopup ? <>هدايا، بالونات ومستلزمات حفلات <span className="text-[#8a3aaa]">POP UP</span></> : <>اكتشف لعب الأطفال من <span className="text-brand-blue">شركة عمران التجارية</span></>}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-muted sm:mt-5 sm:text-lg sm:leading-8">{isPopup ? "اكتشف هدايا وبالونات ومستلزمات حفلات POP UP، وللسعر والتوفر تواصل معنا عبر واتساب." : "اكتشف لعب الأطفال وصورها وتفاصيلها، واختار بسهولة حسب السن، وللسعر والتوفر تواصل معنا عبر واتساب."}</p>
            <div className="mt-5 sm:mt-6">
              <button type="button" onClick={handleShare} className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 sm:w-auto sm:rounded-full sm:shadow-lg ${isPopup ? "bg-[#6b278f] hover:bg-[#572073] focus-visible:ring-[#6b278f]/20" : "bg-brand-blue hover:bg-brand-blue-hover focus-visible:ring-brand-blue/20"}`}><Share2 size={18} aria-hidden="true" /> مشاركة المنتجات</button>
              <p aria-live="polite" className={`mt-2 min-h-5 text-xs font-semibold sm:mt-3 sm:text-sm ${isPopup ? "text-[#6b278f]" : "text-brand-blue"}`}>{shareOutcome ? shareMessage[shareOutcome] : ""}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-5 text-white shadow-lg sm:rounded-[2rem] sm:p-7 sm:shadow-xl ${isPopup ? "bg-[linear-gradient(135deg,#35134f,#6b278f_58%,#9c4caa)]" : "bg-brand-navy"}`}>
            <p className={`text-xs font-bold sm:text-sm ${isPopup ? "text-[#ffd85d]" : "text-brand-yellow"}`}>{isPopup ? "اختيارات POP UP" : "اختار بسهولة"}</p>
            <p className="mt-2 text-base font-bold leading-7 sm:mt-3 sm:text-xl sm:leading-8">{isPopup ? "هنا هتلاقي بالونات، هدايا ومستلزمات حفلات من POP UP." : "استخدم فلتر السن والتصنيفات عشان توصل للعبة المناسبة بسرعة."}</p>
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
                      {categoryChip(ALL, isPopup ? "كل POP UP" : "كل التصنيفات", products.length)}
                      {categories.map(name => categoryChip(name, name, categoryCounts.get(name)))}
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
                    <p className="mt-2.5 text-[11px] leading-5 text-brand-muted sm:mt-3 sm:text-xs sm:leading-6">اختار الفئة العمرية المناسبة لعرض المنتجات المتاحة ليها.</p>
                  </div>
                )}
                <ProductFacetControls
                  isPopup={isPopup}
                  brands={brands}
                  tags={tags}
                  availabilityValues={availabilityValues}
                  brand={brand}
                  tag={tag}
                  availability={availability}
                  sort={sort}
                  activeFilters={activeFilters}
                  resultCount={visibleProducts.length}
                  totalCount={products.length}
                  onBrandChange={handleBrandFilter}
                  onTagChange={handleTagFilter}
                  onAvailabilityChange={handleAvailabilityFilter}
                  onSortChange={handleSort}
                  onClearAll={clearAllFilters}
                />
              </div>
            )}
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
            ) : products.length === 0 ? (
              <div className="space-y-8 sm:space-y-10">
                <div className={`rounded-2xl border p-6 text-center sm:rounded-[2rem] sm:p-10 ${isPopup ? "border-[#e4d3ee] bg-white" : "border-brand-border bg-brand-cream"}`}>
                  <span className={`inline-flex rounded-2xl p-4 ${isPopup ? "bg-[#f6e8fb] text-[#6b278f]" : "bg-brand-yellow/25 text-brand-navy"}`}><Sparkles size={30} aria-hidden="true" /></span>
                  <p className={`mt-5 text-xl font-extrabold sm:text-2xl ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>{sourceError || productsQuery.isError ? "المنتجات غير متاحة للعرض حاليًا" : isPopup ? "منتجات POP UP هتتوفر قريب" : "المنتجات هتتوفر قريب"}</p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-brand-muted">{sourceError || productsQuery.isError ? "نعمل على تحديث الكتالوج الآن. جرّب التحديث أو تواصل معنا عبر واتساب." : isPopup ? "تابعنا قريب لأحدث الهدايا والبالونات ومستلزمات الحفلات." : "تابعنا عشان تشوف أحدث لعب الأطفال أول ما تتوفر."}</p>
                  <button type="button" onClick={() => productsQuery.refetch()} className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition sm:w-auto sm:rounded-full ${isPopup ? "bg-[#6b278f] hover:bg-[#572073]" : "bg-brand-blue hover:bg-brand-blue-hover"}`}><RefreshCw size={16} /> تحديث الكتالوج</button>
                </div>
                {!isPopup && <OfficialSocialEmbeds />}
              </div>
            ) : (
              <>
                {visibleProducts.length === 0 ? (
                  <div className={`rounded-2xl border p-6 text-center sm:rounded-[2rem] sm:p-10 ${isPopup ? "border-[#e4d3ee] bg-white" : "border-brand-border bg-brand-cream"}`}>
                    <p className={`text-base font-extrabold sm:text-lg ${isPopup ? "text-[#4f1b68]" : "text-brand-navy"}`}>لا توجد نتائج مطابقة لبحثك أو الفلاتر</p>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-brand-muted">غيّر البحث أو أحد الفلاتر، أو امسح الكل وحاول تاني.</p>
                    <button type="button" onClick={clearAllFilters} className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-5 py-2 text-sm font-bold transition sm:w-auto sm:rounded-full ${isPopup ? "border-[#e4d3ee] text-[#6b278f] hover:border-[#8a3aaa] hover:bg-[#f7effb]" : "border-brand-border text-brand-blue hover:border-brand-blue hover:bg-brand-blue/5"}`}>مسح البحث والفلاتر</button>
                  </div>
                ) : (
                  <div>
                    <p className="mb-4 text-xs font-bold text-brand-muted" aria-live="polite">
                      عرض {renderedProducts.length} من {visibleProducts.length} منتج
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                      {renderedProducts.map(product => <ProductCard key={product.id} product={product} onOpenDetails={handleOpenDetails} />)}
                    </div>
                    {hasMoreProducts && (
                      <div className="mt-7 flex justify-center sm:mt-10">
                        <button
                          type="button"
                          onClick={() => setRenderLimit(current => current + PRODUCTS_PAGE_SIZE)}
                          className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-[0.99] sm:w-auto sm:min-w-52 sm:rounded-full ${isPopup ? "bg-[#6b278f] hover:bg-[#572073]" : "bg-brand-blue hover:bg-brand-blue-hover"}`}
                        >
                          عرض منتجات أكتر
                        </button>
                      </div>
                    )}
                  </div>
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
      </main>
      <ProductDetailsDialog
        product={openProduct}
        relatedProducts={relatedProducts}
        onSelectProduct={handleSelectRelatedProduct}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
