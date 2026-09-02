# نشر omrantoys.store عبر GitHub Actions

ملف الـWorkflow الجاهز: [`github-workflow-deploy.yml`](github-workflow-deploy.yml)

GitHub App لهذه الجلسة لا يملك صلاحية `workflows`، لذلك لا يمكن دفع الملف
مباشرة إلى `.github/workflows/`. بعد دمج هذا التغيير انسخه مرة واحدة
(من حسابك أنت، بصلاحية المستودع الكاملة):

```bash
mkdir -p .github/workflows
git mv deploy/github-workflow-deploy.yml .github/workflows/deploy.yml
git commit -m "ci: enable Cloudflare deploy workflow"
git push origin main
```

أو من واجهة GitHub: **Add file → Create new file** → المسار
`.github/workflows/deploy.yml` ← الصق محتوى `deploy/github-workflow-deploy.yml`.

لا تُوضع قيم Cloudflare في ملفات المشروع ولا في المحادثة. المستودع يحتوي فقط
أسماء الأسرار وخطوات النشر.

## 1) أسرار GitHub (مرة واحدة)

GitHub → المستودع → **Settings → Secrets and variables → Actions → New repository secret**

أضف سرّين:

| الاسم | المصدر | ملاحظات |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token | استخدم قالب **Edit Cloudflare Workers** (أو صلاحية Workers Scripts: Edit + Account Settings: Read) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → Account ID | يظهر في الشريط الجانبي الأيمن |

بعد الحفظ لن تظهر القيم مرة أخرى في GitHub. هذا هو المكان الصحيح لهما.

توكنات Meta (Instagram/Facebook) **ليست** أسرار GitHub؛ تُخزَّن على الـWorker:

```bash
wrangler secret put INSTAGRAM_ACCESS_TOKEN
wrangler secret put FACEBOOK_PAGE_ID
wrangler secret put FACEBOOK_PAGE_ACCESS_TOKEN
```

## 2) تشغيل النشر

بعد نسخ الملف إلى `.github/workflows/deploy.yml` وإضافة السرّين:

- **يدوي (موصى به للمرة الأولى):** تبويب Actions → **Deploy to Cloudflare** → Run workflow
- **تلقائي:** كل دفع إلى `main` بعد نجاح الاختبارات

التسلسل داخل الـWorkflow:

1. تثبيت الاعتماديات (`pnpm install --frozen-lockfile`)
2. فحص الأنواع (`pnpm check`)
3. الاختبارات (`pnpm test`) — إن فشلت لا يُنشر شيء
4. بناء الواجهة (`vite build` → `dist/public`)
5. `wrangler deploy` باستخدام السرّين أعلاه
6. فحص الموقع الحي: `/` و `/products` و `/api/products` (مع ترويسة `x-edge`)

إن نقص أحد السرّين تتوقف خطوة النشر برسالة واضحة دون طباعة أي قيمة.

## 3) بديل محلي بدون Actions

```bash
pnpm install
pnpm check && pnpm test
pnpm exec vite build
pnpm exec wrangler deploy
```
