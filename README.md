# Omran Store Live

المستودع الوحيد للمتجر الإنتاجي لشركة عمران التجارية — لعب أطفال وهدايا.

## Architecture

- Static Vite storefront على Cloudflare Pages فقط.
- لا Backend ولا API ولا VPS ولا MySQL ولا Docker ولا Cloudflare Tunnel ولا Worker runtime.
- المنتجات العامة الموثقة داخل `client/src/lib/publicProductsSnapshot.ts`.
- Product Engine المشترك وقواعد `active + PUBLISHED + PASS` داخل `shared/products.ts`.
- صور المنتجات العامة داخل `public/products/processed/` وتُخدم من نفس الدومين.
- Google Sheet هو مصدر البيانات التشغيلي الخارجي عند استخدام `VITE_PRODUCTS_SHEET_URL`.
- Product Image Intake داخل `/admin/product-intake` لاستقبال صور من Camera / Upload / Facebook / Instagram / WhatsApp / Telegram / Sync.
- أي صورة جديدة تبدأ `NEEDS_REVIEW` ولا تُنشر تلقائيًا.
- حقول Intake في Sheet: `image_source`, `image_source_ref`, `image_verification_status`, `image_match_key`, `intake_channel`, `intake_notes`.

## Repository integration

`node scripts/integration-audit.mjs` يتحقق من:

- ربط مسارات Home / Products / Product Intake.
- وجود Product Publication Guard.
- وجود عقد Product Intake المشترك.
- وجود صور المنتجات المشار إليها داخل الـsnapshot.
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
```

## Production deployment

النشر الوحيد يتم من `.github/workflows/deploy-storefront.yml` إلى Cloudflare Pages project:

`omrantoys-live-app`
