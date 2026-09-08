import { useEffect, useMemo, useState } from "react";
import { toDisplayableImageUrl, fallbackImageUrl, type Product } from "@shared/products";
import { ImageOff } from "lucide-react";

const RAW_PUBLIC_BASE = "https://raw.githubusercontent.com/alaaomran2020/omran-store-live/main/public";

function repositoryAssetFallback(image: string): string | null {
  return image.startsWith("/") && !image.startsWith("//") ? `${RAW_PUBLIC_BASE}${image}` : null;
}

/** Only use declared product media. Never guess a filename from an SKU. */
export function productImageCandidates(product: Pick<Product, "image" | "imageSource" | "processedImage">): string[] {
  const declared = [product.processedImage, product.image, product.imageSource];
  const local = declared.filter((value): value is string => Boolean(value?.startsWith("/") && !value.startsWith("//")));
  const remote = declared.map(value => toDisplayableImageUrl(value)).filter((value): value is string => Boolean(value));
  const driveFallbacks = declared.map(value => fallbackImageUrl(value)).filter((value): value is string => Boolean(value));
  return Array.from(new Set([...local, ...remote, ...driveFallbacks, ...local.map(repositoryAssetFallback)].filter((value): value is string => Boolean(value))));
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
  const candidates = useMemo(() => productImageCandidates(product), [product.image, product.imageSource, product.processedImage]);
  const mediaKey = candidates.join("\n");

  useEffect(() => {
    setAttempt(0);
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
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      sizes={sizesHint}
      referrerPolicy="no-referrer"
      onError={() => setAttempt(current => current + 1)}
      className={className}
    />
  );
}
