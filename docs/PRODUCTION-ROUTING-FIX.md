# Incident: `/api/*` على omrantoys.store يستجيبه Worker قديم (stale route)

التاريخ: 2026-09-02 · الحالة: **تمت استعادة الكتالوج repository-side** · الإصلاح الجذري (Cloudflare routes): **إجراء خارجي**

---

## 1) الخلاصة التنفيذية

- `omran-store-live-edge` يملك route النطاق الكامل `omrantoys.store/*` و`www.omrantoys.store/*` — لهذا يعمل `/health` والموقع والأصول.
- يوجد **Worker قديم (نشر stale أقدم حتى من كود `alaaomran2020/omrantoys-store` الحالي)** يملك route أكثر تحديدًا على `omrantoys.store/api*`، فيختطف كل مسارات `/api/*`.
- الكتالوج عاد للعمل رغم ذلك عبر مرآة `/edge-api/products` (خارج `/api/*` فلا يملكها القديم) + fallback CSV مدمج في البناء.
- الخطوة المتبقية الجذرية: **حذف الـroute القديم من Cloudflare** (إجراء خارجي — يحتاج دخول Cloudflare).

## 2) الأدلة (مجموعة 2026-09-02، مع cache-busting)

| الطلب | الرد | الدلالة |
|---|---|---|
| `GET /health` | `{"status":"ok","service":"omran-store-live",...}` | الـWorker الجديد يملك route النطاق ✅ |
| `GET /api/products` | `{"products":[{"id":"1","price":350,"image_url":"","stock":10,"created_at":...}]}` بلا `status`/`fetchedAt` | schema غير موجود في هذا المستودع إطلاقًا → نشر قديم ❌ |
| `GET /api/health` | `{"status":"ok"}` | لا يطابق كود `omrantoys-store` الحالي (`{success,service,database,time}`) ولا هذا الـrepo → stale ثالث |
| `GET /api/social/feed` | `{"error":"Unauthorized"}` | لا يطابق معالج الحافة (`x-edge`/502 social_feed_unavailable) → مسار مختطف |
| `GET /api/admin/products/overrides-manifest` | `{"error":"Unauthorized"}` | نفس التوقيع → القديم يملك `/api*` بالكامل |
| `GET /edge-api/products` | `{"products":[...],"status":"ok","fetchedAt":...}` | المرآة تصل للـWorker الجديد ✅ |

## 3) ما نُفّذ repository-side (merged)

1. PR #9 — `.env.production` يدمج رابط الشيت العام في بناء الواجهة (fallback CSV).
2. PR #10 — مرآة `/edge-api/products` في `worker/index.ts` + `run_worker_first` في `wrangler.toml` + سلسلة المحاولات في `client/src/lib/productsClient.ts`:
   `/api/products` → `/edge-api/products` → CSV المنشور مباشرة.

## 4) الإجراء الخارجي المطلوب (Cloudflare)

> الهدف: أن يستعيد `/api/products` (وكل `/api/*`) مساره الأساسي على الـWorker الجديد.

**من اللوحة (Dashboard):**
1. Cloudflare → Account → Workers & Pages → **Routes** (أو Zone omrantoys.store → Workers Routes).
2. حدد الـroute الذي يطابق `omrantoys.store/api*` (مثل `omrantoys.store/api/*`) والمرتبط بـworker **ليس** `omran-store-live-edge`.
3. **Delete route** (لا تحذف الـWorker نفسه — مجرد فصل الـroute).
4. تحقق فورًا: `curl "https://omrantoys.store/api/products?cb=$(date +%s)"` → يجب أن يعيد `"status":"ok"` مع `fetchedAt`.

**أو عبر API:**
```bash
# اعرض الـroutes لتحديد الـroute القديم (id + script)
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes"

# احذف route القديم فقط (لا تمس routes: omrantoys.store/* ولا www.omrantoys.store/*)
curl -X DELETE -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes/$ROUTE_ID"
```

**بعد الحذف:** لا حاجة لأي deploy — route النطاق `omrantoys.store/*` يستقبل `/api/*` فورًا.
سلسلة fallback في العميل تبقى كما هي (المسار الأساسي يفوز أولًا).

## 5) التحقق بعد الإصلاح الخارجي

- `/api/products` → `status === "ok"` + `fetchedAt` حديث + نفس منتجات `/edge-api/products`.
- `/api/health` → يُجاب من الأصل عبر البروكسي أو من الحافة (بلا شكل القديم).
- لوحة `/admin` تستجيب (`/api/trpc` يعود للعمل عبر البروكسي).
- مراقبة أن `/edge-api/products` يظل يعمل (سيبقى fallback دائم بلا ضرر).

## 6) Rollback

- PR #9: `git revert <merge-commit>` → إعادة نشر (يفسد fallback CSV فقط).
- PR #10: `git revert <merge-commit>` → إعادة نشر (يزيل المرآة من العميل والحافة).
- حذف route القديم: إعادة إنشاء نفس الـpattern من اللوحة إن لزم (غير متوقع).
