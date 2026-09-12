import { useEffect, useMemo, useState } from "react";
import {
  fallbackImageUrl,
  localThumbnailPath,
  toDisplayableImageUrl,
  type Product,
} from "@shared/products";
import { ImageOff } from "lucide-react";

const RAW_PUBLIC_BASE = "https://raw.githubusercontent.com/alaaomran2020/omran-store-live/main/public";

/** Drive thumbnail width per render size: cards must not pay for a 1000px asset. */
const DRIVE_WIDTH: Record<ProductImageSize, number> = { full: 1000, thumb: 480 };

export type ProductImageSize = "full" | "thumb";

function repositoryAssetFallback(image: string): string | null {
  return image.startsWith("/") && !image.startsWith("//") ? `${RAW_PUBLIC_BASE}${image}` : null;
}

function isLocalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

/**
 * Ordered URL candidates for one declared image source at one render size.
 *
 * `thumb` prefers the local 480px variant (cards) and Drive `w480` thumbnails;
 * `full` keeps the historical w1000/default behavior for the details dialog.
 * Every candidate that can 404 is followed by the next-best source, so a
 * missing local thumbnail degrades to the full-size source automatically.
 */
export function imageSourceCandidates(source: string, size: ProductImageSize): string[] {
  const width = DRIVE_WIDTH[size];
  if (isLocalPath(source)) {
    const candidates: string[] = [];
    if (size === "thumb") {
      const thumb = localThumbnailPath(source);
      if (thumb) candidates.push(thumb);
    }
    candidates.push(source);
    const raw = repositoryAssetFallback(source);
    if (raw) {
      if (size === "thumb") {
        const rawThumb = localThumbnailPath(source);
        if (rawThumb) candidates.push(`${RAW_PUBLIC_BASE}${rawThumb}`);
      }
      candidates.push(raw);
    }
    return candidates;
  }
  const displayable = toDisplayableImageUrl(source, width);
  const fallback = fallbackImageUrl(source, width);
  return [displayable, fallback].filter((value): value is string => Boolean(value));
}

/** Only use declared product media. Never guess a filename from an SKU. */
export function productImageCandidates(
  product: Pick<Product, "image" | "imageSource" | "processedImage">,
  size: ProductImageSize = "full"
): string[] {
  const declared = [product.processedImage, product.image, product.imageSource];
  const sources = declared.filter((value): value is string => Boolean(value));
  return Array.from(new Set(sources.flatMap(source => imageSourceCandidates(source, size))));
}

export function ProductImage({
  product,
  className = "",
  sizesHint,
  priority = false,
  size = "full",
}: {
  product: Pick<Product, "id" | "image" | "imageSource" | "processedImage" | "name">;
  className?: string;
  sizesHint?: string;
  priority?: boolean;
  /** `thumb` requests the 480px card variant; `full` (default) the dialog-size source. */
  size?: ProductImageSize;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const candidates = useMemo(
    () => productImageCandidates(product, size),
    [product.image, product.imageSource, product.processedImage, size]
  );
  const mediaKey = `${size}:${candidates.join("\n")}`;

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
  }, [product.id, mediaKey]);

  const src = candidates[attempt] ?? null;
  if (!src) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#d1fae5,transparent_55%),linear-gradient(135deg,#f7f3ec,#ffffff)] ${className}`}
        role="img"
        aria-label={`لا توجد صورة متاحة للمنتج ${product.name}`}
      >
        <ImageOff size={44} className="text-emerald-800/40" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      key={`${product.id}:${src}`}
      src={src}
      alt={product.name}
      width={1200}
      height={1200}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      sizes={sizesHint}
      referrerPolicy="no-referrer"
      draggable={false}
      data-image-attempt={attempt + 1}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        setAttempt(current => current + 1);
      }}
      className={`${className} transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
