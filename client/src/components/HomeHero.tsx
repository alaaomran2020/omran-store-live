import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "@/components/ProductImage";
import { getInitialProductsSnapshot, loadPublishedCatalog } from "@/lib/productsClient";
import { filterProductsByCatalog } from "@/lib/productCatalog";
import { productPagePath } from "@shared/productPaths";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { whatsappNumber } from "@/lib/productFormat";

export default function HomeHero() {
  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: () => loadPublishedCatalog(),
    initialData: () => getInitialProductsSnapshot(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  // Use genuine approved product images from different categories where possible.
  // The separate "أحدث منتجاتنا" section keeps its newest-first ordering.
  const recentProducts = filterProductsByCatalog(data?.products ?? [], "toys")
    .filter(product => product.availability !== "unavailable")
    .sort((a, b) => b.rowIndex - a.rowIndex);
  const featured = recentProducts.filter(
    (product, index, items) => items.findIndex(item => item.category === product.category) === index
  ).slice(0, 3);
  for (const product of recentProducts) {
    if (featured.length === 3) break;
    if (!featured.some(item => item.id === product.id)) featured.push(product);
  }
  const number = whatsappNumber();
  const whatsappUrl = number
    ? `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات عمران تويز.")}`
    : null;

  return (
    <section
      data-omran-hero
      className="premium-home-hero border-b border-brand-border bg-brand-cream"
      aria-labelledby="home-hero-title"
    >
      <div className="container premium-hero-layout">
        <div className="premium-hero-copy">
          <p className="text-sm font-black text-brand-blue">
            عمران تويز · شركة عمران التجارية
          </p>
          <h1
            id="home-hero-title"
            className="mt-3 text-3xl font-bold leading-[1.22] text-brand-navy sm:text-4xl"
          >
            <span className="inline">لحظات صغيرة.</span>
            <span className="block text-brand-blue">
              فرحة كبيرة.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm font-bold leading-7 text-brand-muted sm:text-lg sm:leading-8">
            شوف اللعب بوضوح، اختار المناسب، واسأل عن السعر والكميات على واتساب.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/products#feed"
              className="omran-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(18,59,109,.16)] hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 sm:text-base"
            >
              تصفح اللعب
              <ArrowLeft size={18} aria-hidden="true" />
            </a>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackEvent("whatsapp_click", {
                    cta_location: "home_hero",
                    page_location: window.location.href,
                  })
                }
                className="omran-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-3 text-sm font-black text-white hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:text-base"
              >
                <MessageCircle size={18} aria-hidden="true" />
                اسأل على واتساب
              </a>
            )}
          </div>
        </div>
        {featured.length > 0 && (
          <div className="premium-hero-showcase" aria-label="من منتجات عمران">
            <div className="premium-showcase-label"><span>مختارات من عمران</span><span lang="en" dir="ltr">OMRAN / PLAY & DISCOVER</span></div>
            <div className="premium-showcase-grid">
              {featured.map((product, index) => (
                <a key={product.id} href={productPagePath(product.id, "toys")} className={`premium-hero-product ${index === 0 ? "premium-hero-product-main" : ""}`}>
                  <div className="premium-hero-media"><ProductImage product={product} priority={index === 0} className="h-full w-full object-contain" sizesHint={index === 0 ? "(max-width: 767px) 90vw, 40vw" : "(max-width: 767px) 42vw, 20vw"} /></div>
                  <div className="premium-hero-caption"><h2>{product.name}</h2><ArrowLeft size={18} aria-hidden="true" /></div>
                </a>
              ))}
            </div>
            <p className="premium-showcase-footnote">مساحة للخيال. وقت للمرح.</p>
          </div>
        )}
      </div>
    </section>
  );
}
