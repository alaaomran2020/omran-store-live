/**
 * OMRAN TOYS — هوية الموقع الثابتة (origin + brand + metadata الافتراضي).
 *
 * هذه الوحدة هي المصدر الوحيد لقيم الهوية الثابتة داخل الكود، حتى لا تتفرع
 * النصوص أو النطاق بين الواجهة وsitemap وrobots وJSON-LD.
 * ملاحظة: `client/index.html` ملف ثابت ينفذ قبل أي كود JavaScript، لذا يحتفظ
 * بنسخة مطابقة من هذه القيم — أي تعديل هنا يجب أن يُطابق فيه.
 */

/** نطاق الإنتاج المعتمد (بدون www) — مستخدم في canonical وOG وstructured data. */
export const SITE_ORIGIN = "https://omrantoys.store";
export const SITE_URL = `${SITE_ORIGIN}/`;

/** اسم الشركة كما يظهر في الهيدر (شركة عمران التجارية). */
export const BRAND_NAME = "شركة عمران التجارية";
/** اسم متجر اللعب المستخدم في عناوين أقسام المتجر (عمران تويز). */
export const STORE_NAME = "عمران تويز";
/** اسم قسم POP UP المستقل عن متجر لعب الأطفال. */
export const POPUP_NAME = "POP UP";

export const SITE_LOCALE = "ar_EG";

/** صورة المشاركة/الافتراضية — asset موجود فعلًا في public/brand/. */
export const SOCIAL_FALLBACK_IMAGE = `${SITE_ORIGIN}/brand/logo.png`;

/** عنوان ووصف الصفحة الرئيسية (fallback العام في الـSPA + صفحة /). */
export const HOME_TITLE = "شركة عمران التجارية | لعب أطفال وهدايا";
export const HOME_DESCRIPTION =
  "شركة عمران التجارية — لعب أطفال وهدايا. اكتشف المنتجات والصور والتفاصيل وتواصل مباشرة عبر واتساب للاستفسار عن السعر والتوفر.";

/** حدود آمنة لعناوين/أوصاف الـmetadata حتى لا تنتفخ مع أسماء المنتجات الطويلة. */
export const TITLE_MAX_LENGTH = 70;
export const DESCRIPTION_MAX_LENGTH = 160;
