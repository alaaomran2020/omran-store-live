import type { Product as BaseProduct, ProductsPayload } from "@shared/products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "./publicProductsSnapshot";
import { POPUP_PRODUCTS_SNAPSHOT } from "./popupProductsSnapshot";

/**
 * مصدر الحقيقة الوحيد للكتالوج العام هو اللقطة المعتمدة داخل المستودع:
 * `publicProductsSnapshot.ts` (ألعاب) + `popupProductsSnapshot.ts` (POP UP).
 *
 * لا يوجد أي نداء كتالوج خارجي وقت التشغيل: لا Apps Script، ولا Google Sheet،
 * ولا بوابة Make. اللقطة تُولَّد وتُتحقَّق وقت البناء من
 * `public/catalog/products.csv` المملوك للمستودع، وهي نفس البيانات التي يبني
 * منها الـsitemap وبيانات SEO المهيكلة — فلا يمكن أن تختلف الواجهة عن الفهرسة.
 */

export type ProductOptionGroup = {
  name: string;
  values: string[];
};

export type ProductAvailability = "available" | "unavailable" | "preorder" | "unknown";

export type Product = BaseProduct & {
  /** العمر الأدنى الموثق فقط؛ null يعني غير معروف ولا يدخل في فلترة العمر. */
  ageMin: number | null;
  /** العمر الأقصى الموثق فقط؛ null يعني غير معروف ولا يدخل في فلترة العمر. */
  ageMax: number | null;
  galleryImages: string[];
  videoUrl: string | null;
  videoPoster: string | null;
  videoDuration: string | null;
  /** خيارات منظمة اختيارية؛ المنتجات القديمة تظل مدعومة من الوصف. */
  options: ProductOptionGroup[];
  /** العلامة التجارية كما وردت في مصدر الكتالوج؛ لا يتم استنتاجها من الاسم. */
  brand: string | null;
  /** وسوم منظمة للبحث والفلترة فقط. */
  tags: string[];
  /** حالة التوفر الموثقة؛ unknown تعني أن المصدر لم يحددها. */
  availability: ProductAvailability;
  specifications: ProductSpecifications;
};

export type ProductSpecifications = {
  productLengthCm: number | null; productWidthCm: number | null; productHeightCm: number | null;
  packageLengthCm: number | null; packageWidthCm: number | null; packageHeightCm: number | null;
  weightKg: number | null; material: string | null; piecesCount: number | null;
  powerSource: string | null; assemblyRequired: boolean | null;
  boxContents: string | null; boxContentsItems: string[]; playInstructions: string | null;
};

const EMPTY_SPECIFICATIONS: ProductSpecifications = {
  productLengthCm: null, productWidthCm: null, productHeightCm: null,
  packageLengthCm: null, packageWidthCm: null, packageHeightCm: null,
  weightKg: null, material: null, piecesCount: null, powerSource: null,
  assemblyRequired: null, boxContents: null, boxContentsItems: [], playInstructions: null,
};

export type StorefrontProductsPayload = Omit<ProductsPayload, "products"> & {
  products: Product[];
};

const CATALOG_PRODUCTS = [...PUBLIC_PRODUCTS_SNAPSHOT, ...POPUP_PRODUCTS_SNAPSHOT];

function toStorefrontProduct(product: BaseProduct): Product {
  return {
    ...product,
    ageMin: null,
    ageMax: null,
    galleryImages: [], videoUrl: null, videoPoster: null, videoDuration: null,
    options: [], brand: null, tags: [], availability: "unknown",
    specifications: EMPTY_SPECIFICATIONS,
  };
}

/**
 * الكتالوج المعتمد كما هو مُجمَّع داخل الحزمة. متزامن وحتمي: لا شبكة، ولا
 * حالة فشل، ولا ترتيب متغير بين تحميل وآخر.
 */
export function getInitialProductsSnapshot(): StorefrontProductsPayload {
  return {
    products: CATALOG_PRODUCTS.map(toStorefrontProduct),
    status: "ok",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * يُحمِّل كتالوج النشر المعتمد. يحتفظ بتوقيع غير متزامن لأن الواجهة تستهلكه عبر
 * React Query، لكنه يقرأ من اللقطة المضمّنة فقط ولا يلمس الشبكة إطلاقًا.
 */
export async function loadPublishedCatalog(): Promise<StorefrontProductsPayload> {
  return getInitialProductsSnapshot();
}

/** اسم متوافق مع الاستدعاءات القائمة؛ نفس المصدر المضمّن بالضبط. */
export async function fetchProducts(): Promise<StorefrontProductsPayload> {
  return getInitialProductsSnapshot();
}
