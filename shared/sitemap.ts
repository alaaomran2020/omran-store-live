/**
 * OMRAN TOYS — توليد sitemap.xml للواجهة الثابتة.
 *
 * مبادئ التنفيذ:
 *   1. روابط حقيقية فقط: المسارات الثابتة العامة + روابط المنتجات المنشورة
 *      (عبر نفس قاعدة النشر active + PUBLISHED + PASS المعتمدة في `shared/products`).
 *   2. لا search/filter URLs: حالة الفلتر والفرز والبحث مؤقتة في الواجهة،
 *      ولا تدخل sitemap إطلاقًا — رابط المنتج الوحيد هو `?product=<id>`.
 *   3. لا admin ولا مسارات داخلية/تجريبية.
 *   4. لا `lastmod` مطلقًا: لا يوجد timestamp موثوق للتعديل في الكتالوج
 *      (تاريخ البناء ليس تاريخ تعديل)، فالأمانة توجب حذفه بدل اختلاقه.
 */

import { isPubliclyVisible, type Product } from "./products";
import { SITE_ORIGIN } from "./site";
import { isPopUpProduct, type ProductCatalog } from "./productCatalog";

export type SitemapEntry = {
  loc: string;
  priority: number;
};

/** المسارات الثابتة العامة القابلة للفهرسة (لا تشمل admin/تجارب/staff). */
export const STATIC_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { loc: "/", priority: 1.0 },
  { loc: "/products", priority: 0.9 },
  { loc: "/popup", priority: 0.9 },
  { loc: "/popup/videos", priority: 0.7 },
  { loc: "/videos", priority: 0.7 },
  { loc: "/rewards", priority: 0.7 },
  { loc: "/vip", priority: 0.7 },
  { loc: "/vip/terms", priority: 0.5 },
  { loc: "/vip/privacy", priority: 0.5 },
] as const;

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** رابط ثابت للمنتج داخل كتالوج معين — التمثيل canonical الوحيد لرابط منتج. */
export function productSitemapPath(productId: string, catalog: ProductCatalog): string {
  const path = catalog === "popup" ? "/popup" : "/products";
  return `${path}?product=${encodeURIComponent(productId)}`;
}

/**
 * يبني قائمة المداخل (ثابتة + منتجات) مع إزاحة المكرر، ويرفض أي رابط لا يجتاز
 * بوابات السلامة: منتج غير منشور / معرف فارغ / اسم فارغ.
 */
export function buildSitemapEntries(
  products: readonly Product[],
  origin: string = SITE_ORIGIN
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const seen = new Set<string>();

  const add = (loc: string, priority: number) => {
    const full = `${origin}${loc}`;
    if (seen.has(full)) return;
    seen.add(full);
    entries.push({ loc: full, priority });
  };

  for (const entry of STATIC_SITEMAP_ENTRIES) add(entry.loc, entry.priority);

  for (const product of products) {
    if (!isPubliclyVisible(product)) continue;
    if (!product.id.trim() || !product.name.trim()) continue;
    const catalog: ProductCatalog = isPopUpProduct(product) ? "popup" : "toys";
    add(productSitemapPath(product.id.trim(), catalog), 0.6);
  }

  return entries;
}

/** يحول المداخل إلى sitemap.xml صالح (UTF-8، بدون lastmod). */
export function buildSitemapXml(entries: readonly SitemapEntry[], origin: string = SITE_ORIGIN): string {
  const urls = entries
    .map(entry =>
      [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
        "  </url>",
      ].join("\n")
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!--",
    "  خريطة الموقع — توليد آلي من الكتالوج المعتمد وقت البناء",
    "  (scripts/generate-sitemap.mjs + vite plugin). لا يحتوي search/filter ولا مسارات داخلية،",
    "  وبدون تاريخ تعديل لأنه لا يوجد timestamp موثوق. النطاق الأساسي الوحيد:",
    `  ${origin}`,
    "-->",
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildSitemap(
  products: readonly Product[],
  origin: string = SITE_ORIGIN
): { xml: string; entries: SitemapEntry[] } {
  const entries = buildSitemapEntries(products, origin);
  return { xml: buildSitemapXml(entries, origin), entries };
}
