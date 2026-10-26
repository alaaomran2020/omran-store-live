/**
 * SEO head rendered at build time for each real Cloudflare Pages route.
 * The React SPA still manages runtime metadata, but crawlers must not see every
 * route as the home page before JavaScript runs.
 */
export const PUBLIC_PAGE_SEO = Object.freeze({
  "/products": {
    title: "لعب أطفال | شركة عمران التجارية",
    description: "اكتشف كتالوج لعب الأطفال من شركة عمران التجارية، وشاهد الصور والمواصفات وتواصل عبر واتساب للاستفسار عن السعر والتوفر.",
  },
  "/popup": {
    title: "POP UP – Gifts & Balloons | شركة عمران التجارية",
    description: "هدايا وبالونات ومستلزمات حفلات من POP UP ضمن شركة عمران التجارية.",
  },
  "/popup/videos": {
    title: "فيديوهات POP UP – Gifts & Balloons",
    description: "شاهد فيديوهات POP UP للهدايا والبالونات وتنسيقات المناسبات.",
  },
  "/rewards": {
    title: "مزايا وعروض عمران تويز",
    description: "تابع أحدث المزايا والعروض المتاحة لعملاء عمران تويز.",
  },
  "/vip": {
    title: "برنامج Omran VIP",
    description: "تعرف على كروت Omran VIP ومزاياها وشروط الخصومات لدى عمران تويز والأماكن المشاركة.",
  },
  "/vip/terms": {
    title: "شروط استخدام Omran VIP",
    description: "شروط تفعيل واستخدام واستبدال كروت Omran VIP.",
  },
  "/vip/privacy": {
    title: "خصوصية برنامج Omran VIP",
    description: "إشعار خصوصية برنامج Omran VIP واستخدام بيانات العضوية والكروت.",
  },
});

const ORIGIN = "https://omrantoys.store";

function htmlEscape(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error("Missing SEO head element: " + label);
  return html.replace(pattern, replacement);
}

function replaceMeta(html, attribute, key, value) {
  const pattern = new RegExp('(<meta\\s+' + attribute + '="' + key + '"\\s+content=")[^"]*(")', "i");
  if (!pattern.test(html)) throw new Error("Missing " + attribute + " metadata: " + key);
  return html.replace(pattern, (_match, before, after) => before + htmlEscape(value) + after);
}

function privateRoute(route) {
  return route === "/admin" || route.startsWith("/admin/") ||
    route === "/account" || route.startsWith("/account/") ||
    route === "/vip/qr-test" || route === "/vip/staff-register";
}

export function renderStaticSeoShell(baseHtml, route) {
  const is404 = route === "/404";
  const privatePage = privateRoute(route);
  const metadata = PUBLIC_PAGE_SEO[route] ??
    ((privatePage || is404) ? {
      title: is404 ? "الصفحة غير موجودة | عمران تويز" : "منطقة خاصة | عمران تويز",
      description: is404 ? "هذه الصفحة غير موجودة في متجر عمران تويز." : "صفحة خاصة غير متاحة للفهرسة.",
    } : null);
  if (!metadata) throw new Error("No SEO policy for route " + route);

  let html = replaceRequired(
    baseHtml,
    /<title>[\s\S]*?<\/title>/i,
    "<title>" + htmlEscape(metadata.title) + "</title>",
    "title"
  );
  if (is404) {
    html = replaceRequired(
      html,
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      "",
      "canonical"
    );
  } else {
    html = replaceRequired(
      html,
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      '<link rel="canonical" href="' + ORIGIN + route + '" />',
      "canonical"
    );
  }
  html = replaceMeta(html, "name", "description", metadata.description);
  html = replaceMeta(html, "property", "og:title", metadata.title);
  html = replaceMeta(html, "property", "og:description", metadata.description);
  html = replaceMeta(html, "property", "og:url", is404 ? ORIGIN + "/" : ORIGIN + route);
  html = replaceMeta(html, "name", "twitter:title", metadata.title);
  html = replaceMeta(html, "name", "twitter:description", metadata.description);

  if (privatePage || is404) {
    // A private or missing page may never inherit the home page's indexability.
    html = replaceRequired(
      html,
      /<\/head>/i,
      '  <meta name="robots" content="noindex, nofollow" />\n  </head>',
      "head"
    );
  }
  return html;
}

