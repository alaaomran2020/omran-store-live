# STAGE 1 — Repository Consolidation Report

**التاريخ:** 2026-09-02
**Master / Source of Truth:** `alaaomran2020/omran-store-live`
**Secondary / Read-only Reference:** `alaaomran2020/omrantoys-store`

حالات التوثيق المعتمدة: NOT STARTED / IMPLEMENTED / CONFIGURED / DEPLOYED /
VERIFIED / BLOCKED — و`IMPLEMENTED` لا تعني `VERIFIED` حتى يمر الفحص على
Production.

---

## 1) Protected Baseline

| عنصر | القيمة |
|---|---|
| `main` HEAD قبل الدمج | `a04eca5587dbc08623a2f2c4710093019007b7ef` |
| وسم الحماية (محلي) | `backup/pre-consolidation-20260902` → نفس الـSHA |
| فرع العمل | جلسة Arena مثبّتة على `arena/01a063d2-omran-store-live` (سياسة المنصة تمنع إنشاء فروع أخرى؛ الـPR يُفتح منه إلى `main`) |
| Production routes | `omrantoys.store/*` + `www.omrantoys.store/*` → worker `omran-store-live-edge` (wrangler.toml) |
| GitHub Actions | workflow واحد نشط `Deploy to Cloudflare`؛ آخر نجاح قبل الدمج run `33676969960` |

### PRE-CONSOLIDATION BASELINE (محليًا)
- `pnpm install` PASS — `pnpm check` PASS — `pnpm test` PASS (129) — `pnpm build` PASS — lint: **غير موجود** (فجوة أُغلقت الآن).

## 2) حالة Production المسجّلة قبل التعديل (أدلة HTTP حقيقية)

| مسار | النتيجة | الحالة |
|---|---|---|
| `/` | SPA «كتالوج المنتجات» | DEPLOYED (قديمة) |
| `/api/health` | `{"status":"ok"}` عبر النفق | VERIFIED |
| `/health` | 404 | **فجوة** → أُغلقت كوديًا (بانتظار النشر) |
| `/robots.txt` | محتوى Cloudflare مُدار + SPA fallback (لا ملف حقيقي) | **فجوة** → أُغلقت |
| `/sitemap.xml` | 404 | **فجوة** → أُغلقت |
| `www.` | يقدّم نفس المحتوى بلا إعادة توجيه | **فجوة** → أُغلقت |
| `/api/products` | حمولة من **جيل قديم**: `{products:[…]}` بلا `status/fetchedAt` وحقول `image_url/stock/created_at` | **ANOMALY** |

### ANOMALY: عامل حافة قديم على مسارات الإنتاج
`/api/products` يعيد شكل الحمولة القديم، و`/api/social/feed` يعيد
`{"error":"Unauthorized"}` (ردّ أصل Express) بينما الكود الحالي في `main`
يجيب كلا المسارين من الحافة بشكل مختلف. الاستنتاج: **النشر الأخير من CI حدّث
نشر الـworkers.dev لكن مسارات الـzone ما زالت مربوطة بجيل worker أقدم**.
الإجراء الخارجي مطلوب (القسم 7). فحص CI الجديد يفشل صراحةً إذا استمرت
الحمولة القديمة بعد النشر (`payload lacks status field`).

## 3) ما نُقل من المرجع (Verified Business Assets)

- **العلامة:** `public/brand/` ← logo.png, logo-256.png, favicon.png,
  favicon-32.png, apple-touch-icon.png + `public/manifest.webmanifest`
  (مسارات الأيقونات فيه `/brand/…` كما في المرجع).
- **صور منتجات حقيقية:** 5 صور PNG بحجم 22MB حُوّلت إلى JPEG مُحسّن
  (~693KB إجمالًا، عرض 1200px، جودة 80) في `public/products/` — نفس الصور
  بلا توليد محتوى (01 مطبخ 46، 02 اسكوشي، 03 مطبخ 104، 04/05 زوايا بديلة).
- **بيانات منتجات موثّقة:** `docs/omran-real-products-import.csv` بأعمدة
  الشيت نفسها (`PRODUCT_COLUMNS`) مع SKU حقيقي في عمود id — يُختبر آليًا عبر
  `server/products.import.test.ts` بنفس محلّل الإنتاج.
- **التصنيفات/الأعمار:** `shared/taxonomy.ts` (10 تصنيفات + 5 فئات عمرية من
  المرجع بعد التحقق) مع تطبيع عربي يمنع تفرّع المكررات — `shared/taxonomy.test.ts`.
- **أساس الطلبات:** نقل دلالي لـ`orders/order_items` من مخطط D1 المرجعي إلى
  MySQL/Drizzle: `drizzle/0003_careless_veda.sql` (حالات
  new…returned + payment_status + shipping JSON + UTM + لقطة بنود) — **بلا Checkout**.

## 4) ما لم يُنقل صراحةً (Dead Weight)

