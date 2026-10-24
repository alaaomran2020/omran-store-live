# نقل استقبال المنتجات إلى Cloudflare Pages — مراجعة قبل النشر

الحالة: كود مجهز في فرع مراجعة فقط. **ليس منشورًا على الإنتاج، ولا يوجد إرسال حقيقي تمت تجربته.**

## المسار الجديد
- المتصفح يرسل POST same-origin إلى `/admin/api/product-intake`، تحت نفس بوابة Cloudflare Access `omrantoys.store/admin*`.
- `functions/admin/api/product-intake.js` يتحقق **خادميًا** من توقيع RS256 لـAccess JWT والمصدر `iss` والـaudience `aud` وانتهاء الصلاحية والبريد، باستخدام مفاتيح Cloudflare JWKS.
- صلاحية الموظف تأتي من قائمة السيرفر الموثوقة فقط، وليس من حقل HTML. يسمح فقط لحالات ACTIVE وأدوار OWNER/ADMIN/CATALOG_MANAGER/INVENTORY_STAFF.
- التحقق من السعر والحقول الأساسية وحجم الصورة (10 MiB) وبصمة صورة JPEG/PNG/WebP؛ إرسال مرفوض بدون مصدر Origin مطابق.
- D1 يحمي ضد أكثر من 10 طلبات لكل IP في الدقيقة، ويمنع إعادة إرسال نفس `intake_id` حتى عند فشل تأكيد Make. الطلبات ذات التسليم غير المؤكد تحتاج مراجعة يدوية، وليس إعادة إرسال تلقائية.
- بعد التحقق، تتم إعادة إرسال نفس الحقول إلى Make من الخادم فقط؛ الاسم يؤخذ من قائمة الموظفين، والحالة تظل NEEDS_REVIEW.
- لا تعديل على كتالوج المنتجات المنشور أو سلوك العملاء أو قواعد SEO.

## تجهيز Cloudflare (قبل دمج PR ونشره)
1. أنشئ قاعدة D1 خاصة بعمليات الإدخال فقط، مثل `omran-product-intake-security`، ثم نفّذ SQL الموجود في `scripts/product-intake-security.sql`. لا تستخدم قاعدة كتالوج العملاء أو تغير الجداول القائمة.
2. Cloudflare > Workers & Pages > `omrantoys-live-app` > Settings > Bindings: اربط D1 باسم **`INTAKE_DB`** في بيئة الإنتاج والمراجعة حسب نطاق النشر المختار. لا تضف قيمًا سرية إلى GitHub.
3. تحت Settings > Variables and Secrets أضف `ACCESS_TEAM_DOMAIN` بصيغة `https://YOUR-TEAM.cloudflareaccess.com`، و`ACCESS_AUD` بقيمة Audience لـCloudflare Access App التي تحمي `omrantoys.store/admin*`. خذ القيم من لوحة Cloudflare، ولا تخمّنها.
4. أضف **Encrypted Secret** باسم `PRODUCT_INTAKE_STAFF_JSON`: مصفوفة JSON لحسابات وافق عليها المالك فقط. مثال بقيم وهمية:
   ```json
   [{"email":"staff@example.com","name":"موظف معتمد","role":"INVENTORY_STAFF","status":"ACTIVE"}]
   ```
   الحسابات INVITED/SUSPENDED/DISABLED لا تُقبل. لا تستخدم أسماء أو بيانات حقيقية في الكود أو ملفات التوثيق.
5. من Make جهز Webhook **جديد** للسيناريو نفسه بعد التأكد من تطابق حقول الرفع والاستجابة `{ok:true,intake_id:...}`. خزّن الرابط الجديد في **Encrypted Secret** باسم `PRODUCT_INTAKE_WEBHOOK_URL` على Pages، ولا تضعه في متغير `VITE_*` أو في GitHub.
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
