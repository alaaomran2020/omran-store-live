import { useEffect, useMemo, useState } from "react";
import { fallbackImageUrl, type Product } from "@shared/products";
import { ImageOff } from "lucide-react";

const RAW_PUBLIC_BASE =
  "https://raw.githubusercontent.com/alaaomran2020/omran-store-live/main/public";

function repositoryAssetFallback(image: string | null | undefined): string | null {
  if (!image || !image.startsWith("/")) return null;
  return `${RAW_PUBLIC_BASE}${image}`;
}

/**
 * صورة منتج آمنة متعددة المراحل.
 *
 * تسلسل المحاولات:
 *   1. صورة المتجر الأساسية (same-origin عندما تكون متاحة).
 *   2. مصدر الصورة البديل، بما في ذلك Google Drive بعد تحويله لصيغة عرض مباشرة.
 *   3. نسخة asset المطابقة من مستودع GitHub كشبكة أمان عند تعثّر Cloudflare/CDN.
 *   4. لوحة بديلة بهوية الموقع — لا صورة مكسورة ولا مربع فارغ.
 *
 * الهدف: المنتج لا يظهر للمستخدم بصورة مكسورة طالما توجد نسخة موثقة من الأصل.
 */
export function ProductImage({
  product,
  className = "",
  sizesHint,
  priority = false,
}: {
  product: Pick<Product, "image" | "imageSource" | "name">;
  className?: string;
  sizesHint?: string;
  priority?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [product.image, product.imageSource]);

  const candidates = useMemo(() => {
    const values = [
      product.image ?? null,
      fallbackImageUrl(product.imageSource),
      repositoryAssetFallback(product.image),
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(values));
  }, [product.image, product.imageSource]);

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
