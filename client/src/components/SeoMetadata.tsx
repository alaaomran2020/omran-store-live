import { useEffect } from "react";
import type { Product } from "@/lib/productsClient";

const SITE_ORIGIN = "https://omrantoys.store";
const DEFAULT_TITLE = "شركة عمران التجارية | لعب أطفال وهدايا";
const DEFAULT_DESCRIPTION =
  "شركة عمران التجارية — لعب أطفال وهدايا. اكتشف المنتجات والصور والتفاصيل وتواصل مباشرة عبر واتساب للاستفسار عن السعر والتوفر.";

function ensureMeta(property: string, value: string, attribute: "name" | "property" = "property") {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, property);
    document.head.appendChild(element);
  }
  element.content = value;
}

function ensureCanonical(url: string) {
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

export function SeoMetadata({
  path,
  title,
  description,
}: {
  path: "/products" | "/popup";
  title: string;
  description: string;
}) {
  useEffect(() => {
    const canonicalUrl = `${SITE_ORIGIN}${path}`;

    document.title = title;
    ensureCanonical(canonicalUrl);
    ensureMeta("description", description, "name");
    ensureMeta("og:type", "website");
    ensureMeta("og:title", title);
    ensureMeta("og:description", description);
    ensureMeta("og:url", canonicalUrl);

    return () => {
      document.title = DEFAULT_TITLE;
      ensureCanonical(`${SITE_ORIGIN}/`);
      ensureMeta("description", DEFAULT_DESCRIPTION, "name");
      ensureMeta("og:type", "website");
      ensureMeta("og:title", DEFAULT_TITLE);
      ensureMeta("og:description", DEFAULT_DESCRIPTION);
      ensureMeta("og:url", `${SITE_ORIGIN}/`);
    };
  }, [description, path, title]);

  return null;
}

function absoluteUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value, SITE_ORIGIN).toString();
  } catch {
    return null;
  }
}

function isVerifiedPublicProduct(product: Product): boolean {
  return product.active && product.workflowStatus === "PUBLISHED" && product.qaStatus === "PASS";
}

export function ProductStructuredData({
  product,
  catalogPath,
}: {
  product: Product | null;
  catalogPath: "/products" | "/popup";
}) {
  useEffect(() => {
    const id = "omran-product-jsonld";
    document.getElementById(id)?.remove();

    if (!product || !isVerifiedPublicProduct(product)) return;

    const images = Array.from(
      new Set(
        [product.processedImage, product.image, ...product.galleryImages]
          .map(absoluteUrl)
          .filter((value): value is string => Boolean(value))
      )
    );

    const productUrl = new URL(`${SITE_ORIGIN}${catalogPath}`);
    productUrl.searchParams.set("product", product.id);

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${productUrl.toString()}#product`,
      name: product.name,
      url: productUrl.toString(),
    };

    if (product.sku) schema.sku = product.sku;
    if (product.description) schema.description = product.description;
    if (product.category) schema.category = product.category;
    if (images.length) schema.image = images;

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, [catalogPath, product]);

  return null;
}