/**
 * Static product detail head. With WhatsApp-only prices, Product/Offer markup
 * is deliberately not claimed: these are informative WebPage results.
 */
export function renderProductSeoShell(baseHtml, product, catalog) {
  if (!product?.id || !/^[A-Za-z0-9_-]+$/.test(product.id) || !product.name?.trim()) throw new Error("Invalid approved product");
  if (!["toys", "popup"].includes(catalog)) throw new Error("Invalid catalog");
  const section = catalog === "popup" ? "/popup" : "/products";
  const url = ORIGIN + section + "/p/" + encodeURIComponent(product.id);
  const name = product.name.trim();
  const title = [name, catalog === "popup" ? "POP UP" : "عمران تويز"].join(" | ").slice(0, 90);
  // Defence in depth: never put a supplier/wholesale price in SEO,
  // Open Graph, Twitter previews, JSON-LD or the no-JS product fallback.
  const rawDescription = product.description?.trim() || "";
  const publicDescription = rawDescription
    .replace(/(?:^|[.!؟]\s*)سعر\s+(?:الجملة|الشراء|البيع|القطاعي|التجزئة|للتجار)[^.!؟\n]*(?:[.!؟]|$)/giu, ". ")
    .replace(/\s+/g, " ").replace(/^\.\s*/, "").trim();
  const description = (publicDescription || [name, product.category, "للسعر والتوفر تواصل معنا عبر واتساب"].filter(Boolean).join(" — "))
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 160);
  const candidate = product.processedImage || product.image;
  const image = typeof candidate === "string" && candidate.startsWith("/products/") && !candidate.includes("..") ? ORIGIN + candidate : ORIGIN + "/brand/logo.png";
  let html = renderStaticSeoShell(baseHtml, section);
  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/i, "<title>" + htmlEscape(title) + "</title>", "product title");
  html = replaceRequired(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, '<link rel="canonical" href="' + htmlEscape(url) + '" />', "product canonical");
  html = replaceMeta(html, "name", "description", description);
  html = replaceMeta(html, "property", "og:title", title);
  html = replaceMeta(html, "property", "og:description", description);
  html = replaceMeta(html, "property", "og:url", url);
  html = replaceMeta(html, "property", "og:image", image);
  html = replaceMeta(html, "name", "twitter:title", title);
  html = replaceMeta(html, "name", "twitter:description", description);
  html = replaceMeta(html, "name", "twitter:image", image);
  const structured = {
    "@context": "https://schema.org", "@graph": [
      { "@type": "WebPage", "@id": url + "#webpage", url, name, description,
        inLanguage: "ar-EG", primaryImageOfPage: { "@type": "ImageObject", contentUrl: image } },
      { "@type": "BreadcrumbList", "@id": url + "#breadcrumbs", itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: catalog === "popup" ? "POP UP" : "لعب الأطفال", item: ORIGIN + section },
        { "@type": "ListItem", position: 3, name, item: url }
      ] }
    ]
  };
  html = replaceRequired(html, /<\/head>/i, '  <script id="omran-product-jsonld" type="application/ld+json">' + JSON.stringify(structured).replace(/</g, "\\u003c") + '</script>\n  </head>', "product head");
  return replaceRequired(html, /<\/body>/i, '<noscript><main dir="rtl"><h1>' + htmlEscape(name) + '</h1><p>' + htmlEscape(description) + '</p><p>السعر والتوفر عبر واتساب</p></main></noscript>\n  </body>', "product body");
}
