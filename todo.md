# Project TODO

- [x] نقل ميزة لوحة إدارة المدراء (WhatsApp OTP + RBAC) من مستودع التطوير إلى النسخة المباشرة: مصادقة بلا كلمات مرور عبر قالب Meta Authentication، جلسات HttpOnly مع AUTH_PEPPER (SHA-256)، صلاحيات تُقرأ من DB مع كل طلب، سجل تدقيق، حدود معدل، وCSRF guard — `server/adminAuth.ts` + `server/adminRoutes.ts` + `server/adminWhatsapp.ts`.
- [x] طبقة تخزين مزدوجة للوحة (`server/adminStore.ts`): MySQL عبر Drizzle في الإنتاج + MemoryAdminStore (بذور من ADMIN_*) للتطوير/المعاينة بلا قاعدة بيانات.
- [x] جداول جديدة (`drizzle/schema.ts`): admin_users، auth_challenges، admin_sessions، admin_audit_log، product_overrides.
- [x] تعديلات المنتجات كتجاوزات فوق Google Sheets: دمج في `shared/products.ts` (applyOverridesToProducts) يُستخدم في Express وواجهة الحافة، مع manifest عام يقرأه الـWorker من الأصل (كاش 60 ثانية وتدهور سلس).
- [x] واجهة `/admin` بالعربية RTL (دخول واتساب + قائمة + تعديل حسب RBAC) بألوان Dark Digital Brutalism.
- [x] دليل تشغيلي `docs/WHATSAPP-ADMIN-AUTH.md` + سكربت زرع `scripts/seed-admin.mjs` + اختبارات Vitest (أمان، مخزن، دمج التجاوزات).


