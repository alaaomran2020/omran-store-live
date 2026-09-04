# Omran Store Live

متجر Static يعمل بالكامل على Cloudflare Pages من هذا المستودع فقط.

- لا Backend ولا API ولا VPS ولا MySQL ولا Docker ولا Cloudflare Tunnel.
- المنتجات الموثقة داخل `client/src/lib/publicProductsSnapshot.ts`.
- صور المنتجات داخل `public/products/processed/`.
- الطلب والاستفسار عبر واتساب مباشرةً.
- النشر الوحيد من `.github/workflows/deploy-storefront.yml` إلى Cloudflare Pages.
- لا توجد شفرة خادم أو Worker أو migrations داخل المشروع.

## التشغيل

```bash
pnpm install
pnpm dev
```

## التحقق والنشر

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm deploy
```
