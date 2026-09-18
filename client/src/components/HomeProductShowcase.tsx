import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { filterProductsByCatalog } from "@/lib/productCatalog";
import { getInitialProductsSnapshot, refreshProductsFromLiveCatalog, type Product } from "@/lib/productsClient";
import { findSimilarProducts } from "@/lib/similarProducts";

export default function HomeProductShowcase() {
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => refreshProductsFromLiveCatalog(),
    initialData: () => getInitialProductsSnapshot(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const products = useMemo(
    () => filterProductsByCatalog(productsQuery.data?.products ?? [], "toys").slice(0, 8),
    [productsQuery.data]
  );
  const related = useMemo(
    () => (openProduct ? findSimilarProducts(filterProductsByCatalog(productsQuery.data?.products ?? [], "toys"), openProduct) : []),
    [openProduct, productsQuery.data]
  );
  const isError = productsQuery.isError || productsQuery.data?.status === "error";

  return (
    <section id="featured-products" className="scroll-mt-28 border-b border-brand-border bg-brand-cream py-8 sm:py-11" aria-labelledby="featured-products-title">
      <div className="container">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-brand-blue sm:text-sm">ابدأ من المنتج نفسه</p>
            <h2 id="featured-products-title" className="mt-1 text-2xl font-black tracking-[-0.025em] text-brand-navy sm:text-3xl">منتجات من عمران تويز</h2>
          </div>
          <a href="/products#feed" className="hidden min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-brand-navy shadow-sm ring-1 ring-brand-border transition hover:bg-brand-sky sm:inline-flex">
            عرض كل المنتجات <ArrowLeft size={16} aria-hidden="true" />
          </a>
        </div>

        {productsQuery.isLoading ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        ) : products.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {products.map(product => <ProductCard key={product.id} product={product} onOpenDetails={setOpenProduct} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.6rem] border border-brand-border bg-white p-6 text-center sm:p-8">
            <p className="text-lg font-black text-brand-navy">{isError ? "حصلت مشكلة أثناء تحميل المنتجات." : "مفيش منتجات متاحة للعرض حاليًا."}</p>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-7 text-brand-muted">
              {isError ? "جرّب التحديث، ولو المشكلة مستمرة تقدر تتواصل معانا على واتساب." : "ادخل على صفحة المنتجات أو ارجع تاني بعد تحديث الكتالوج."}
            </p>
            <button type="button" onClick={() => productsQuery.refetch()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-black text-brand-blue hover:border-brand-blue hover:bg-brand-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25">
              <RefreshCw size={16} aria-hidden="true" />
              حاول تاني
            </button>
          </div>
        )}

        <a href="/products#feed" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-blue/20 bg-white px-4 py-2 text-sm font-black text-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 sm:hidden">
          عرض كل المنتجات <ArrowLeft size={16} aria-hidden="true" />
        </a>
      </div>

      <ProductDetailsDialog
        product={openProduct}
        relatedProducts={related}
        onSelectProduct={setOpenProduct}
        onClose={() => setOpenProduct(null)}
      />
    </section>
  );
}
