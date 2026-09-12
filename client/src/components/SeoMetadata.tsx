/**
 * SEO metadata manager — نظام واحد مركزي لإدارة `<head>` في الـSPA.
 *
 * القواعد:
 *   - عنصر واحد لكل شيء: canonical واحد، description واحد، robots واحد،
 *     وقيم OG/Twitter واحدة — أي تطبيق متجدد يحدّث العناصر الحالية بدل تكرارها.
 *   - دورة حياة كاملة: كل تطبيق يمسح الحالة ويحفظ ما قبله، وعند الخروج من
 *     الصفحة/المنتج تعود الحالة السابقة (لا metadata متبقية من صفحة أخرى).
 *   - لا بيانات مختلقة: لا سعر ولا مخزون ولا تقييمات — المتجر حالياً
 *     "بدون سعر — واتساب فقط"، وProduct JSON-LD يعرض البيانات الحقيقية فقط.
 *   - POP UP معزول: مسار وقسم وعنوان مختلف عن متجر لعب الأطفال، ولا يتسرب
 *     أي طرف إلى الآخر.
 *
 * ملاحظة مهمة (Known Limitation): هذا النظام يحدّث الـhead بعد hydration؛
 * الـHTML الأولي يبقى فيه fallback عام من `client/index.html`.
 */

import { useEffect } from "react";
import type { Product } from "@/lib/productsClient";
import { displayCategoryName } from "@shared/taxonomy";
import { isPubliclyVisible } from "@shared/products";
import {
  BRAND_NAME,
  DESCRIPTION_MAX_LENGTH,
  HOME_DESCRIPTION,
  HOME_TITLE,
  POPUP_NAME,
  SITE_LOCALE,
  SITE_ORIGIN,
  SITE_URL,
  SOCIAL_FALLBACK_IMAGE,
  STORE_NAME,
  TITLE_MAX_LENGTH,
} from "@shared/site";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureMeta(property: string, value: string | null, attribute: "name" | "property" = "property") {
  const selector = `meta[${attribute}="${property}"]`;
  let element = document.querySelector<HTMLMetaElement>(selector);
  if (value === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, property);
    document.head.appendChild(element);
  }
  element.content = value;
}

function readMeta(property: string, attribute: "name" | "property" = "property"): string {
  return document.querySelector<HTMLMetaElement>(`meta[${attribute}="${property}"]`)?.content ?? "";
}

function setCanonical(url: string) {
  // لا يوجد أكثر من canonical في أي وقت.
  const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
  let canonical = existing[0] ?? null;
  for (const extra of existing.slice(1)) extra.remove();
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function currentCanonical(): string {
  return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? SITE_URL;
}

function safeAbsoluteUrl(value: string | null | undefined, origin: string = SITE_ORIGIN): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // نقبل فقط: http(s) مطلق، أو مسار نسبي يبدأ بمشرطة واحدة.
  // نرفض data:/blob:/javascript:/protocol-relative/fileystem paths/localhost.
  try {
    const absolute = new URL(trimmed, origin);
    if (!/^https?:$/.test(absolute.protocol)) return null;
    if (["localhost", "0.0.0.0", "127.0.0.1"].includes(absolute.hostname)) return null;
    if (/^blob:|^data:|^file:/.test(trimmed)) return null;
    if (trimmed.startsWith("/mnt/") || trimmed.startsWith("//")) return null;
    return absolute.toString();
  } catch {
    return null;
  }
}

