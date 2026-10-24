# نقل استقبال المنتجات إلى Cloudflare Pages — مراجعة قبل النشر

الحالة: كود مجهز في فرع مراجعة فقط. **ليس منشورًا على الإنتاج، ولا يوجد إرسال حقيقي تمت تجربته.** نجحت اختبارات CI على GitHub. تم إنشاء قاعدة D1 المعزولة باسم `omran-product-intake-security` وجداولها، لكن **ربطها ببيئة Pages لم يكتمل**.

## المسار الجديد
- المتصفح يرسل POST same-origin إلى `/admin/api/product-intake`، تحت نفس بوابة Cloudflare Access `omrantoys.store/admin*`.
- `functions/admin/api/product-intake.js` يتحقق **خادميًا** من توقيع RS256 لـAccess JWT والمصدر `iss` والـaudience `aud` وانتهاء الصلاحية والبريد، باستخدام مفاتيح Cloudflare JWKS.
- صلاحية الموظف تأتي من قائمة السيرفر الموثوقة فقط، وليس من حقل HTML. يسمح فقط لحالات ACTIVE وأدوار OWNER/ADMIN/CATALOG_MANAGER/INVENTORY_STAFF.
- التحقق من السعر والحقول الأساسية وحجم الصورة (10 MiB) وبصمة صورة JPEG/PNG/WebP؛ إرسال مرفوض بدون مصدر Origin مطابق.
- D1 يحمي ضد أكثر من 10 طلبات لكل IP في الدقيقة، ويمنع إعادة إرسال نفس `intake_id` حتى عند فشل تأكيد Make. الطلبات ذات التسليم غير المؤكد تحتاج مراجعة يدوية، وليس إعادة إرسال تلقائية.
- بعد التحقق، تتم إعادة إرسال نفس الحقول إلى Make من الخادم فقط؛ الاسم يؤخذ من قائمة الموظفين، والحالة تظل NEEDS_REVIEW.
- لا تعديل على كتالوج المنتجات المنشور أو سلوك العملاء أو قواعد SEO.

## تجهيز Cloudflare (قبل دمج PR ونشره)
1. **تم** إنشاء قاعدة D1 الخاصة بعمليات الإدخال `omran-product-intake-security` وتشغيل SQL الموجود في `scripts/product-intake-security.sql` بنجاح بتاريخ 24 أكتوبر 2026؛ لا تكرر الإنشاء أو تغيّر جداول العملاء.
2. Cloudflare > Workers & Pages > `omrantoys-live-app` > Settings > Bindings: اربط D1 باسم **`INTAKE_DB`** في بيئة الإنتاج والمراجعة حسب نطاق النشر المختار. لا تضف قيمًا سرية إلى GitHub.
3. تحت Settings > Variables and Secrets أضف `ACCESS_TEAM_DOMAIN` بصيغة `https://YOUR-TEAM.cloudflareaccess.com`، و`ACCESS_AUD` بقيمة Audience لـCloudflare Access App التي تحمي `omrantoys.store/admin*`. خذ القيم من لوحة Cloudflare، ولا تخمّنها.
4. **تم الاستغناء عن القائمة اليدوية المنفصلة**: صلاحيات المستخدم تأتي من قاعدة `omran-staff-private` عن طريق binding باسم `STAFF_DB` وجدول `staff_accounts`، بعد التحقق من JWT. لا تُضاف حسابات تلقائيًا ولا تُفتح الدعوات غير النشطة.
5. فحص Make المرتبط بالحساب أظهر أن سيناريو `Omran Ops — Product Intake Gateway` غير نشط؛ يلزم تأكيد سيناريو الاستقبال المعتمد قبل التشغيل. من Make جهز Webhook **جديد** للسيناريو نفسه بعد التأكد من تطابق حقول الرفع والاستجابة `{ok:true,intake_id:...}`. خزّن الرابط الجديد في **Encrypted Secret** باسم `PRODUCT_INTAKE_WEBHOOK_URL` على Pages، ولا تضعه في متغير `VITE_*` أو في GitHub.
6. احمِ /admin* في نطاق الإنتاج ونطاق preview المقصود بتطبيق Cloudflare Access مطابق، واعتمد سياسة المالك والموظفين المعتمدين فقط. وجود Pages Function منفردة دون Access لا يكفي لتسهيل الدخول حتى مع التحقق من JWT.
7. شغّل `node --test scripts/product-intake-security.test.mjs` واختبارات المستودع؛ انشر أولًا في Preview مع binding وأسرار خاصة بالاختبار، وجرب صورة تجريبية واحدة بدون تعديل منتجات العملاء.
8. بعد تحقق Preview، اطلب نشر production عبر بوابة الموافقة الحالية؛ راقب نجاح وصول سجل `NEEDS_REVIEW` والرد 200 ورفض 401/403/429. **ألغِ الـWebhook القديم المعروف علنًا في Make بعد نجاح التحويل مباشرة**، لأن إزالة الرابط من الكود لا تلغي صلاحية الرابط القديم.

## التحويل الآمن والتراجع
- لا تدمج هذا الفرع قبل تجهيز D1 وقائمة الموظفين ورابط Make الجديد واختبار الطرفين، لأن الكود الجديد يفشل مغلقًا بـ503 عند نقص أي إعداد.
- مسار إرسال المنتجات القديم يعمل حتى نشر تعديل الواجهة، لكنه معروف علنًا ويجب اعتباره مكشوفًا؛ لا تستخدمه كوسيلة تجاوز بعد التحويل.
- في حالة خطأ فوري بعد النشر: ارجع لإصدار Pages سابق أو إعادة نشر نسخة معتمدة؛ **لا تعِد فتح Webhook قديم مكشوف**. افحص السجل في Make وD1 أولًا لتجنب استلام المنتج مرتين.
- صورة HEIC أو غيرها غير مدعومة حاليًا: على الموظف تحويلها إلى JPG/PNG/WebP.
- Cloudflare Pages Functions عبر `wrangler pages deploy` يضم مجلد `functions/` عندما يُشغّل الأمر من جذر المستودع. النشر الحالي مشروط بالموافقة اليدوية أصلًا.

مراجع: https://developers.cloudflare.com/pages/get-started/direct-upload/ و https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/

## حالة الربط في 25 أكتوبر 2026

- Cloudflare Pages production: ربط `INTAKE_DB` بقاعدة إدخال المنتجات المنفصلة، و`STAFF_DB` بقاعدة الموظفين الحقيقية، وضبط `ACCESS_TEAM_DOMAIN` و`ACCESS_AUD`. احتُفظ بربط `DB` الأصلي.
- تم تعديل التحقق من الصلاحيات ليقرأ `staff_accounts` من قاعدة الموظفين: فقط الحساب النشط وبالدور المسموح، وأي غياب/انقطاع يؤدي للرفض.
- أُنشئ Make Scenario جديد مستقل باسم `Omran Ops — Secure Product Intake 2026`، لكنه **غير نشط**؛ رفض Make تفعيله برسالة `Maximum number of active scenarios has been exceeded`. لا يتم تعطيل أي سيناريو قائم بدون موافقة واضحة.
- رابط Make الجديد **لم يُحفظ كسر على Cloudflare** لأن السيناريو لا يمكن تفعيله حاليًا. لا تستخدم الرابط القديم المعروف علنًا.
- الإنتاج يبقى بلا إرسال جديد (503) إلى حين حل حد Make وتسجيل سر `PRODUCT_INTAKE_WEBHOOK_URL`. الدمج في main لا يساوي النشر: Git auto production deployments معطلة في إعدادات Pages، وتوجد بوابة نشر يدوية.
