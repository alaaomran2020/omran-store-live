# Omran VIP Subscribers — Google Apps Script

الغرض: استقبال تسجيلات نموذج «خليك مميز» من المتجر وحفظها مركزيًا في شيت `المشتركون` داخل قاعدة البيانات الرئيسية، مع منع التكرار باستخدام رقم الموبايل بصيغة E.164.

## Omran VIP Card pilot foundation

`vip-pilot.gs` is a disabled-by-default schema initializer for the paid card pilot. It reuses `المشتركون`, `الموظفون`, `حركات النقاط`, `حسابات النقاط` and `سجل التدقيق` instead of duplicating them. The missing VIP tables were created in the master workbook on 2026-09-09 with all commercial and public-verification switches left `false` and `DRAFT`.

`vip-operations.gs` adds locked pilot operations for issuing a `NEW` card, activating it only after a payment reference and explicit financial enablement, returning a privacy-safe verification view, and recording an idempotent capped redemption. Copy both VIP files into the existing bound Apps Script project only after review. Staff operations require a verified Google email present in `الموظفون`; no browser secret or public Make webhook is accepted for financial writes.

Financial transactions must not reuse the public subscriber or Make webhook pattern. The static Cloudflare Access page does not authenticate a separate webhook origin.

## النشر

1. افتح https://script.google.com/create بحساب Google الذي يملك قاعدة البيانات.
2. انسخ محتوى `subscribers.gs` إلى ملف `Code.gs` ثم احفظ المشروع باسم `Omran VIP Subscribers`.
3. Deploy → New deployment → Web app.
4. Execute as: Me.
5. Who has access: Anyone.
6. اضغط Deploy وانسخ رابط Web App الذي ينتهي بـ `/exec`.
7. أضف الرابط إلى بيئة Production باسم `VITE_SUBSCRIBERS_WEB_APP_URL` ثم أعد نشر المتجر.

## السلوك

- يقبل أرقام المحمول المصرية فقط: 010 / 011 / 012 / 015.
- يحول الرقم إلى E.164 (+20...).
- يستخدم `LockService` لتجنب إنشاء نسخ مكررة عند الطلبات المتزامنة.
- إذا وجد الرقم: يحدّث المصدر، رابط المصدر، الحالة، آخر ظهور وعدد مرات التسجيل.
- إذا لم يجده: ينشئ مشتركًا جديدًا بحالة `ACTIVE`.
- واتساب في الواجهة يصبح خطوة متابعة اختيارية بعد نجاح إرسال التسجيل المركزي.