/** تنظيف نص الوصف: إزالة وسم HTML، ضغط الفراغات، وحد أقصى بقطع عند كلمة. */
export function cleanDescriptionText(value: string | null | undefined, maxLength: number = DESCRIPTION_MAX_LENGTH): string {
  const withoutTags = (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutTags.length <= maxLength) return withoutTags;
  const cut = withoutTags.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** عنوان آمن: يحمي الاسم الحقيقي من النفخ ويقطع فقط داخل الـmetadata. */
export function buildPageTitle(primary: string, suffix: string, maxLength: number = TITLE_MAX_LENGTH): string {
  const cleanPrimary = primary.replace(/\s+/g, " ").trim();
  const full = `${cleanPrimary} | ${suffix}`;
  if (full.length <= maxLength) return full;
  const budget = maxLength - suffix.length - 3; // " | "
  if (budget < 10) return cleanPrimary.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…";
  const cut = cleanPrimary.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  const truncated = (lastSpace > budget * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${truncated}… | ${suffix}`;
}

const JSON_LD_PRODUCT_ID = "omran-product-jsonld";

type HeadSnapshot = {
  title: string;
  canonical: string;
  description: string;
  robots: string;
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogLocale: string;
  ogSiteName: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
};

function captureHeadState(): HeadSnapshot {
  return {
    title: document.title,
    canonical: currentCanonical(),
    description: readMeta("description", "name"),
    robots: readMeta("robots", "name"),
    ogType: readMeta("og:type"),
    ogTitle: readMeta("og:title"),
    ogDescription: readMeta("og:description"),
    ogUrl: readMeta("og:url"),
    ogImage: readMeta("og:image"),
    ogLocale: readMeta("og:locale"),
    ogSiteName: readMeta("og:site_name"),
    twitterCard: readMeta("twitter:card", "name"),
    twitterTitle: readMeta("twitter:title", "name"),
    twitterDescription: readMeta("twitter:description", "name"),
    twitterImage: readMeta("twitter:image", "name"),
  };
}

function restoreHeadState(state: HeadSnapshot) {
  document.title = state.title;
  setCanonical(state.canonical);
  ensureMeta("description", state.description || null, "name");
  ensureMeta("robots", state.robots || null, "name");
  ensureMeta("og:type", state.ogType || null);
  ensureMeta("og:title", state.ogTitle || null);
  ensureMeta("og:description", state.ogDescription || null);
  ensureMeta("og:url", state.ogUrl || null);
  ensureMeta("og:image", state.ogImage || null);
  ensureMeta("og:locale", state.ogLocale || null);
  ensureMeta("og:site_name", state.ogSiteName || null);
  ensureMeta("twitter:card", state.twitterCard || null, "name");
  ensureMeta("twitter:title", state.twitterTitle || null, "name");
  ensureMeta("twitter:description", state.twitterDescription || null, "name");
  ensureMeta("twitter:image", state.twitterImage || null, "name");
}

/** يضع/يحذف meta robots الحالي — عنصر واحد فقط في أي وقت. */
export function setRobotsMeta(robots: string | null) {
  ensureMeta("robots", robots, "name");
}

/** حالة الصفحة الرئيسية (fallback العام) — تُستعمل عند أي خروج من صفحة/منتج. */
export const HOME_METADATA: PageMetadata = {
  path: "/",
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  robots: null,
  ogType: "website",
  ogImage: SOCIAL_FALLBACK_IMAGE,
};

export type PageMetadata = {
  /** مسار الصفحة بدون query — هو ما يدخل canonical. */
  path: string;
  title: string;
  description: string;
  robots?: string | null;
  ogType?: "website" | "product";
  ogImage?: string | null;
};

/**
 * يطبّق metadata كاملة لعنوان (canonical/OG/Twitter/robots) ويحفظ snapshot
 * للحالة السابقة. الإرجاع: دالة restore للرجوع.
 */
export function applyPageMetadata(metadata: PageMetadata): () => void {
  const previous = captureHeadState();

  const canonicalUrl = `${SITE_ORIGIN}${metadata.path}`;
  const description = cleanDescriptionText(metadata.description);
  const ogImage = safeAbsoluteUrl(metadata.ogImage ?? null) ?? SOCIAL_FALLBACK_IMAGE;
  const ogType = metadata.ogType ?? "website";

  document.title = metadata.title;
  setCanonical(canonicalUrl);
  ensureMeta("description", description, "name");
  ensureMeta("robots", metadata.robots ?? null, "name");
  ensureMeta("og:type", ogType);
  ensureMeta("og:site_name", BRAND_NAME);
  ensureMeta("og:title", metadata.title);
  ensureMeta("og:description", description);
  ensureMeta("og:url", canonicalUrl);
  ensureMeta("og:image", ogImage);
  ensureMeta("og:locale", SITE_LOCALE);
  ensureMeta("twitter:card", "summary_large_image", "name");
  ensureMeta("twitter:title", metadata.title, "name");
  ensureMeta("twitter:description", description, "name");
  ensureMeta("twitter:image", ogImage, "name");

  return () => restoreHeadState(previous);
}

/**
 * المكوّن القياسي: يطبّق metadata الصفحة أثناء الوجود، ويعيد حالة
 * الصفحة الرئيسية عند الخروج — فلا تبقى metadata من أي صفحة سابقة.
 */
export function SeoMetadata(metadata: PageMetadata) {
  const { path, title, description, robots, ogType, ogImage } = metadata;

  useEffect(() => {
    const restore = applyPageMetadata({ path, title, description, robots, ogType, ogImage });
    return restore;
  }, [path, title, description, robots, ogType, ogImage]);

  useEffect(() => {
    // عند التفكيك الكامل (تغيير route) نعيد fallback الصفحة الرئيسية.
    return () => {
      applyPageMetadata({ ...HOME_METADATA, ogType: "website", ogImage: SOCIAL_FALLBACK_IMAGE });
    };
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// Product metadata + JSON-LD
// ---------------------------------------------------------------------------

function productCatalogLabel(catalogPath: "/products" | "/popup"): string {
  return catalogPath === "/popup" ? POPUP_NAME : STORE_NAME;
}

function productBreadcrumbLabel(catalogPath: "/products" | "/popup"): string {
  return catalogPath === "/popup" ? POPUP_NAME : "لعب الأطفال";
}

function serializeJsonLd(data: unknown): string {
  // JSON.stringify لا يحمي من `</script>` داخل السلاسل — نطبع `<` كـ \u003c.
  return JSON.stringify(data, null, 0).replace(/</g, "\\u003c");
}

/**
 * Product SEO: title/description/canonical/OG + Product JSON-LD + BreadcrumbList.
 *
 * - يعرض البيانات الحقيقية فقط (name/description/sku/brand/category/images).
 * - بدون offer/price/availability/aggregateRating/review — لا بيانات موثقة لها.
 * - بوابte النشر المعتمدة: active + PUBLISHED + PASS (fail-closed).
 */
export function ProductStructuredData({
  product,
  catalogPath,
}: {
  product: Product | null;
  catalogPath: "/products" | "/popup";
}) {
  useEffect(() => {
    // إزالة أي JSON-LD منتج سابق قبل أي شيء (لا تراكم بين المنتجات).
    document.getElementById(JSON_LD_PRODUCT_ID)?.remove();

    if (!product || !isPubliclyVisible(product)) return;

    const id = product.id.trim();
    if (!id) return;

    const catalogLabel = productCatalogLabel(catalogPath);
    const productUrl = `${SITE_ORIGIN}${catalogPath}?product=${encodeURIComponent(id)}`;
    const categoryDisplay = product.category ? displayCategoryName(product.category) : "";

    const images = Array.from(
      new Set(
        [product.processedImage, product.image, ...product.galleryImages]
          .map(value => safeAbsoluteUrl(value))
          .filter((value): value is string => Boolean(value))
      )
    );

    const title = buildPageTitle(product.name, catalogLabel);
    const rawDescription = product.description?.trim() ?? "";
    const description = rawDescription
      ? cleanDescriptionText(rawDescription)
      : cleanDescriptionText(
          [product.name, categoryDisplay ? `${categoryDisplay} من` : "من", catalogLabel]
            .filter(Boolean)
            .join(" ")
        );
    const ogImage = safeAbsoluteUrl(images[0] ?? null) ?? SOCIAL_FALLBACK_IMAGE;

    const previous = captureHeadState();

    applyPageMetadata({
      path: catalogPath,
      title,
      description,
      robots: "index,follow",
      ogType: "product",
      ogImage,
    });
    // canonical يجب أن يحمل رابط المنتج الفعلي (مع ?product=)، لذا نحدّثه بعد apply.
    setCanonical(productUrl);
    ensureMeta("og:url", productUrl);

    const productSchema: Record<string, unknown> = {
      "@type": "Product",
      "@id": `${productUrl}#product`,
      name: product.name,
      url: productUrl,
    };
    if (product.sku?.trim()) productSchema.sku = product.sku.trim();
    if (rawDescription) productSchema.description = cleanDescriptionText(rawDescription, 3000);
    if (categoryDisplay) productSchema.category = categoryDisplay;
    if (product.brand?.trim()) {
      productSchema.brand = { "@type": "Brand", name: product.brand.trim() };
    }
    if (images.length) productSchema.image = images;

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        productSchema,
        {
          "@type": "BreadcrumbList",
          "@id": `${productUrl}#breadcrumbs`,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "الرئيسية",
              item: SITE_URL,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: productBreadcrumbLabel(catalogPath),
              item: `${SITE_ORIGIN}${catalogPath}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: product.name,
              item: productUrl,
            },
          ],
        },
      ],
    };

    const script = document.createElement("script");
    script.id = JSON_LD_PRODUCT_ID;
    script.type = "application/ld+json";
    script.text = serializeJsonLd(schema);
    document.head.appendChild(script);

    return () => {
      document.getElementById(JSON_LD_PRODUCT_ID)?.remove();
      restoreHeadState(previous);
    };
  }, [catalogPath, product]);

  return null;
}
