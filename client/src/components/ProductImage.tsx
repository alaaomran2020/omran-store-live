import { useEffect, useState } from "react";
import { fallbackImageUrl, type Product } from "@shared/products";
import { ImageOff } from "lucide-react";

/**
 * صورة منتج آمنة.
 *
 * تسلسل المحاولات:
 *   1. الرابط بعد التحويل (روابط Google Drive تتحول إلى صيغة thumbnail المباشرة).
 *   2. نسخة googleusercontent من نفس ملف Drive (عند تعثّر الأولى).
 *   3. لوحة بديلة بهوية الموقع — لا صورة مكسورة ولا مربع فارغ.
 *
 * `<img>` عادي مع lazy-loading: المشروع Vite/React (ليس Next.js) فلا يوجد
 * next/image، وهذه هي الصيغة المستخدمة أصلًا في الموقع.
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

  // تغيّر المنتج (نافذة التفاصيل مثلًا) يعيد ضبط سلسلة المحاولات.
  useEffect(() => {
    setAttempt(0);
  }, [product.image, product.imageSource]);

  const secondary = fallbackImageUrl(product.imageSource);
  const src = attempt === 0 ? product.image : attempt === 1 ? secondary : null;

  if (!src) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#d1fae5,transparent_55%),linear-gradient(135deg,#f7f3ec,#ffffff)] ${className}`}
        role="img"
        aria-label={`لا توجد صورة للمنتج ${product.name}`}
      >
        <ImageOff
          size={44}
          className="text-emerald-800/40"
          aria-hidden="true"
        />
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
