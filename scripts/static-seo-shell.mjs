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
