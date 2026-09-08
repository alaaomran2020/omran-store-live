# Omran Browser Use Automation

طبقة أتمتة مستقلة عن واجهة المتجر. لا يتم استيرادها أو تشغيلها داخل Vite/React ولا تدخل في production bundle.

## النطاق الحالي

- `qa`: فحص قراءة فقط لـ `https://omrantoys.store` يشمل التنقل، الكتالوج، صفحة منتج، الصور، الروابط الظاهرة ووجود CTA واتساب.
- `research`: استخراج بيانات منتج عامة من رابط مصدر محدد، مع تمييز البيانات غير المؤكدة وعدم اختراع مواصفات ناقصة.

## ضوابط الأمان

- لا تسجيل دخول تلقائي في المرحلة الأولى.
- لا إرسال نماذج أو رسائل واتساب أو تنفيذ شراء.
- لا تجاوز CAPTCHA أو Access Controls.
- لا كتابة مباشرة إلى قاعدة بيانات/Google Sheet/كتالوج المتجر.
- POP UP – Gifts & Balloons يبقى منفصلًا عن كتالوج Omran Toys.
- أي خطوة كتابة مستقبلية يجب أن تمر عبر approval gate مستقل.

## التشغيل المحلي

يتطلب Python 3.11+ ويفضل `uv`.

```bash
cd automation/browser-use
uv sync
cp .env.example .env
# ضع BROWSER_USE_API_KEY أو مفتاح المزود المناسب داخل .env
uv run omran-browser qa
uv run omran-browser research --target "https://example.com/product"
```

## متغيرات البيئة

- `BROWSER_USE_API_KEY`: المفتاح المفضل إذا تم استخدام Browser Use routing.
- `OMRAN_STORE_URL`: افتراضيًا `https://omrantoys.store`.
- `OMRAN_BROWSER_MODEL`: افتراضيًا `openai/gpt-5.5`.
- `OMRAN_BROWSER_MAX_STEPS`: حد خطوات المهمة، افتراضيًا `20`.

## المرحلة التالية

بعد نجاح smoke run محليًا:

1. إضافة structured JSON output للبحث وQA.
2. إضافة allowlist للنطاقات المسموح للـagent بزيارتها.
3. حفظ artifacts والتقارير خارج frontend bundle.
4. ربط نتائج البحث بمرحلة `NEEDS_REVIEW` فقط، وليس النشر المباشر.
5. إضافة approval gate قبل أي write action.
6. لاحقًا إضافة MoneyPrinterTurbo كخدمة منفصلة تقرأ فقط المنتجات المعتمدة وتنتج مسودات فيديو للمراجعة.
