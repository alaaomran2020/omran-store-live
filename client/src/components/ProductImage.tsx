import { useEffect, useMemo, useState } from "react";
import { toDisplayableImageUrl, fallbackImageUrl, type Product } from "@shared/products";
import { ImageOff } from "lucide-react";

const RAW_PUBLIC_BASE = "https://raw.githubusercontent.com/alaaomran2020/omran-store-live/main/public";

function responsiveSrcSet(src: string): string | undefined {
  if (!src.startsWith("/") || !/\.webp(?:\?.*)?$/i.test(src) || /-(320|640|960)\.webp(?:\?.*)?$/i.test(src)) return undefined;
  const [path, query = ""] = src.split("?");
  const suffix = query ? `?${query}` : "";
  const base = path.replace(/\.webp$/i, "");
  return [320, 640, 960].map(width => `${base}-${width}.webp${suffix} ${width}w`).join(", ");
}
function repositoryAssetFallback(image: string): string | null {
  return image.startsWith("/") && !image.startsWith("//") ? `${RAW_PUBLIC_BASE}${image}` : null;
}

/** Only use declared product media. Never guess a filename from an SKU. */
export function productImageCandidates(
  product: Pick<Product, "image" | "imageSource" | "processedImage">
): string[] {
  const declared = [product.processedImage, product.image, product.imageSource];
  const local = declared.filter(
    (value): value is string => Boolean(value?.startsWith("/") && !value.startsWith("//"))
  );
  const remote = declared
    .map(value => toDisplayableImageUrl(value))
    .filter((value): value is string => Boolean(value));
  const driveFallbacks = declared
    .map(value => fallbackImageUrl(value))
    .filter((value): value is string => Boolean(value));

  return Array.from(
    new Set(
      [...local, ...remote, ...driveFallbacks, ...local.map(repositoryAssetFallback)].filter(
        (value): value is string => Boolean(value)
      )
    )
  );
}

export function ProductImage({
  product,
  className = "",
  sizesHint,
  priority = false,
}: {
  product: Pick<Product, "id" | "image" | "imageSource" | "processedImage" | "name">;
  className?: string;
  sizesHint?: string;
  priority?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const candidates = useMemo(
    () => productImageCandidates(product),
    [product.image, product.imageSource, product.processedImage]
  );
  const mediaKey = candidates.join("\n");

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
  }, [product.id, mediaKey]);

  const src = candidates[attempt] ?? null;
  const srcSet = src ? responsiveSrcSet(src) : undefined;
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
      srcSet={srcSet}
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
