# Publication Gate — سياسة نشر المنتجات (Fail-Closed)

> **العقد الرسمي منذ 2026-09-03:** الظهور العام للمنتجات لم يعد محكومًا بعمود
> `active` وحده. البوابة الثلاثية إلزامية في `/api/products` و`/edge-api/products`
> وفي كل مسارات القراءة العامة.

## 1) القاعدة

```
PUBLIC PRODUCT = active === true
                 AND workflow_status === "PUBLISHED"
                 AND qa_status === "PASS"
```

أي حالة أخرى → **NOT PUBLIC**:

| active | workflow_status | qa_status | النتيجة |
|---|---|---|---|
| TRUE | PUBLISHED | PASS | ✅ عام |
| FALSE | أي شيء | أي شيء | ❌ مخفي (`inactive`) |
| TRUE | REVIEW/REJECTED/DRAFT/ERROR/null | أي شيء | ❌ مخفي |
| TRUE | PUBLISHED | NEEDS_REVIEW/FAIL/null | ❌ مخفي |

**Fail-Closed حرفيًا:**
- غياب `qa_status` لا يعني PASS.
- غياب `workflow_status` لا يعني PUBLISHED.
- `active=true` وحدها لا تكفي للنشر أبدًا.

## 2) الأعمدة التشغيلية (First-Class Fields)

الشيت الرسمي:

```
id | name | price | category | description | image | active | sort_order
| product_prompt | workflow_status | qa_status | source_drive_id
| processed_image | review_reason | created_at | updated_at
```

(`source_drive_id` / `processed_image` / `review_reason` أعمدة اختيارية
First-Class — تُقرأ من العمود أولًا ثم من بيانات `product_prompt` التشغيلية
القديمة كطبقة توافق. خطة الترحيل الكاملة بالقيم الموثقة:
`automation/db-publication-plan-2026-09-03.csv`.)

القيم المعتمدة:

- `workflow_status`: `REVIEW` / `PUBLISHED` / `REJECTED` (و`DRAFT`/`ERROR` محجوزة).
- `qa_status`: `PASS` / `NEEDS_REVIEW` / `FAIL` (مع مرادفات متسامحة في القراءة).

في حمولة الـAPI أصبحت حقولًا صريحة على المنتج:

| الحقل | المصدر | ملاحظة |
|---|---|---|
| `workflowStatus` | عمود `workflow_status` | `null` عند الغياب/قيمة مجهولة |
| `qaStatus` | عمود `qa_status` ثم طبقة التوافق | انظر §3 |
| `sourceDriveId` | `source_drive_id=` في بيانات `product_prompt` | دليل المصدر |
| `processedImage` | `processed=` في بيانات `product_prompt` | دليل فقط — ليس رابط عرض |
| `reviewReason` | مشتق آليًا للمنتجات غير العامة | لماذا هذا المنتج معزول؟ |

`reviewReason` يظهر فقط في وضع الإدارة (`includeInactive: true`) بقيم مثل:
`inactive` / `missing_workflow_status` / `workflow_status_review` /
`missing_qa_status` / `qa_status_needs_review` / `duplicate_name` — مع تضمين
`reason=` الموثقة من الاستيراد إن وُجدت.

## 3) طبقة التوافق المؤقتة (legacy product_prompt metadata)

قبل اعتماد عمود `qa_status` الصريح، كتب خط الاستيراد الآلي دليل الجودة داخل
`product_prompt` نفسه بهذا الشكل الموثق:

```
source_drive_id=<DriveFileId>; qa=PASS; processed=<file>; reason=<text>
```

القواعد المحافظة:
1. **عمود `qa_status` الصريح يعلو دائمًا** فوق الـmetadata عند التعارض.
2. الـmetadata تُقرأ فقط من المفاتيح المعروفة أعلاه — النص الوصفي الحر
   (برومبت تجهيز صورة عادي) لا يُفهم كدليل تشغيلي أبدًا.
3. لا تُخترع قيم: لا `qa=` → لا رأي جودة → غير عام.
4. هذه طبقة **مؤقتة** — عند اكتمال ترحيل `qa_status` لعمود صريح في كل صفوف
   الشيت تُحذى إلى الأعمدة مباشرة.

## 4) Final Publication Guard (بعد الـAdmin Overrides)

تجاوزات المدراء (`applyOverridesToProducts`) تعدّل حقول العرض فقط
(الاسم/السعر/الوصف/الصورة/الإخفاء) ولا تمسّ حقول التشغيل إطلاقًا. وقبل إرسال
أي استجابة API عامة يُطبَّق **حتمًا**:

```ts
applyPublicationGuard(products) // => filter(isPubliclyVisible)
```

في `worker/index.ts` و`server/products.ts`. النتيجة: لا يمكن لأي Override
تحويل منتج `NEEDS_REVIEW`/`REVIEW`/غير فعّال إلى منتج عام.

## 5) كشف التكرار (duplicate_name)

صفان **مرشحان للنشر** بنفس الاسم (بعد تطبيع عربي: بلا تشكيل/تطويل، بلا
حساسية حالة) → كلاهما يُعزل للمراجعة (`duplicate_name`). لا يُخمَّن أيهما
"الصحيح" — القرار للمالك. تكرار الاسم مع صف **غير عام أصلاً** (مثل legacy
بلا دليل) لا يعزل المنتج الموثق.

## 6) Legacy Data — قاعدة العزل

أي منتج بلا دليل (بلا QA، بلا صورة مؤكدة، بلا source) **لا يُحذف ولا يُعدَّل** —
يُخرج من الـAPI العام ويظهر للإدارة مع `reviewReason` حتى يثبته المالك
(`qa_status=PASS` + `workflow_status=PUBLISHED`) أو يخفيه.

مثال حالي من الشيت الحي: صف `id=1` (سيارة سباق بالريموت — 350 ج.م) له
`workflow_status=PUBLISHED` لكن **لا دليل QA إطلاقًا** → معزول تلقائيًا
بسبب `missing_qa_status` حتى مراجعة المالك. منتج `OMR-RAW-015` بنفس الاسم
لكن بدليل كامل (صورة Drive + qa=PASS + PUBLISHED) يبقى عامًا.

## 7) الاختبارات

`server/products.publication-gate.test.ts` — الحالات المرجعية الـ 12
(تشمل/استبعاد/تلف/تكرار/سعر فارغ/عربية/CSV مقتبس/تجاوز الـOverrides عبر
الحارس) + عقد `isPubliclyVisible` + طبقة التوافق + كشف تكرار الأسماء.
`server/products.pipeline.test.ts` — توافق الـPipeline مع البوابة.
فحص CI للإنتاج (`engine-json` probe في deploy.yml) يفشل النشر إذا تسرب أي
منتج غير عام إلى `/edge-api/products`.

## 8) نشر منتج (دليل المالك السريع)

1. من Telegram (n8n): زر ✅ يكتب `active=TRUE` + `workflow_status=PUBLISHED`
   + `qa_status=PASS` تلقائيًا.
2. يدويًا في الشيت: املأ الثلاثة صراحةً — أي خلل يعني عدم الظهور.
3. الظهور خلال ≤5 دقائق (كاش الحافة). تحقق:
   `https://omrantoys.store/api/products` و`/edge-api/products`.
