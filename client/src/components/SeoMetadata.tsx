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

function readMeta(property: string, attribute: "name" | "property" = "property"): string {
  return document.querySelector<HTMLMetaElement>(`meta[${attribute}="${property}"]`)?.content ?? "";
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

function currentCanonical(): string {
  return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? `${SITE_ORIGIN}/`;
}

export function SeoMetadata({
  path,
  title,
  description,
}: {
  path: `/${string}`;
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
    ensureMeta("twitter:card", "summary_large_image", "name");
    ensureMeta("twitter:title", title, "name");
    ensureMeta("twitter:description", description, "name");

    return () => {
      document.title = DEFAULT_TITLE;
      ensureCanonical(`${SITE_ORIGIN}/`);
      ensureMeta("description", DEFAULT_DESCRIPTION, "name");
      ensureMeta("og:type", "website");
      ensureMeta("og:title", DEFAULT_TITLE);
      ensureMeta("og:description", DEFAULT_DESCRIPTION);
      ensureMeta("og:url", `${SITE_ORIGIN}/`);
      ensureMeta("twitter:title", DEFAULT_TITLE, "name");
      ensureMeta("twitter:description", DEFAULT_DESCRIPTION, "name");
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
    const productCanonical = productUrl.toString();
    const productTitle = `${product.name} | ${catalogPath === "/popup" ? "POP UP" : "عمران تويز"}`;
    const productDescription = product.description?.trim() || DEFAULT_DESCRIPTION;

    const previous = {
      title: document.title,
      canonical: currentCanonical(),
      description: readMeta("description", "name"),
      ogType: readMeta("og:type"),
      ogTitle: readMeta("og:title"),
      ogDescription: readMeta("og:description"),
      ogUrl: readMeta("og:url"),
      ogImage: readMeta("og:image"),
      twitterTitle: readMeta("twitter:title", "name"),
      twitterDescription: readMeta("twitter:description", "name"),
      twitterImage: readMeta("twitter:image", "name"),
    };

    document.title = productTitle;
    ensureCanonical(productCanonical);
    ensureMeta("description", productDescription, "name");
    ensureMeta("og:type", "product");
    ensureMeta("og:title", productTitle);
    ensureMeta("og:description", productDescription);
    ensureMeta("og:url", productCanonical);
    ensureMeta("twitter:title", productTitle, "name");
    ensureMeta("twitter:description", productDescription, "name");
    if (images[0]) {
      ensureMeta("og:image", images[0]);
      ensureMeta("twitter:image", images[0], "name");
    }

    const productSchema: Record<string, unknown> = {
      "@type": "Product",
      "@id": `${productCanonical}#product`,
      name: product.name,
      url: productCanonical,
    };

    if (product.sku) productSchema.sku = product.sku;
    if (product.description) productSchema.description = product.description;
    if (product.category) productSchema.category = product.category;
    if (images.length) productSchema.image = images;

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        productSchema,
        {
          "@type": "BreadcrumbList",
          "@id": `${productCanonical}#breadcrumbs`,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "الرئيسية",
              item: `${SITE_ORIGIN}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: catalogPath === "/popup" ? "POP UP" : "لعب الأطفال",
              item: `${SITE_ORIGIN}${catalogPath}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: product.name,
              item: productCanonical,
            },
          ],
        },
      ],
    };

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
      document.title = previous.title;
      ensureCanonical(previous.canonical);
      ensureMeta("description", previous.description, "name");
      ensureMeta("og:type", previous.ogType || "website");
      ensureMeta("og:title", previous.ogTitle);
      ensureMeta("og:description", previous.ogDescription);
      ensureMeta("og:url", previous.ogUrl);
      if (previous.ogImage) ensureMeta("og:image", previous.ogImage);
      ensureMeta("twitter:title", previous.twitterTitle, "name");
      ensureMeta("twitter:description", previous.twitterDescription, "name");
      if (previous.twitterImage) ensureMeta("twitter:image", previous.twitterImage, "name");
    };
  }, [catalogPath, product]);

  return null;
}
