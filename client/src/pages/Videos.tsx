import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import { SeoMetadata } from "@/components/SeoMetadata";
import SiteFooter from "@/components/SiteFooter";
import { filterProductsByCatalog } from "@/lib/productCatalog";
import { fetchProducts } from "@/lib/productsClient";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

export default function Videos() {
  const query = useQuery({ queryKey: ["products"], queryFn: fetchProducts, staleTime: Infinity });
  const videos = filterProductsByCatalog(query.data?.products ?? [], "toys").filter(product => product.videoUrl);

  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <SeoMetadata
        path="/videos"
        title="فيديوهات لعب الأطفال | عمران تويز"
        description="شاهد فيديوهات لعب الأطفال المتاحة من عمران تويز قبل الاستفسار عن التوفر والكميات."
      />
      <AnnouncementBar />
      <BrandHeader />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="container py-10 sm:py-16">
        <p className="text-sm font-bold text-brand-red">فيديوهات المنتجات</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">شوف اللعبة وهي بتشتغل</h1>
        <p className="mt-3 max-w-2xl leading-7 text-brand-muted">شوف فيديوهات الألعاب المتاحة واختار الأنسب ليك بسهولة.</p>
        {videos.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {videos.map(product => (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-brand-border bg-white">
                <video controls preload="none" playsInline poster={product.videoPoster ?? undefined} className="aspect-video w-full bg-black object-contain">
                  <source src={product.videoUrl!} />
                </video>
                <div className="p-4">
                  <p className="font-extrabold text-brand-navy">{product.name}</p>
                  <p className="mt-1 text-xs font-bold text-brand-muted" dir="ltr">SKU: {product.sku || product.id}{product.videoDuration ? ` · ${product.videoDuration}` : ""}</p>
                  <a href={`/products?product=${encodeURIComponent(product.id)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white">
                    <Play size={16} aria-hidden="true" /> عرض المنتج
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center">
            <Play className="mx-auto text-brand-blue" aria-hidden="true" />
            <p className="mt-3 font-extrabold text-brand-navy">الفيديوهات هتتوفر قريب</p>
            <p className="mt-2 text-sm text-brand-muted">تابع الصفحة عشان تشوف فيديوهات أحدث الألعاب أول ما تتوفر.</p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
