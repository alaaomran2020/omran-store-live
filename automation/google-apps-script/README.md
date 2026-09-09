# Omran VIP Subscribers — Google Apps Script

الغرض: استقبال تسجيلات نموذج «خليك مميز» من المتجر وحفظها مركزيًا في شيت `المشتركون` داخل قاعدة البيانات الرئيسية، مع منع التكرار باستخدام رقم الموبايل بصيغة E.164.

## Omran VIP Card pilot

The VIP program does not use Apps Script. Its disabled pilot tables already exist in the master workbook, while staff enrollment is a static WhatsApp handoff from `/vip/staff-register`. Card issuance, activation, redemption, replacement and complaints are recorded manually in the restricted workbook during the pilot.

The subscriber script documented below belongs to the older marketing subscription form only. It is not used for paid VIP cards, discounts, points, staff access or QR verification.

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
