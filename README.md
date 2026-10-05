# Omran Store Live

المستودع الوحيد للمتجر الإنتاجي لشركة عمران التجارية — لعب أطفال وهدايا.

## Architecture

- Static Vite storefront على Cloudflare Pages فقط.
- لا Backend ولا API ولا VPS ولا MySQL ولا Docker ولا Cloudflare Tunnel ولا Worker runtime.
- **مصدر الحقيقة الوحيد للكتالوج هو ملف المستودع `public/catalog/products.csv`.**
  يحوّله البناء إلى لقطة مضمّنة داخل `client/src/lib/publicProductsSnapshot.ts`
  عبر `scripts/generate-public-products-snapshot.ts` — بلا أي نداء شبكة للبيانات.
- منتجات POP UP الخمسة معزولة داخل `client/src/lib/popupProductsSnapshot.ts`.
- Product Engine المشترك وقواعد `active + PUBLISHED + PASS` داخل `shared/products.ts`.
- صور المنتجات العامة داخل `public/products/processed/` وتُخدم من نفس الدومين.
- **لا يوجد أي اعتماد كتالوج خارجي وقت التشغيل أو البناء أو النشر:**
  - Google Apps Script ليس مصدر كتالوج إنتاجي ولا fallback.
  - Google Sheet الحي ليس مصدر كتالوج إنتاجي ولا fallback.
  - بوابة Make تُستخدم للعمليات والقياس فقط (تحويلات واتساب / إجراءات الإدارة)،
    وليست مصدر كتالوج.
  - لا يوجد متغير بيئة يمكنه إعادة تفعيل مصدر كتالوج قديم (أُزيل
    `VITE_PRODUCTS_SHEET_URL`).
- بيانات المنتجات الإنتاجية محمية: لا تُعدَّل المعرفات أو الروابط أو الأسماء أو
  الأسعار أو التوفر أو الأوصاف أو مراجع الصور إلا عبر تعديل مُعتمد على
  `public/catalog/products.csv`.
- Product Image Intake داخل `/admin/product-intake` لاستقبال صور من Camera / Upload / Facebook / Instagram / WhatsApp / Telegram / Sync.
- أي صورة جديدة تبدأ `NEEDS_REVIEW` ولا تُنشر تلقائيًا.
- حقول Intake في Sheet: `image_source`, `image_source_ref`, `image_verification_status`, `image_match_key`, `intake_channel`, `intake_notes`.

## Repository integration

`node scripts/integration-audit.mjs` يتحقق من:

- ربط مسارات Home / Products / Product Intake.
- وجود Product Publication Guard.
- وجود عقد Product Intake المشترك.
- وجود صور المنتجات المشار إليها داخل الـsnapshot.
- غياب أي مصدر كتالوج خارجي (Apps Script / Google Sheet حي / Make).
- عزل كتالوج POP UP (5 منتجات) عن كتالوج الألعاب.
- بقاء بوابات حماية الوسائط في workflow النشر.
- عدم رجوع أي `server/`, `worker/` أو `docker-compose.yml` إلى الريبو اللايف.

GitHub Actions يشغّل Integration Audit + Lint + Typecheck + Tests + Build على Pull Requests قبل السماح بالنشر.

## Local commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm check
pnpm test
pnpm build
node scripts/integration-audit.mjs
node scripts/catalog-dependency-gate.mjs
pnpm sitemap:generate
```

## Production deployment

النشر الوحيد يتم من `.github/workflows/deploy-storefront.yml` إلى Cloudflare Pages project:

`omrantoys-live-app`

مسار النشر حتمي:

```
public/catalog/products.csv            ← مصدر الحقيقة (داخل المستودع)
  → scripts/generate-public-products-snapshot.ts   (وقت البناء، بلا شبكة للبيانات)
    → client/src/lib/publicProductsSnapshot.ts     (مضمّن في الحزمة)
      → الواجهة + sitemap + البيانات المهيكلة      (نفس المصدر بالضبط)
```

`scripts/catalog-dependency-gate.mjs` يفشل البناء إذا عاد أي اعتماد على Apps
Script أو Google Sheet حي أو بوابة Make للكتالوج. كما يحتفظ workflow النشر
ببوابة سلامة الوسائط fail-closed مقابل `dist/public` قبل الرفع.