- [x] تصميم نوع موحد لمنشورات Instagram وFacebook، يشمل الصور المفردة وCarousel والرابط وتاريخ النشر ومصدره.
- [x] بناء جالب Instagram خلفي يستخدم `INSTAGRAM_ACCESS_TOKEN` فقط على الخادم ويعيد أحدث المنشورات من Graph API.
- [x] بناء جالب Facebook Pages خلفي يستخدم `FACEBOOK_PAGE_ACCESS_TOKEN` و`FACEBOOK_PAGE_ID` فقط على الخادم ويعيد أحدث منشورات الصفحة.
- [x] دمج المنشورات وترتيبها تنازلياً مع إزالة التكرار عبر المعرفات والنصوص والروابط المتاحة.
- [x] إضافة ذاكرة تخزين مؤقت داخل الخادم بمدة صلاحية خمس دقائق من دون أي تخزين دائم للمحتوى.
- [x] توفير نقطة tRPC عامة تعرض البيانات الموحدة وحالة كل منصة دون كشف الأسرار.
- [x] تصميم صفحة منتجات متجاوبة بخلاصة شبكية توضح المصدر وتدعم Carousel والمنشورات الفردية وروابط المنصات الأصلية.
- [x] معالجة الفشل الجزئي بإظهار بيانات المنصة المتاحة وحالة مفهومة للمنصة المتعذرة.
- [x] إضافة واجهة إعدادات محمية لإرشاد المالك إلى أسماء الأسرار المطلوبة من دون قراءة أو عرض قيمها.
- [x] توثيق مسار تجديد رمز Instagram على الخادم ومنع تسجيل الرمز أو حفظه في قاعدة بيانات المحتوى.
- [x] كتابة اختبارات Vitest للتوحيد وإزالة التكرار والترتيب والفشل الجزئي والتخزين المؤقت.
- [x] التحقق من الواجهة على أحجام سطح المكتب والهاتف، وتشغيل فحوص الأنواع والاختبارات والبناء.
- [x] حفظ نقطة تحقق نهائية بعد مراجعة حالة قائمة العمل كاملة.
- [x] إلغاء جالب Instagram المعتمد على رمز وصول بناءً على تغيير النطاق إلى روابط عامة مباشرة بلا رموز.
- [x] إلغاء دعم وسائط Graph API المتنوعة لأنه لم يعد يُنسخ أو يُعرض محتوى منشورات داخل الموقع.
- [x] استبدال صفحة إعداد الأسرار بصفحة مصادر عامة بلا رموز؛ لا تحفظ أو تعرض أي صلاحية في الواجهة.
- [x] استبدال اختبارات توحيد منشورات Graph API باختبارات روابط المصادر الرسمية العامة.
- [x] إلغاء وضع تعطيل Instagram المؤقت واستبداله بمسار مستقل تماماً عن رموز الوصول.
- [x] إلغاء اعتماد الخلاصة على رموز وصول Meta بطلب المالك، ومقارنة البدائل الرسمية التي لا تتطلب إدارة Access Token قبل تنفيذ أي مسار جديد.
- [x] تقييم Facebook Page Plugin الرسمي بلا رمز؛ أعاد تسجيل الدخول في بيئة الويب، لذلك استُبدل برابط الصفحة الأصلي بدلاً من إطار فارغ.
- [x] إضافة مسار Instagram عام بلا رمز عبر رابط المنشور المميز والحساب الرسمي، مع توضيح أنه لا يكتشف منشورات جديدة كبطاقات مستقلة.
- [x] حذف اعتماد واجهة الخلاصة على tRPC وGraph API وإزالة اختبارات الأسرار، مع التحقق من عدم بقاء مراجع تشغيلية لرموز Meta في الكود.
- [x] معالجة فراغ التضمينات في المعاينة باستخدام بطاقات مصادر وروابط احتياطية مرئية دائماً.
- [x] إزالة أي مساحة تضمين فارغة متبقية وتقديم انتقال مباشر وصريح إلى المنشور أو الحساب الرسمي عند منع العرض داخل الإطار.
- [x] توثيق مراجعة لقطات `/products` و`/settings/social` على الهاتف وسطح المكتب قبل الحفظ النهائي.
- [x] إضافة زر مشاركة لصفحة المنتجات يستخدم Web Share API عند توفره وينسخ الرابط كبديل مع رسالة حالة واضحة.
- [x] بناء مزامنة رسمية مع Facebook وInstagram عبر Meta Graph API في وحدة مشتركة واحدة (`shared/socialFeed.ts`) تعمل في Cloudflare Worker وExpress معًا، مع كاش 5 دقائق وتحمّل الفشل الجزئي.
- [x] تقديم `/api/social/feed` من حافة Cloudflare مباشرة — التوكنات أسرار Worker ولا تصل للمتصفح، ولا حاجة لخادم VPS لعرض المتجر.
- [x] تحويل صفحة المنتجات إلى كتالوج يعرض كل منشور كبطاقة منتج (صورة، عنوان، وصف، تاريخ، مصدر، رابط أصلي، واتساب اختياري) مع بحث وفلترة بالمصدر وحالة فارغة احترافية بلا أي منتجات وهمية.
- [x] إزالة كل مراجع منصة الاستضافة السابقة من الشجرة (dockerignore، تعليق الـWorker، الوثائق) — لا يتبقى سوى بيانات peer الاختيارية داخل pnpm-lock من drizzle-orm.
- [x] إضافة نشر تلقائي GitHub → Cloudflare (`.github/workflows/deploy.yml`) وكتابة دليل تفعيل التوكنات `docs/META-SYNC-SETUP.md`.
- [x] جعل Google Sheets (CSV منشور للويب) مصدر المنتجات الوحيد عبر وحدة مشتركة واحدة (`shared/products.ts`): نوع `Product` موحّد، محلل CSV متسامح، تحويل `price`/`active`/`sort_order` لأنواعها، وكاش 5 دقائق — بلا Google API ولا OAuth ولا Service Account ولا قاعدة بيانات ولا لوحة تحكم.
- [x] تقديم `/api/products` من حافة Cloudflare (`worker/index.ts`) ومن Express (`server/products.ts`) بنفس الوحدة، مع بديل في المتصفح يقرأ الـCSV مباشرة عند غياب ضبط الـWorker.
- [x] دعم روابط صور Google Drive بتحويلها لصيغة عرض مباشرة مع محاولة بديلة ثم لوحة بديلة، بلا أي خدمة صور خارجية.
- [x] تحديث بطاقات المنتجات والتفاصيل والبحث وفلاتر التصنيفات وواتساب (باسم المنتج من الشيت) وأحداث التحليلات، مع الحفاظ على تصميم الموقع وRTL والتجربة على الهاتف.
- [x] اختبارات Vitest شاملة (61): تحليل CSV، الصفوف التالفة، السعر غير الصالح، المنتجات المخفية، بلا صورة، الترتيب، روابط Drive، الكاش، وواجهة الكتالوج في jsdom.
- [x] دليل تشغيلي بالعربية `docs/GOOGLE-SHEETS-PRODUCTS.md` + نموذج `docs/sample-products.csv` لإضافة منتج من الهاتف في أقل من دقيقتين.

