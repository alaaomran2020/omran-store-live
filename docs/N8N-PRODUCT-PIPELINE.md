# OMRAN TOYS — Pipeline إدارة المنتجات الآلية

```
📱 Telegram → 🤖 n8n → 🧠 AI → ☁️ Google Drive → 📊 Google Sheets → ⚡ Cloudflare Worker → 🌐 omrantoys.store
```

> Pipeline واحدة بسيطة فوق البنية الحالية **بدون أي تعديل على كود الموقع**:
> الشيت يبقى مصدر الحقيقة، والـWorker الحالي يلتقط المنتج المنشور خلال
> ≤ 5 دقائق (كاش `/api/products` الموجود أصلًا). **لا Vercel، لا GitHub commit
> لكل منتج، لا Cloudflare deploy لكل منتج، لا قاعدة بيانات جديدة.**

---

## 1) الملفات

| الملف                                           | الدور                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `automation/n8n/omran-toys-product-pipeline.json` | الـWorkflow الجاهز للاستيراد في n8n (42 node).                     |
| `automation/n8n/build-workflow.mjs`             | مولّد الـJSON — أعد تشغيله بعد أي تعديل على المكتبة.                |
| `automation/n8n/lib/pipeline.mjs`               | منطق الـPipeline (caption/validation/ID/تكرار/تعديل) — مُختبَر.     |
| `automation/n8n/lib/pipeline.test.mjs`          | اختبارات الوحدات (28 اختبارًا).                                     |
| `automation/n8n/lib/pipeline.e2e.test.mjs`      | محاكاة الرحلة الكاملة حتى محلل الموقع الفعلي (7 سيناريوهات).        |

إعادة توليد الـWorkflow بعد تعديل المكتبة:

```bash
node automation/n8n/build-workflow.mjs && pnpm test
```

---

## 2) Google Sheets — الأعمدة النهائية

نفس الشيت الحالي + **3 أعمدة تشغيلية فقط** تُضاف يدويًا مرة واحدة في نهاية الصف الأول:

```
id | name | price | category | description | image | active | sort_order | product_prompt | workflow_status | created_at | updated_at
```

- الأعمدة التسعة الأولى **كما هي بلا أي تغيير** — الموقع يقرأها كالمعتاد.
- `workflow_status`: `REVIEW / PUBLISHED / REJECTED` (و`DRAFT/ERROR` محجوزة).
  **لا يؤثر على الموقع إطلاقًا** — الظهور محكوم حصريًا بعمود `active`
  (مُثبت بالاختبار `server/products.pipeline.test.ts`).
- `product_prompt` محفوظ كما هو للتوافق — الـPipeline لا تكتبه ولا تحذفه.
- ⚠️ قاعدة ذهبية: الـPipeline تكتب دائمًا `active=FALSE` صراحة عند الإنشاء،
  لأن **الفارغ يعني معروضًا** في منطق الموقع الحالي.

## 3) Google Drive — البنية

```
OMRAN TOYS/
└── products/
    ├── originals/    ← ترفع الـPipeline الصورة الأصلية هنا (OT-xxxxx-original.jpg) ولا تُحذف أبدًا
    └── processed/    ← اختياري للصور المعالَجة يدويًا/بالـAI لاحقًا
```

الملف يُشارك تلقائيًا "Anyone with the link → Viewer"، ورابط `/file/d/ID/view`
يوضع في عمود `image` — الموقع يحوّله بنفسه لصيغة العرض المباشر (سلوك موجود أصلًا).

---

## 4) إعداد n8n (مرة واحدة)

### Credentials (داخل n8n — لا شيء في الكود أو GitHub)

1. **Telegram API** — توكن بوت من @BotFather (للـTrigger ولكل عقد الإرسال).
2. **Google Sheets OAuth2** (أو Service Account له تحرير على الشيت).
3. **Google Drive OAuth2** (نفس الحساب عادةً).

