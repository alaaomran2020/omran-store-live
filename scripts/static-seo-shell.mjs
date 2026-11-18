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
    description: "تعرّف على هدايا وبالونات ومستلزمات الحفلات لدى POP UP – Gifts & Balloons من شركة عمران التجارية، وتصفح المنتجات وفيديوهات تنسيقات المناسبات.",
  },
  "/popup/videos": {
    title: "فيديوهات هدايا وبالونات POP UP | شركة عمران التجارية",
    description: "شاهد فيديوهات POP UP – Gifts & Balloons التي تعرض الهدايا والبالونات وتنسيقات المناسبات، ثم انتقل إلى قسم POP UP لتصفح المنتجات.",
  },
  "/rewards": {
    title: "مزايا وعروض العملاء | شركة عمران التجارية",
    description: "تابع صفحة مزايا وعروض العملاء في عمران تويز من شركة عمران التجارية، واطلع على المعلومات المنشورة عن المزايا والعروض عند تحديث الصفحة.",
  },
  "/vip": {
    title: "برنامج بطاقات Omran VIP | شركة عمران التجارية",
    description: "تعرّف على برنامج بطاقات Omran VIP، وأنواع الكروت والمزايا المعروضة وشروط الاستخدام والتحقق من الصلاحية، وروابط الشروط وإشعار الخصوصية.",
  },
  "/vip/terms": {
    title: "شروط استخدام بطاقات Omran VIP | شركة عمران التجارية",
    description: "راجع شروط تفعيل واستخدام كروت Omran VIP، وضوابط العروض والخصومات، وإجراءات فقد الكارت واستبداله والشكاوى كما هي موضحة في صفحة الشروط.",
  },
  "/vip/privacy": {
    title: "خصوصية بيانات Omran VIP | شركة عمران التجارية",
    description: "اقرأ إشعار خصوصية برنامج Omran VIP للتعرف على البيانات المستخدمة وأغراض المعالجة والمشاركة والحماية، وكيفية التعامل مع طلبات الوصول والتصحيح والمحو.",
  },
});

/** Initial HTML summaries mirror already-approved public page copy; React replaces #root on hydration. */
const PUBLIC_PAGE_FALLBACKS = Object.freeze({
  "/rewards": {
    h1: "مزايا وعروض مخصوصة لعملاء عمران تويز",
    summary: "تابع الصفحة عشان تعرف أحدث المزايا والعروض الخاصة المتاحة لعملائنا.",
    links: [["/", "الرئيسية"], ["/products", "تصفح المنتجات"]],
  },
  "/vip": {
    h1: "خصومات محسوبة، وشروط واضحة، وتحقق فعلي من الكارت",
    summary: "استفيد من عروض عمران تويز والأماكن المشاركة، مع شروط وحد أقصى واضح لكل خصم.",
    links: [["/vip/terms", "شروط الاستخدام"], ["/vip/privacy", "إشعار الخصوصية"]],
  },
  "/vip/terms": {
    h1: "شروط استخدام كروت Omran VIP",
    summary: "راجع تفاصيل نوع الكارت وصلاحيته والعروض المتاحة وقت الشراء، لأن لكل عرض شروط استخدام مستقلة.",
    links: [["/vip", "العودة لبرنامج Omran VIP"]],
  },
  "/vip/privacy": {
    h1: "خصوصية برنامج Omran VIP",
    summary: "بنستخدم أقل قدر من البيانات اللازمة لتقديم الخدمة وحماية حسابك ومتابعة طلباتك.",
    links: [["/vip", "العودة لبرنامج Omran VIP"]],
  },
  "/popup/videos": {
    h1: "شوف تنسيقات POP UP بالفيديو",
    summary: "فيديوهات حقيقية للهدايا والبالونات وتنسيقات المناسبات من POP UP – Gifts & Balloons.",
    links: [["/popup", "رجوع لصفحة POP UP"]],
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
  const fallback = PUBLIC_PAGE_FALLBACKS[route];
  if (fallback) {
    const links = fallback.links.map(([href, label]) =>
      '<a href="' + htmlEscape(href) + '">' + htmlEscape(label) + '</a>'
    ).join(" · ");
    const body = '<main dir="rtl" aria-label="محتوى الصفحة">' +
      '<h1>' + htmlEscape(fallback.h1) + '</h1>' +
      '<p>' + htmlEscape(fallback.summary) + '</p>' +
      '<nav aria-label="روابط داخلية">' + links + '</nav></main>';
    html = replaceRequired(html, /<div id="root"><\/div>/i,
      '<div id="root">' + body + '</div>', "public page root");
  }
  return html;
}

/**
 * Lightweight, truthful HTML for search engines and visitors without JS.
 * React replaces #root during boot, so this never duplicates the live UI.
 * Only products passing the existing publication gate are passed by the build.
 */
/**
 * Preserve current featured products while giving crawlers direct links to
 * varied evergreen toy categories. This changes only initial-response
 * discovery links, not approved catalog data or the hydrated React UI.
 */
export function selectHomeDiscoveryProducts(toys, popup) {
  const featured = [...toys].sort((a, b) => (b.rowIndex ?? 0) - (a.rowIndex ?? 0)).slice(0, 8);
  const seenCategories = new Set();
  const evergreen = toys.filter(product => {
    const category = String(product.category || "").trim();
    if (!category || category === "فوانيس رمضان" || category === "ramadan-lanterns" || seenCategories.has(category)) return false;
    seenCategories.add(category);
    return true;
  }).slice(0, 8);
  const seenProducts = new Set();
  return [...featured, ...evergreen, ...popup.slice(0, 3)].filter(product => {
    if (seenProducts.has(product.id)) return false;
    seenProducts.add(product.id);
    return true;
  });
}

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
