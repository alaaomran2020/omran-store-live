# تضمين المنصات الاجتماعية الرسمي

تعرض صفحة المنتجات محتوى الحسابات العامة باستخدام مكونات التضمين الرسمية من Meta. لم يعد الموقع يستدعي Graph API لجلب المنشورات أو يخزن أي نسخة من المحتوى أو يملك صلاحية نشره.

## المصادر

| المنصة | الرابط العام |
|---|---|
| Instagram | منشور عام مميز داخل iframe رسمي، مع رابط الحساب `https://www.instagram.com/omrantoys.store/` |
| Facebook | `https://www.facebook.com/profile.php?id=61590544803396&locale=ar_AR` |

تفتح الواجهة المنشور العام المميز وحساب Instagram الرسمي مباشرة. أما Facebook، فتفتح الصفحة الرسمية مباشرة: إذ أعاد اختبار Page Plugin الحالي إلى تسجيل الدخول في بيئة الويب، بينما منعت بيئة المعاينة الحالية عرض إطار Instagram. لذلك لا نعرض مساحة فارغة أو نافذة تسجيل دخول داخل الموقع؛ لا يقرأ الموقع منشورات Graph API أو يخزنها. يظل تصميم المحتوى ومدى ظهوره خاضعين للمنصات الأصلية.

## الخصوصية والتشغيل

- لا يتضمن العميل أو الخادم أي `Access Token` خاص بـMeta.
- لا توجد قاعدة بيانات أو ذاكرة تخزين مؤقت للمنشورات.
- لا توجد عملية نشر، ولا خادم وسيط لقراءة منشورات الحسابات.
- عند تعذر تحميل برنامج تضمين Meta، تظهر للمستخدم روابط مباشرة إلى الحسابات الرسمية.

## القيود

لا يدعم هذا النموذج دمج منشورات المنصتين أو إزالة التكرار أو ترتيبها داخل شبكة يملكها الموقع؛ هذه الإجراءات تتطلب قراءة بيانات Graph API. التضمين يعرض المحتوى كما تقدمه Meta مباشرة.

## مراجع Meta الرسمية

- [Meta — Tokenless access to oEmbed APIs](https://developers.facebook.com/blog/post/2026/06/15/tokenless-access-to-meta-oembed-apis/)
- [Meta — Facebook Page Plugin](https://developers.facebook.com/docs/plugins/page-plugin/)
- [Meta — Embed an Instagram Post](https://developers.facebook.com/documentation/instagram-platform/oembed)
