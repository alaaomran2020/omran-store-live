# OMRAN TOYS — حالة Pipeline المنتجات الخام (2026-09-03)

> وثيقة حالة صادقة: ما نُفذ فعليًا، وما هو مُخطَّط جاهز للتنفيذ، وما هو BLOCKED
> لاشتراط إنساني (شبكة/اعتمادات) لا يمكن تجاوزه من داخل بيئة التنفيذ الحالية.

---

## 1) الحقائق الموثقة (تحقّق منها التنفيذ مباشرة)

| البند | الحالة الفعلية | المصدر |
| --- | --- | --- |
| منتجات Production الحية | **منتج واحد** (سيارة سباق بالريموت — 350 ج.م — بلا صورة ولا تصنيف) | `https://omrantoys.store/edge-api/products` |
| صور RAW في مجلد Drive | **32 صورة** (FB_IMG_*.jpg) + مجلدَا originals/processed | فهرس المجلد العام `1Xbq8V4-9-6GRUVb5dejriQOmcR7nn7_k` |
| صور في المستودع (من مستودع المرجع) | 5 ملفات = **3 منتجات فريدة** (01=02 نفس المنتج، 03=04 نفس المنتج) | md5 + dHash (hamming 03↔04 = 6) + نص العبوة الظاهر |
| البيانات الوهمية المزالة | 3 صور WebP بأسماء منتقاة خطأ (OT-00006..8) + 6 ملفات بيانات بأعـدات Drive مختلقة (1AaBbCcDd...) + خرائط «سيارة/دباب/مكعبات» غير مطابقة للصور | مراجعة بصرية + git diff |
| منتجات STAGE 1 الموثقة | OMR-IG-KIT-46 (850) و OMR-IG-HC-104 (1850) و OMR-IG-SQ-01 (275) | `docs/omran-real-products-import.csv` |

### تصحيحات بيانات منفذة
- **OMR-IG-KIT-46 / OMR-IG-HC-104**: الصور مطابقة للعبوة (46 PCS / HOME CHEF 104PCS) — صُنفَت إلى «ألعاب مطبخ» بدل «دمى وشخصيات أبطال» (تصنيف STAGE 1 غير مطابق).
- **OMR-IG-SQ-01 (الاسكوشي)**: STAGE 1 ربطه بصورة مطبخ (مخالفة) → **HOLD / NEEDS_REVIEW** حتى توفر الصورة الصحيحة (على الأرجح من الـ32 في Drive).
- **OT-00001 (حيوانات بلاستيك)**: صورة فقط بلا Listing موثق → **NEEDS_REVIEW، غير منشور (active=FALSE)** حتى يتأكد المالك.
- **سيارة سباق بالريموت**: UPDATE لإضافة التصنيف الموثق «تحكم عن بعد وروبوتات» فقط.

---

## 2) ما أُنجز فعليًا في هذه الجلسة

1. **فحص جنائي كامل**: main + product-inquiry-fix + 12 PR + Actions + Production (4 مسارات) + شيت حي + مجلد Drive.
2. **إزالة البيانات الوهمية** (8 ملفات) + حفظ كل RAW (5 ملفات → `automation/raw-local/`).
3. **معالجة 3 صور بمعالجة محافظة** (بدون قص/upscale/توليد) → `public/products/processed/*.webp` + `automation/process-manifest.json` (QA: PENDING_VISUAL_QA للتحقق البشري النهائي).
4. **فهرس RAW حقيقي** من فهرس Drive الفعلي: `automation/raw-inventory.json` (32 ملفًا بمعرّفات حقيقية — لا اختلاق).
5. **Pipeline مصحح** (3 سكربتات):
   - `scripts/inventory-drive.mjs` — فهرس + dHash dedup حقيقي (hamming ≤ 6) + Drive API JWT (قراءة فقط) + **لا اختلاق أسماء**.
   - `scripts/process-images.mjs` — معالجة محافظة من `product-metadata.json` فقط (منع اختلاق) + مانيفست بصري.
   - `scripts/upsert-sheet.mjs` — **UPSERT حقيقي** (id → update، اسم/صورة → skip، وإلا insert) + كتابة Sheets API v4 عبر JWT خام + وضع PLAN يدوي بشفافية.
6. **خطة Upsert جاهزة** (محسوبة على snapshot حقيقي للشيت):
   - `automation/sheet-upsert-plan.csv` — 3 إضافات (2 PUBLISHED + 1 NEEDS_REVIEW مخفي)
   - `automation/sheet-upsert-updates.csv` — تحديث صف 2 (تصنيف السيارة)
   - `automation/sheet-upsert-audit.json` — `mode=PLANNED, applied=false` (لا ادعاء تنفيذ)