### Environment Variables (في بيئة n8n نفسها)

| المتغير                    | القيمة                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `PRODUCTS_SHEET_ID`        | معرف الشيت الحالي (من رابط `docs.google.com/spreadsheets/d/<ID>/`) |
| `PRODUCTS_SHEET_TAB`       | اسم الورقة (افتراضي `products`)                                    |
| `DRIVE_ORIGINALS_FOLDER_ID`| معرف مجلد `originals` من رابط Drive                                |
| `OPENAI_API_KEY`           | مفتاح OpenAI (سرّي — n8n env فقط)                                  |
| `OPENAI_MODEL`             | اختياري، افتراضي `gpt-4o-mini` (رخيص + `detail:low` للصور)        |
| `OPENAI_BASE_URL`          | اختياري لأي مزود متوافق مع OpenAI API                              |
| `TELEGRAM_ALLOWED_CHAT_IDS`| **مهم للأمان**: معرفات المحادثات المسموح لها، مفصولة بفواصل        |

### الاستيراد والتفعيل

1. n8n → Workflows → **Import from File**:
   - مستضاف ذاتيًا (Docker/VPS): `omran-toys-product-pipeline.json` (يقرأ `$env`).
   - **n8n Cloud**: `omran-toys-product-pipeline.n8n-cloud.json` (يقرأ `$vars` —
     اضبط نفس الأسماء في Admin Panel → Variables بدل env).
2. اربط الـCredentials الثلاثة في العقد التي تطلبها (Telegram / Sheets / Drive).
3. فعّل الـWorkflow (زر Active) — يسجّل Telegram webhook تلقائيًا.

> ملاحظة: زر ✏️ تعديل يعتمد على Workflow Static Data، وهي تعمل في وضع
> **Active** (الإنتاج) وليس في زر "Test workflow" اليدوي.

---

## 5) الـNodes بالترتيب (42 node)

**الاستقبال والفرز:**
`Telegram Trigger` (message + callback_query) → `فرز التحديث` (قائمة سماح + تصنيف) → `مسار التحديث` (Switch).

**مسار الصورة (منتج جديد):**
`قراءة الكتالوج` (Sheets) → `تجميع الكتالوج` → `تنزيل الصورة` (Telegram) →
`تجهيز التحليل` (caption + تصنيفات الموقع + base64) → `تحليل المنتج AI` (OpenAI vision, JSON mode) →
`فحص النتيجة` (Validation + `OT-xxxxx` + كشف تكرار) → `هل التحليل صالح؟` →
`رفع الصورة الأصلية` (Drive/originals) → `مشاركة الصورة` (anyone/reader) →
`تجهيز الصف النهائي` → `إضافة المنتج` (append: `active=FALSE`, `workflow_status=REVIEW`) →
`معاينة المنتج` (Telegram + أزرار ✅/✏️/❌).

**مسار الأزرار:**
`قراءة الزر` → `إيقاف مؤشر الزر` → `الإجراء` (Switch) →
- ✅ `نشر المنتج` (`active=TRUE`, `PUBLISHED`, `updated_at`) → `تأكيد النشر`
- ❌ `رفض المنتج` (`active=FALSE`, `REJECTED`) → `تأكيد الرفض`
- ✏️ `طلب التعديل` (يحفظ حالة انتظار التعديل للمحادثة)

**مسار النص (تنفيذ التعديل):**
`فحص وضع التعديل` → `يوجد تعديل معلق؟` → `قراءة صف المنتج` → `تجهيز التعديل`
(تعديل سريع بلا AI مثل «السعر 399»، وإلا) → `تحليل التعديل AI` → `دمج التعديل`
(يحدّث الصف الموجود فقط) → `تحديث المنتج` → `معاينة بعد التعديل` (بالأزرار مجددًا).

