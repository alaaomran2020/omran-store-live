import { useEffect, useMemo, useState } from "react";
import { fallbackImageUrl, type Product } from "@shared/products";
import { ImageOff } from "lucide-react";

const RAW_PUBLIC_BASE =
  "https://raw.githubusercontent.com/alaaomran2020/omran-store-live/main/public";

function repositoryAssetFallback(image: string | null | undefined): string | null {
  if (!image || !image.startsWith("/")) return null;
  return `${RAW_PUBLIC_BASE}${image}`;
}

function safeProductSlug(id: string | null | undefined): string | null {
  if (!id) return null;
  const slug = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

function generatedProductAsset(id: string | null | undefined): string | null {
  const slug = safeProductSlug(id);
  return slug ? `/products/processed/generated/product-${slug}-main.webp` : null;
}

/**
 * صورة منتج آمنة متعددة المراحل.
 *
 * ترتيب التحميل يفضّل أصول المتجر نفسها قبل أي مصدر خارجي:
 *   1. الصورة المحلية المعلنة في الكتالوج إن وجدت.
 *   2. processedImage المحلية إن وجدت.
 *   3. المسار المحلي القياسي المبني من product_id.
 *   4. رابط الصورة الأصلي/الخارجي.
 *   5. Google Drive بعد تحويله لصيغة عرض مباشرة.
 *   6. نسخة GitHub raw للأصول المحلية كشبكة أمان أخيرة.
 *   7. Placeholder فقط إذا فشلت كل المصادر.
 *
 * هذا يمنع منتجات الكتالوج الحي من فقد الصورة عندما يكون ملفها الموثق
 * موجودًا بالفعل ضمن Cloudflare Pages assets حتى لو كان رابط Drive متعثرًا.
 */
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

  useEffect(() => {
    setAttempt(0);
  }, [product.id, product.image, product.imageSource, product.processedImage]);

  const candidates = useMemo(() => {
    const localImage = product.image?.startsWith("/") ? product.image : null;
    const localProcessed = product.processedImage?.startsWith("/")
      ? product.processedImage
      : null;
    const conventionalLocal = generatedProductAsset(product.id);
    const remoteImage = product.image && !product.image.startsWith("/") ? product.image : null;
    const sourceFallback = fallbackImageUrl(product.imageSource);

    const localCandidates = [localImage, localProcessed, conventionalLocal].filter(
      (value): value is string => Boolean(value)
    );

    const values = [
      ...localCandidates,
      remoteImage,
      sourceFallback,
      ...localCandidates.map(repositoryAssetFallback),
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(values));
  }, [product.id, product.image, product.imageSource, product.processedImage]);

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
