/**
 * POP UP classification is data-driven and intentionally based on the explicit
 * product category. Product names/descriptions are never used for department
 * routing, which prevents ordinary toy products from leaking into POP UP.
 *
 * القاعدة الفعلية سكنت في `shared/productCatalog` ليستخدمها توليد sitemap أثناء
 * البناء أيضًا — هذا الملف يحافظ على مسار الاستيراد القديم للواجهة.
 */

export {
  POPUP_CATEGORY_MARKERS,
  filterProductsByCatalog,
  isPopUpProduct,
  type ProductCatalog,
} from "@shared/productCatalog";
