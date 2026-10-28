/**
 * SEO head rendered at build time for each real Cloudflare Pages route.
 * The React SPA still manages runtime metadata, but crawlers must not see every
 * route as the home page before JavaScript runs.
 */
export const PUBLIC_PAGE_SEO = Object.freeze({
  "/products": {
    title: "لعب أطفال وهدايا في طنطا | عمران تويز",
    description: "اكتشف ألعاب الأطفال والهدايا لدى عمران تويز من شركة عمران التجارية في طنطا، وشاهد الصور والتفاصيل واستفسر عن السعر والتوفر عبر واتساب.",
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
 * Lightweight, truthful HTML for search engines and visitors without JS.
 * React replaces #root during boot, so this never duplicates the live UI.
 * Only products passing the existing publication gate are passed by the build.
 */
export function renderCatalogDiscoveryShell(baseHtml, approvedProducts, mode) {
  if (!["home", "toys", "popup"].includes(mode)) throw new Error("Invalid catalog preview mode");
  if (!Array.isArray(approvedProducts)) throw new Error("Missing approved catalog for SEO preview");
  const title = mode === "home" ? "عمران تويز — لعب أطفال وهدايا في طنطا" :
    mode === "popup" ? "POP UP — بالونات وهدايا ومستلزمات حفلات" : "ألعاب الأطفال في عمران تويز";
  const introduction = mode === "home"
    ? "تصفح أحدث منتجات شركة عمران التجارية في طنطا، وشاهد الصور واستفسر عن الأسعار والتوفر عبر واتساب."
    : mode === "popup"
      ? "تصفح بالونات ومنتجات POP UP المنشورة، وشاهد صور المنتجات ثم استفسر عن السعر والتوفر عبر واتساب."
      : "تصفح ألعاب الأطفال المنشورة في عمران تويز، واختر المنتج المناسب ثم استفسر عن السعر والتوفر عبر واتساب.";
  const links = approvedProducts.map((product, index) => {
    if (!product?.id || !/^[A-Za-z0-9_-]+$/.test(product.id) || !product.name?.trim()) return "";
    const catalog = /^(POP-)/i.test(product.id) ? "popup" : "toys";
    const href = (catalog === "popup" ? "/popup/p/" : "/products/p/") + encodeURIComponent(product.id);
    const image = typeof (product.processedImage || product.image) === "string" ? (product.processedImage || product.image) : "";
    const photo = index < 12 && image.startsWith("/products/") && !image.includes("..")
      ? '<img src="' + htmlEscape(image) + '" alt="' + htmlEscape(product.name) + '" width="240" height="240" loading="lazy" decoding="async" /> ' : "";
    return '<li>' + photo + '<a href="' + htmlEscape(href) + '">' + htmlEscape(product.name) + '</a></li>';
  }).join("");
  const body = '<main dir="rtl" aria-label="الكتالوج المعتمد">' +
    '<h1>' + htmlEscape(title) + '</h1><p>' + htmlEscape(introduction) + '</p>' +
    '<nav aria-label="تصفح كتالوج عمران"><a href="/">الرئيسية</a> · <a href="/products">ألعاب الأطفال</a> · <a href="/popup">بالونات وهدايا POP UP</a></nav>' +
    '<section aria-label="المنتجات المنشورة"><h2>منتجات يمكن تصفحها</h2><ul>' + links + '</ul></section>' +
    '</main>';
  return replaceRequired(baseHtml, /<div id="root"><\/div>/i,
    '<div id="root">' + body + '</div>', "catalog root");
}

/**
 * Static product detail head. With WhatsApp-only prices, Product/Offer markup
 * is deliberately not claimed: these are informative WebPage results.
 */
export function renderProductSeoShell(baseHtml, product, catalog, relatedProducts = []) {
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
  // Static product content in #root, not hidden inside <noscript>.
  // Every product therefore has an H1, actual photo, readable description and
  // crawlable internal links even before Google renders the JavaScript app.
  const categoryLabel = String(product.category || "").trim();
  const details = [
    '<main dir="rtl" aria-label="تفاصيل المنتج">',
    '<nav aria-label="مسار تصفح المنتج"><a href="/">الرئيسية</a> · <a href="' +
      section + '">' + (catalog === "popup" ? "POP UP" : "ألعاب الأطفال") + '</a></nav>',
    '<article><h1>' + htmlEscape(name) + '</h1>',
    categoryLabel ? '<p>القسم: ' + htmlEscape(categoryLabel) + '</p>' : '',
    '<img src="' + htmlEscape(image) + '" alt="' + htmlEscape(name) +
      '" width="480" height="480" loading="eager" decoding="async" />',
    '<p>' + htmlEscape(description) + '</p>',
    '<p>كود الصنف: ' + htmlEscape(String(product.sku || product.id)) + '</p>',
    '<p>السعر والتوفر بالاستفسار عبر واتساب.</p></article>',
    '<section aria-label="منتجات مشابهة"><h2>منتجات أخرى من نفس القسم</h2><ul>',
    ...relatedProducts.filter(other => other?.id && other.id !== product.id &&
      /^[A-Za-z0-9_-]+$/.test(other.id) && other.name?.trim()).slice(0, 4)
      .map(other => '<li><a href="' + section + '/p/' +
        encodeURIComponent(other.id) + '">' + htmlEscape(other.name) + '</a></li>'),
    '</ul></section></main>'
  ].join("");
  return replaceRequired(html, /<div id="root"><\/div>/i,
    '<div id="root">' + details + '</div>', "product root");
}
