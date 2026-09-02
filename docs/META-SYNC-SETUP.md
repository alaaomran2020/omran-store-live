# مزامنة المنتجات مع Facebook وInstagram — دليل التفعيل

الموقع يجلب المنشورات تلقائيًا من صفحاتك الرسمية عبر **Meta Graph API** (الطريقة
الرسمية الوحيدة — Meta تمنع القراءة العامة بدون توكن)، ويعرض كل منشور كبطاقة
منتج على `omrantoys.store`. المزامنة **سحب عند الطلب مع كاش 5 دقائق**: أي منشور
جديد يظهر على الموقع خلال 5 دقائق كحد أقصى، بلا Webhooks ولا Cron ولا قاعدة
بيانات محتوى.

```
المتصفح ──▶ Cloudflare Worker (/api/social/feed)
                 ├── كاش 5 دقائق داخل الـWorker
                 ├── graph.facebook.com  (منشورات الصفحة)
                 └── graph.instagram.com (وسائط الحساب)
```

التوكنات تُقرأ داخل الـWorker فقط ولا تصل إلى المتصفح أبدًا.
إذا لم تُضبط التوكنات بعد، يعرض الموقع حالة فارغة احترافية مع روابط صفحاتك — لا
منتجات وهمية إطلاقًا.

---

## 1) إنشاء تطبيق Meta (مرة واحدة)

1. ادخل إلى <https://developers.facebook.com/apps> وأنشئ تطبيقًا جديدًا
   (نوع **Business** يكفي).
2. من **Use cases / Products** أضف:
   - **Facebook Login for Business** (للحصول على توكن الصفحة)
   - **Instagram API with Instagram Login** (لحساب Instagram Professional)
3. يجب أن يكون حساب Instagram من نوع **Professional (Business/Creator)**
   ومربوطًا بصفحة Facebook الخاصة بالمتجر.

## 2) توكن صفحة Facebook (طويل الأمد)

1. من **Graph API Explorer** اختر تطبيقك ثم اطلب Permissions:
   `pages_show_list`, `pages_read_engagement`.
2. خذ **User Access Token** ثم حوّله إلى طويل الأمد (60 يومًا) عبر:
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-token}`
3. اجلب توكن الصفحة (توكن الصفحة المشتق من توكن مستخدم طويل الأمد **لا تنتهي
   صلاحيته**): `GET /me/accounts` → انسخ `access_token` و`id` الخاصّين بصفحة
   المتجر. هذان هما `FACEBOOK_PAGE_ACCESS_TOKEN` و`FACEBOOK_PAGE_ID`.

## 3) توكن Instagram (طويل الأمد)

1. من إعدادات **Instagram API with Instagram Login** في تطبيقك، اربط حساب
   `@omrantoys.store` واحصل على **Instagram User Access Token** بصلاحيات
   `instagram_business_basic` (أو `instagram_basic` حسب نوع التكامل).
2. حوّله إلى طويل الأمد (60 يومًا):
   `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={app-secret}&access_token={short-token}`
3. هذا هو `INSTAGRAM_ACCESS_TOKEN`.
   للتجديد قبل الانتهاء: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={long-token}`
   (أي زيارة للموقع تستخدم التوكن؛ جدّده مرة كل شهر تقريبًا من نفس الرابط.)

## 4) تخزين الأسرار على Cloudflare (لا تضعها في Git أبدًا)

من مجلد المشروع وبعد `wrangler login`:

```bash
wrangler secret put INSTAGRAM_ACCESS_TOKEN
wrangler secret put FACEBOOK_PAGE_ID
wrangler secret put FACEBOOK_PAGE_ACCESS_TOKEN
```

كل منصة مستقلة: يمكنك تفعيل Instagram فقط أو Facebook فقط؛ ما لم يُضبط يظهر
كـ`not_configured` ولا يكسر الصفحة.

## 5) النشر والاختبار

```bash
pnpm install
pnpm check && pnpm test
pnpm exec vite build      # يبني dist/public
wrangler deploy           # ينشر الـWorker + الأصول على omrantoys.store
```

أو شغّل **Deploy to Cloudflare** يدويًا من تبويب Actions (أو ادمج إلى `main`)
بعد نسخ `deploy/github-workflow-deploy.yml` إلى `.github/workflows/deploy.yml`
(انظر `deploy/README-DEPLOY.md`). الـWorkflow يشغّل الاختبارات ثم `wrangler deploy`
ثم يفحص `https://omrantoys.store`. يتطلب سرّي `CLOUDFLARE_API_TOKEN` و
`CLOUDFLARE_ACCOUNT_ID` في GitHub → Settings → Secrets and variables → Actions
— بلا قيم داخل الملفات.

بعد النشر تحقق من:

```bash
curl -s https://omrantoys.store/api/social/feed | head -c 400
```

يجب أن ترى `{"posts":[...],"sources":{"instagram":"ok","facebook":"ok"},...}`.

## 6) التطوير المحلي

ضع نفس المتغيرات الثلاثة في `.env` (انظر `.env.example`) ثم `pnpm dev` —
نفس الوحدة المشتركة `shared/socialFeed.ts` تعمل في الخادم المحلي والـWorker.

## 7) زر واتساب على البطاقات (اختياري)

ضع رقم المتجر بالصيغة الدولية بدون `+` في
`client/src/lib/socialEmbeds.ts` → `whatsappNumber` (مثال: `"2010XXXXXXXX"`).
اتركه فارغًا لإخفاء الزر.
