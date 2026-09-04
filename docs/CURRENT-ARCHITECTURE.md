# Omran Store Live — Current Architecture Contract

هذه الوثيقة هي المرجع التشغيلي الحالي الوحيد لمعمارية المتجر.

## Production Source of Truth

- Repository: `alaaomran2020/omran-store-live`
- Branch: `main`
- Hosting: Cloudflare Pages
- Pages project: `omrantoys-live-app`
- Domains: `https://omrantoys.store` و `https://www.omrantoys.store`
- Runtime: Static Vite storefront only

## Runtime Rules

المشروع الحالي لا يستخدم ولا يحتاج:

- Backend server
- Custom application API
- VPS
- MySQL
- Docker / docker-compose
- Cloudflare Tunnel
- Cloudflare Worker runtime

أي إعادة إدخال لأي من هذه العناصر إلى مسار Production تحتاج قرار معماري جديد صريح، ولا تعتبر جزءًا من المعمارية الحالية.

## Admin Security Architecture

مسارات الإدارة:

- `/admin`
- `/admin/product-intake`

الحماية المعتمدة هي **Cloudflare Access** على مستوى الدومين، وليست كلمة مرور داخل JavaScript وليست جلسة مخزنة في `localStorage` أو `sessionStorage`.

قواعد الأمان:

1. Cloudflare Access يجب أن يحمي المسارين `/admin*` قبل وصول الطلب إلى Cloudflare Pages.
2. سياسة Access تحتوي فقط على الموظفين الذين وافق عليهم الأدمن.
3. هوية المستخدم يتم التحقق منها داخل الواجهة عبر `/cdn-cgi/access/get-identity`.
4. إذا لم ترجع Cloudflare هوية صالحة، لوحة الإدارة تعمل Fail Closed ولا تعرض Product Intake.
5. تسجيل الخروج يستخدم `/cdn-cgi/access/logout`.
6. لا يوجد `VITE_ADMIN_AUTH_URL` ولا Custom Auth API ولا كلمات مرور مخزنة داخل الواجهة.
7. طلبات الموظفين الجدد يمكن تجهيزها عبر WhatsApp، لكن إضافة الموظف الفعلية تتم في Cloudflare Access Policy فقط بعد موافقة الأدمن.

### Cloudflare Access production policy

يجب إنشاء Self-hosted Access Application على `omrantoys.store/admin*`، وإن كان `www` مستخدمًا للوصول الإداري فيجب إضافة تطبيق أو hostname مطابق له أيضًا.

السياسة الموصى بها:

- Decision: Allow
- Include: البريد/الهوية المعتمدة للموظف فقط
- Session duration: قصيرة نسبيًا للوحة الإدارة
- Block by default لأي مستخدم غير موجود في سياسة Allow

هذه الحماية لا تحتاج VPS ولا Backend دائم. Cloudflare Access هو طبقة المصادقة الخارجية الوحيدة لمسار الإدارة.

## Storefront Integration

- Routes are wired from `client/src/App.tsx`.
- Public catalog snapshot is in `client/src/lib/publicProductsSnapshot.ts`.
- Shared product publication logic is in `shared/products.ts`.
- Public product images are same-origin assets under `public/products/processed/`.
- WhatsApp is the customer conversion/contact path configured through `VITE_WHATSAPP_NUMBER`.

## Product Publication Guard

Public products must satisfy the existing fail-closed publication contract:

- `active = true`
- `workflow_status = PUBLISHED`
- `qa_status = PASS`

Any uncertain product/image remains outside the public catalog until reviewed.

## Product Image Intake

Route: `/admin/product-intake`

Supported source labels:

- Facebook
- Instagram
- WhatsApp
- Telegram
- Upload
- Camera
- Sync

Every new image intake starts as `NEEDS_REVIEW`. Intake never promotes a product or image to `VERIFIED`, `PASS`, or `PUBLISHED` automatically.

## Deployment Contract

`.github/workflows/deploy-storefront.yml` is the only production deployment workflow.

Required validation before deployment:

1. Repository integration audit
2. Lint
3. Typecheck
4. Tests
5. Production build
6. Public catalog/image bundle validation

Only successful `main` validation may continue to Cloudflare Pages deployment.

## Domain Ownership

The old `omrantoys-store` repository must not deploy to `omrantoys-live-app` or claim the production domains. The live repository is the sole deployment source for the current storefront.

## Change Control

Any change that conflicts with this document must update this contract and the automated integration audit in the same pull request. Production architecture must never drift silently from the documented state.
