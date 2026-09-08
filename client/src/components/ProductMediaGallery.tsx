import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Play, X } from "lucide-react";
import type { Product } from "@/lib/productsClient";
import { ProductImage } from "./ProductImage";

export function ProductMediaGallery({ product }: { product: Product }) {
  const images = useMemo(
    () =>
      Array.from(
        new Set(
          [product.image, ...product.galleryImages].filter(
            (value): value is string => Boolean(value)
          )
        )
      ),
    [product.image, product.galleryImages]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const selected = images[selectedIndex] ?? null;
  const selectedProduct = { ...product, image: selected, processedImage: selected };
  const hasMultipleImages = images.length > 1;

  const showPrevious = useCallback(() => {
    if (!images.length) return;
    setSelectedIndex(current => (current - 1 + images.length) % images.length);
  }, [images.length]);

  const showNext = useCallback(() => {
    if (!images.length) return;
    setSelectedIndex(current => (current + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    setSelectedIndex(0);
    setLightboxOpen(false);
  }, [product.id, images]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setLightboxOpen(false);
        return;
      }
      if (event.key === "ArrowLeft" && hasMultipleImages) {
        event.preventDefault();
        showNext();
      }
      if (event.key === "ArrowRight" && hasMultipleImages) {
        event.preventDefault();
        showPrevious();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasMultipleImages, lightboxOpen, showNext, showPrevious]);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-brand-border bg-brand-cream">
        <ProductImage
          product={selectedProduct}
          priority
          className="h-full w-full object-contain"
          sizesHint="(max-width: 768px) 100vw, 50vw"
        />

        {selected && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`فتح صورة ${product.name} بالحجم الكامل`}
            className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
          >
            <span className="absolute bottom-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/85 text-white shadow-lg">
              <Maximize2 size={17} aria-hidden="true" />
            </span>
          </button>
        )}

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                showPrevious();
              }}
              aria-label="الصورة السابقة"
              className="absolute right-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-brand-navy shadow-lg ring-1 ring-brand-border transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
            >
              <ChevronRight size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                showNext();
              }}
              aria-label="الصورة التالية"
              className="absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-brand-navy shadow-lg ring-1 ring-brand-border transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
            >
              <ChevronLeft size={19} aria-hidden="true" />
            </button>
          </>
        )}

        {images.length > 0 && (
          <span className="absolute bottom-3 right-3 z-20 rounded-full bg-brand-navy/85 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg">
            {selectedIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1" aria-label="صور المنتج">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`عرض صورة المنتج رقم ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={`h-16 w-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-white transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 ${
                selectedIndex === index ? "border-brand-blue" : "border-brand-border"
              }`}
            >
              <ProductImage
                product={{ ...product, image, processedImage: image }}
                className="h-full w-full object-contain"
                sizesHint="64px"
              />
            </button>
          ))}
        </div>
      )}

      {product.videoUrl && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-brand-border bg-black">
          <video
            controls
            preload="metadata"
            playsInline
            poster={product.videoPoster ?? undefined}
            className="aspect-video w-full object-contain"
            aria-label={`فيديو ${product.name}`}
          >
            <source src={product.videoUrl} />
          </video>
          <p className="flex items-center gap-2 bg-white px-3 py-2 text-xs font-bold text-brand-navy">
            <Play size={14} aria-hidden="true" /> فيديو مرتبط بالكود {product.sku || product.id}
            {product.videoDuration ? ` · ${product.videoDuration}` : ""}
          </p>
        </div>
      )}

      {lightboxOpen && selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`معرض صور ${product.name}`}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-3 sm:p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative flex h-full w-full max-w-6xl items-center justify-center"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="إغلاق عرض الصورة"
              className="absolute left-0 top-0 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label="الصورة السابقة"
                  className="absolute right-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:right-2"
                >
                  <ChevronRight size={24} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="الصورة التالية"
                  className="absolute left-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:left-2"
                >
                  <ChevronLeft size={24} aria-hidden="true" />
                </button>
              </>
            )}

            <div className="flex h-full w-full items-center justify-center px-12 py-14 sm:px-20">
              <ProductImage
                product={selectedProduct}
                priority
                className="max-h-full max-w-full object-contain"
                sizesHint="100vw"
              />
            </div>

            <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm">
              <span>{selectedIndex + 1} / {images.length}</span>
              <span className="max-w-[60vw] truncate">{product.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