`project.zip`، مخطط Supabase/B2B، Paymob/Fawry stubs، مكونات الواجهة القديمة
(cart/checkout/wishlist…)، `logo-original.png` (نسخة أرشيفية 1.2MB تبقى في
المرجع فقط)، معمارية D1 كقاعدة تشغيلية.

## 5) تغييرات البنية/الحافة

- `vite.config.ts`: `publicDir` = `public/` (جذر المشروع) مع `copyPublicDir:
  true`؛ أدوات `__manus__` تُقدَّم في التطوير عبر middleware ولا تدخل ناتج
  البناء (تحقّق: لا `__manus__` في `dist/public`).
- `client/index.html`: favicon/apple-touch/manifest/theme-color/og:image.
- `worker/index.ts`: `/health` حافّي خفيف `{status,service,timestamp}` بلا
  أسرار؛ و301 دائم `www.omrantoys.store → omrantoys.store` مع الحفاظ على
  المسار+الـquery.
- `wrangler.toml`: `run_worker_first` يشمل مسارات المستندات (/, /health,
  robots, sitemap, /products*, /categories*, /admin*, /settings*) حتى تسري
  إعادة التوجيه؛ الأصول المُجزّأة تبقى على طبقة الأصول.
- `public/robots.txt` (يمنع /admin و/settings/ و/api/ و/manus-storage/) و
  `public/sitemap.xml` (قابل للتمدد لصفحات المنتجات/التصنيفات لاحقًا).

## 6) CI/CD بعد التعديل

> **قيد منصة:** GitHub يرفض رفع تعديلات `.github/workflows` عبر تطبيق Arena
> (صلاحية `workflows` غير مطلوبة في manifest التطبيق ولا تُمنح من إعدادات
> المستودع). لذلك يُسلَّم الـworkflow المُشدَّد كاملًا في
> `docs/ci/deploy-hardened.yml` (مجرّب وظيفيًا) ليُطبقه المالك بنسخه إلى
> `.github/workflows/deploy.yml` عبر Web UI أو بعد إضافة المنصة للصلاحية.
> ما دخل هذا الـPR فعليًا: سكربت `pnpm lint` الجديد (chore(lint)).

`quality` (Install→Lint→Typecheck→Tests) يعمل أيضًا على `pull_request`؛
`deploy` على push/main فقط ويتضمن smoke صارمًا:
- `/health` = 200 + JSON صالح (`status=ok` + `service`) وإلا فشل (404/522/DNS/TLS فشل).
- 403 = فشل دائمًا إلا إذا نجح الفحص نفسه بترويسة `X-Omran-Smoke: $SMOKE_SECRET`
  (تجاوز WAF ضيّق مُثبت) — وإلا رسالة EXTERNAL ACTION REQUIRED.
- `www` يجب أن يعيد 301/308 مع Location يطابق المسار+الquery.
- `/api/products` يجب أن يحمل حقل `status` (يكشف عامل الجيل القديم).
- `robots.txt`/`sitemap.xml` ملفات حقيقية (ليست SPA HTML).
- جُرّب السكربت وظيفيًا ضد خوادم محلية (نجاح + فشل مقصود كلاهما exit صحيح).

## 7) MISSING_PRODUCT_DATA_REPORT (لا اختراع)

| منتج | الناقص | الإجراء |
|---|---|---|
| سيارة سباق بالريموت (id=1، منتج الشيت الحالي) | **صورة** حقيقية غير موجودة في أي مستودع؛ التصنيف أُسند بدلالة الاسم («تحكم عن بعد وروبوتات») ويحتاج تأكيد المالك | BLOCKED — صورة من المالك |
| المنتجات الثلاثة المنقولة | `original_price`/`discount`/`video` غير موجودة في المصدر | تُركت فارغة (لا اختراع) |
| Google Sheet | لا صلاحية كتابة | **BLOCKED — GOOGLE SHEET WRITE ACCESS REQUIRED** (الملف CSV جاهز للاستيراد اليدوي) |

## 8) إجراءات خارجية مطلوبة (خارج صلاحيات هذا المستودع)

1. **Google Sheets:** لصق/استبدال محتوى الورقة من
   `docs/omran-real-products-import.csv` (يتطلب صلاحية كتابة).
2. **Cloudflare:** التحقق من ربط مسارات الـzone بآخر نشر (معالجة ANOMALY
   الجيل القديم) — إعادة `wrangler deploy` أو من لوحة التحكم.
3. **MySQL Production:** تطبيق `drizzle/0003_careless_veda.sql` (أساس الطلبات).
4. **اختياري موصى به:** قاعدة zone-level Single Redirect لـwww (تغطية الأصول
   المُجزّأة)، وقاعدة WAF ضيّقة تسمح `/health` فقط بترويسة السر؛ ثم ضبط GitHub
   Secret باسم `SMOKE_SECRET` بنفس القيمة.

## 9) الأمان

- لا أسرار مضافة؛ `.env` مُتجاهل في `.gitignore`؛ السكربت يقرأ الأسرار من
  GitHub Secrets فقط؛ استجابة `/health` بلا أي بيانات حساسة (مُختبر).
