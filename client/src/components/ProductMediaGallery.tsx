import { useEffect, useMemo, useState } from "react";
import { Maximize2, Play } from "lucide-react";
import type { Product } from "@/lib/productsClient";
import { ProductImage } from "./ProductImage";

export function ProductMediaGallery({ product }: { product: Product }) {
  const images = useMemo(() => Array.from(new Set([product.image, ...product.galleryImages].filter((value): value is string => Boolean(value)))), [product.image, product.galleryImages]);
  const [selected, setSelected] = useState(images[0] ?? null);
  const [zoomed, setZoomed] = useState(false);
  const selectedProduct = { ...product, image: selected, processedImage: selected };

  useEffect(() => {
    setSelected(images[0] ?? null);
    setZoomed(false);
  }, [product.id, images]);

  return (
    <div>
      <button type="button" onClick={() => setZoomed(value => !value)} aria-pressed={zoomed} aria-label={zoomed ? "إلغاء تكبير الصورة" : "تكبير الصورة"} className="group relative block aspect-square w-full overflow-hidden rounded-2xl border border-brand-border bg-brand-cream">
        <ProductImage product={selectedProduct} priority className={`h-full w-full object-contain transition duration-300 ${zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"}`} sizesHint="(max-width: 768px) 100vw, 50vw" />
        <span className="absolute bottom-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/85 text-white"><Maximize2 size={17} aria-hidden="true" /></span>
      </button>
      {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="صور المنتج">
        {images.map((image, index) => <button key={image} type="button" onClick={() => { setSelected(image); setZoomed(false); }} aria-label={`عرض صورة المنتج رقم ${index + 1}`} aria-pressed={selected === image} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${selected === image ? "border-brand-blue" : "border-brand-border"}`}><ProductImage product={{ ...product, image, processedImage: image }} className="h-full w-full object-contain" sizesHint="64px" /></button>)}
      </div>}
      {product.videoUrl && <div className="mt-4 overflow-hidden rounded-2xl border border-brand-border bg-black">
        <video controls preload="none" playsInline poster={product.videoPoster ?? undefined} className="aspect-video w-full object-contain" aria-label={`فيديو ${product.name}`}><source src={product.videoUrl} /></video>
        <p className="flex items-center gap-2 bg-white px-3 py-2 text-xs font-bold text-brand-navy"><Play size={14} aria-hidden="true" /> فيديو مرتبط بالكود {product.sku || product.id}{product.videoDuration ? ` · ${product.videoDuration}` : ""}</p>
      </div>}
    </div>
  );
}
