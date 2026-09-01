# تفعيل النشر التلقائي GitHub → Cloudflare

صلاحيات هذه الجلسة لا تسمح بدفع ملفات داخل `.github/workflows/`، لذلك ملف
الـWorkflow جاهز هنا وعليك نقله يدويًا (خطوة واحدة):

```bash
mkdir -p .github/workflows
git mv deploy/github-workflow-deploy.yml .github/workflows/deploy.yml
git commit -m "Enable Cloudflare deploy workflow" && git push
```

ثم أضف في GitHub → Settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN` (صلاحية Edit Cloudflare Workers)
- `CLOUDFLARE_ACCOUNT_ID`

بعدها كل push إلى `main` ينشر تلقائيًا على `omrantoys.store`.
بديل يدوي بدون Actions: `pnpm exec vite build && wrangler deploy`.
