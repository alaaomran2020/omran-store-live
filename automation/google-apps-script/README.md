# Omran VIP Subscribers — Google Apps Script

الغرض: استقبال تسجيلات نموذج «خليك مميز» من المتجر وحفظها مركزيًا في شيت `المشتركون` داخل قاعدة البيانات الرئيسية، مع منع التكرار باستخدام رقم الموبايل بصيغة E.164.

## Omran VIP Card pilot foundation

`vip-pilot.gs` is a separate, disabled-by-default schema initializer for the paid card pilot. Add it to the existing bound project only after reviewing `docs/vip-program/DISCOVERY-ADR.md`. Running `setupVipPilotSheets()` creates the draft program sheets and three fail-closed settings; it does not issue cards, activate points, expose a web endpoint or publish partners.

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