7. **CI**: فصل صارم مُجهَّز كاتش جاهز (`docs/CI-IMPROVEMENT.patch`): `ci` job على كل PR (install/lint/typecheck/test/build) و `deploy` فقط push→main/يدوي. (تطبيق Arena بلا صلاحية `workflows` — يطبّقه المالك قبل/عند الدمج؛ الوضع الحالي آمن أصلًا: النشر من main فقط.)
8. **Tests**: تغطية `whatsapp_product_inquiry` (price_mode × cta_location × sku fallback × payload) + تغطية واثساب/السعر الموجودة. 152+ اختبارًا خضراء.
9. **SEO**: `canonical` مضاف؛ robots/sitemap/OG/RTL موجودة أصلًا.
10. **واجهة**: footer بتواصل واتساب عام حقيقي + معلومات ثقة (بلا أرقام/مراجعات مختلقة).

---

## 3) BLOCKERS الحقيقية (إجراءات بشرية لا يمكن أتمتتها من هذه البيئة)

### B1 — تنزيل وعرض 32 صورة RAW (Phases 4–7)
البيئة الحالية لا تصل إلى Google بثانٍ (curl → 000) ولا تنزّل بايتات (fetch نصّي فقط).
**الخطوة البشرية:** من أي جهاز يفتح `https://drive.google.com/drive/folders/1Xbq8V4-9-6GRUVb5dejriQOmcR7nn7_k`
→ تنزيل كل الـ32 صورة إلى `automation/raw-downloads/` → `node scripts/inventory-drive.mjs`
(dHash يجمع التكرارات بصريًا) → فحص المجموعات بصريًا وتعبئة أسماء المنتجات الموثقة في
`automation/product-metadata.json` → `node scripts/process-images.mjs`.

### B2 — كتابة Google Sheet (Phase 10)
لا اعتمادات Google في البيئة (ولا يُنصح بوضعها في الشات).
**المسار الأسرع (دقيقتان):**
1. افتح `https://docs.google.com/spreadsheets/d/1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc/edit#gid=57015348`
2. استبدل **الصف 2** بمحتوى `automation/sheet-upsert-updates.csv` (صف السيارة).
3. ألصق صفوف `automation/sheet-upsert-plan.csv` أسفل آخر صف.
4. تحقق خلال ~5 دقائق: `https://omrantoys.store/edge-api/products`.
**المسار الآلي (اختياري):** أنشئ Service Account بسcope `spreadsheets`، أضفه كـ
`GOOGLE_SERVICE_ACCOUNT_JSON` في GitHub Secrets، ثم `node scripts/upsert-sheet.mjs` يكتب فعليًا.

### B3 — تطبيق تحسين CI + Merge → main + Cloudflare Deploy (Phases 19, 23–25)
**ملاحظة:** تطبيق Arena (GitHub App) بلا صلاحية `workflows` — لذلك تحسين CI مُرفق
كباتش جاهز في `docs/CI-IMPROVEMENT.patch` (فصل `ci` job على كل PR: install/lint/
typecheck/test/build + `deploy` فقط push→main/يدوي).
**الخطوات البشرية:**
1. تطبيق الكاتش (مرة واحدة): `git apply docs/CI-IMPROVEMENT.patch` + commit + push —
   أو لصق المحتوى في `.github/workflows/deploy.yml` من Web UI.
   (الوضع الحالي — حتى التطبيق — آمن: النشر يحدث فقط من main/يدوي؛ الكاتش يضيف
   فحص CI على كل PR.)
2. مراجعة PR → Merge (استراتيجية Merge commit، بلا force push).
3. مراقبة `Deploy to Cloudflare` (build → wrangler deploy → smoke checks).
4. إعادة فحص Production: `/`, `/products`, `/api/products`, `www`.

### B4 — حذف Route قديم يظلل `/api/*` (موجود ومُعالَج)
مُوثق في `docs/PRODUCTION-ROUTING-FIX.md`: الـWorker الجديد يخدم الكتالوج عبر
`/edge-api/products` والعميل يسقط عليه تلقائيًا؛ الحذف النهائي لroute قديم في لوحة
Cloudflare إجراء خارجي. **لا أثر وظيفي** الآن (الفحص: العميل يعرض المنتجات عبر المرآة).

---

## 4) Reconciliation (Phase 29) — الأرقام الحقيقية

```
32 RAW (Drive)     → 0 معالَج (B1: يحتاج تنزيل + dedup بصري)
 5 ملفات (المستودع) → 3 فريدة (dHash/نص عبوة) → 2 PUBLISHED + 1 NEEDS_REVIEW
 1 منتج (شيت حي)    → UPDATE (تصنيف موثق)
─────────────────────────────────────────────
Plan النهائي للشيت: 1 UPDATE + 3 INSERT (2 PUBLISHED, 1 NEEDS_REVIEW مخفي) + 1 HOLD
Duplicates المحفوظة: 2 ملف (02=01 بصريًا، 04=03 dHash=6)
NEEDS_REVIEW: OT-00001 (حيوانات) + OMR-IG-SQ-01 (اسكوشي — صورة خاطئة في STAGE 1)
```

بمجرد تطبيق B1+B2: الكتالوج الحي = 3 منتجات منشورة (car + مطبخان) وبعدها يتوسع
بالمنتجات الفريدة من الـ32 (عددها الفعلي سيحدده dedup البصري — لا رقم افتراضي).