**معالجة الأخطاء (رسائل Telegram لكل مرحلة):**
`خطأ استقبال الصورة` / `خطأ تحليل المنتج` / `خطأ قراءة الشيت` /
`خطأ حفظ المنتج` (يتضمن بيانات المنتج كاملة حتى لا تُفقد) /
`خطأ النشر` («تم حفظ المنتج لكن لم يظهر بعد») / `خطأ تحديث المنتج` /
`رسالة مساعدة` / `المنتج غير موجود` / `تجاهل`.

---

## 6) الاستخدام اليومي (من الموبايل)

| ترسل                                   | يحدث                                                        |
| --------------------------------------- | ------------------------------------------------------------ |
| 📸 صورة فقط                             | AI يحلل الصورة، سعر فارغ → «السعر عند الطلب»                 |
| 📸 + `السعر: 350`                       | سعرك يُستخدم كما هو ولا يُغيَّر أبدًا                          |
| 📸 + `السعر: 350` + `القسم: ألعاب بنات` | يُمرَّر كله للـAI كمعلومات مؤكدة                              |
| ✅ نشر                                  | `active=TRUE` → يظهر على الموقع خلال ≤ 5 دقائق                |
| ✏️ تعديل ثم «السعر 399»                 | تحديث الصف نفسه + معاينة جديدة (بلا إعادة إنشاء)             |
| ❌ رفض                                  | `REJECTED` — لا يظهر أبدًا، والصف والصورة محفوظان             |

**المكرر**: تطابق id أو اسم (بعد تطبيع عربي) أو تشابه ≥ 0.8 → «⚠️ يبدو أن هذا
المنتج موجود بالفعل.» في المعاينة، ويبقى بانتظار قرارك — لا نشر تلقائي.

**الثقة**: `confidence < 0.75` → تنبيه «🔎 الثقة منخفضة» في المعاينة.
النشر يدوي دائمًا في كل الأحوال — الزر ✅ هو القرار الوحيد.

---

## 7) النشر والكاش (Cloudflare)

لا تغيير على أي إعداد: `worker/index.ts` يقرأ الشيت المنشور CSV عبر
`PRODUCTS_SHEET_URL` بكاش 5 دقائق (`PRODUCTS_CACHE_TTL_MS`). بعد ✅ نشر:

- **لا** GitHub commit، **لا** `wrangler deploy`، **لا** cache purge.
- المنتج يظهر تلقائيًا خلال مدة الـTTL (≤ 5 دقائق) — ورسالة التأكيد في
  Telegram توضح ذلك. زر «تحديث» في صفحة الكتالوج يتجاوز كاش المتصفح فقط.

## 8) الأمان والسجلات

- كل الأسرار في n8n Credentials/env — لا شيء في الكود أو GitHub أو الشيت أو المتصفح.
- `TELEGRAM_ALLOWED_CHAT_IDS` يمنع أي غريب من إضافة منتجات.
- السجلات (console.log داخل الـCode nodes): `product_id`, `workflow_status`,
  `step`, `timestamp` فقط — **بلا** توكنات أو محتوى رسائل.

## 9) خطوات يدوية متبقية (Checklist)

- [ ] إضافة أعمدة `workflow_status, created_at, updated_at` للصف الأول في الشيت.
- [ ] إنشاء مجلدي Drive `products/originals` و`products/processed` ونسخ معرف originals.
- [ ] إنشاء بوت Telegram ومعرفة chat id (أرسل رسالة للبوت ثم افتح `getUpdates`).
- [ ] استيراد الـWorkflow وربط الـCredentials وضبط الـenv ثم تفعيله.
- [ ] التأكد أن `PRODUCTS_SHEET_URL` في `wrangler.toml` يشير لنفس الشيت (هو كذلك أصلًا إن كان الموقع يعمل).
- [ ] تجربة منتج حقيقي واحد: صورة → معاينة → ✅ → ظهوره على omrantoys.store خلال ~5 دقائق.