## 2026-09-03 — Execution Run: Data Integrity + PR-safe CI + Pipeline Correction

- [x] فحص جنائي كامل (main, product-inquiry-fix, 12 PR, Actions, Production ×4, شيت حي, مجلد Drive) — الحقيقة: شيت حي بمنتج واحد فقط، و32 RAW في Drive.
- [x] إزالة البيانات الوهمية: 3 WebP بأسماء غير مطابقة (OT-00006..8) + 6 ملفات بأعـدات Drive مختلقة (1AaBbCcDd...) — RAW محفوظ في automation/raw-local/ (5 ملفات).
- [x] dedup حقيقي: dHash على الصور الخمس (03↔04 hamming=6) + نص العبوة → 5 ملفات = 3 منتجات فريدة.
- [x] معالجة محافظة 3 صور (no crop / no upscale / no generative) → public/products/processed/*.webp + process-manifest.json (PENDING_VISUAL_QA).
- [x] فهرس RAW حقيقي 32 ملفًا (معرّفات Drive فعلية): automation/raw-inventory.json.
- [x] تصحيحات بيانات موثقة: تصنيف «ألعاب مطبخ» للمطبخين بدل «دمى وشخصيات أبطال»، UPDATE تصنيف السيارة الموثق، OMR-IG-SQ-01 و OT-00001 → NEEDS_REVIEW/HOLD (لا نشر بمعلومات غير موثقة).
- [x] سكربتات pipeline مصححة: inventory-drive (dHash + Drive API JWT قراءة فقط + منع اختلاق أسماء)، process-images (من metadata موثق فقط)، upsert-sheet (UPSERT حقيقي: id→update، name/image→skip، JWT Sheets API v4، وضع PLAN بشفافية applied=false).
- [x] خطة Upsert جاهزة على snapshot حقيقي: sheet-upsert-plan.csv (3 إضافات) + sheet-upsert-updates.csv (صف 2) + audit (PLANNED).
- [x] CI: تحسين مُجهَّز كاتش جاهز `docs/CI-IMPROVEMENT.patch` — job `ci` على كل PR (install/lint/typecheck/test/build) + `deploy` فقط push→main/يدوي (لا نشر من PR). (تطبيق Arena بلا صلاحية `workflows` — المالك يطبّقه قبل/عند الدمج.)
- [x] Tests: buildWhatsAppInquiryPayload (price_mode×cta_location×sku×payload) + trackWhatsAppInquiry (inquiry + legacy click، فشل آمن) — analytics.test.ts.
- [x] SEO: canonical في index.html. الواجهة: footer بتواصل واتساب عام حقيقي ومعلومات ثقة (بلا أرقام مختلقة).
- [x] وثيقة حالة صادقة: docs/RAW-PRODUCTS-IMPORT-HANDOFF.md (BLOCKERS B1-B4 بإجراءات بشرية محددة).
- [ ] BLOCKER B1: تنزيل 32 RAW + dedup بصري + metadata (بيئة بشبكة Google) → توسيع الكتالوج.
- [ ] BLOCKER B2: تطبيق plan/updates على الشيت (يدوي أو SERVICE_ACCOUNT) → نشر 2 مطبخ + تحديث السيارة.
- [ ] BLOCKER B3: Merge PR → main → Cloudflare deploy → إعادة smoke tests.
