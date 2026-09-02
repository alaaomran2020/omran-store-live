# لوحة إدارة المدراء — مصادقة واتساب OTP + RBAC

دليل تشغيلي كامل لميزة `/admin` في متجر عمران (النسخة المباشرة):

> **بلا كلمات مرور.** الهوية = رقم الواتساب الشخصي (E.164) + كود لمرة واحدة
> عبر قالب **Meta WhatsApp Cloud API**. كل الأسرار تُخزَّن في قاعدة البيانات
> كـ **SHA-256 مع `AUTH_PEPPER`**، والجلسة في **Cookie HttpOnly**.

---

## 1) ما الذي أُضيف؟

| الطبقة | الملفات | الوظيفة |
|---|---|---|
| التخزين | `drizzle/schema.ts` (جداول `admin_*` + `product_overrides`) | مدراء، تحديات OTP، جلسات، تدقيق، تجاوزات منتجات |
| الأمان | `server/adminAuth.ts` | تشفير، جلسات، RBAC على مستوى الحقل، حدود معدل، تدقيق، CSRF |
| واتساب | `server/adminWhatsapp.ts` | إرسال OTP (Meta Cloud API / dev) + تحقق Webhook |
| المسارات | `server/adminRoutes.ts` | `/api/admin/*` + `/api/webhooks/whatsapp` |
| الكتالوج | `server/adminCatalog.ts` + `shared/products.ts` | دمج تجاوزات المدراء فوق شيت Google Sheets |
| الحافة | `worker/index.ts` | دمج التجاوزات في `/api/products` العام (manifest من الأصل) |
| الواجهة | `client/src/admin/*` | شاشة دخول، قائمة منتجات، تعديل منتج (حسب الصلاحيات) |

### المسارات

| الطريقة | المسار | الوصف |
|---|---|---|
| POST | `/api/admin/auth/request-code` | طلب كود OTP (حدود معدل: 3/رقم/15د، 10/IP/ساعة) |
| POST | `/api/admin/auth/verify` | تحقق من الكود أو الرابط السحري → جلسة |
| POST | `/api/admin/auth/logout` | إبطال الجلسة ومسح الكوكي |
| GET | `/api/admin/auth/me` | المدير الحالي (يُقرأ من DB مع كل طلب) |
| GET | `/api/admin/products` | كتالوج مدموج (يشمل المخفي) + بحث + ترقيم |
| GET | `/api/admin/products/:id` | منتج واحد |
| PATCH | `/api/admin/products/:id` | تعديل حسب RBAC (سياسة "الكل أو لا شيء") |
| GET | `/api/admin/activity` | آخر نشاط للمدير الحالي |
| GET | `/api/admin/products/overrides-manifest` | عام — يقرأه الـWorker لدمج التجاوزات |
| GET/POST | `/api/webhooks/whatsapp` | اشتراك Meta + حالات تسليم + "توقف" |

---

## 2) التثبيت في الإنتاج (MySQL + VPS)

### أ) هجرة قاعدة البيانات

```bash
DATABASE_URL="mysql://user:pass@host:3306/omran_store" pnpm run db:push
```

يُنشئ الجداول: `admin_users`, `auth_challenges`, `admin_sessions`,
`admin_audit_log`, `product_overrides`.

### ب) زرع حساب المدير الأول

```bash
DATABASE_URL="mysql://user:pass@host:3306/omran_store" \
ADMIN_PHONE="+201000000000" \
ADMIN_NAME="المالك" \
ADMIN_ROLE="super_admin" \
ADMIN_PERMISSIONS='["*"]' \
node scripts/seed-admin.mjs
```

لدور محدود (موظف تحرير — الاسم/السعر/الوصف/الصورة فقط):

```bash
ADMIN_ROLE="limited_admin" \
ADMIN_PERMISSIONS='["products.name","products.price","products.description","products.images"]' \
node scripts/seed-admin.mjs
```

> تحذير: لا تزرع أرقامًا تجريبية في الإنتاج. أزل الحساب التجريبي فورًا
> (`DELETE FROM admin_users WHERE phone='...'`) بعد أول دخول حقيقي.

### ج) أسرار واتساب (على حاوية الخادم — ليست في wrangler.toml أبدًا)

```bash
AUTH_PEPPER="$(openssl rand -hex 32)"
WHATSAPP_PROVIDER=meta
WHATSAPP_TOKEN=<توكن دائم من Meta App>
WHATSAPP_PHONE_NUMBER_ID=<معرّف رقم العمل>
WHATSAPP_VERIFY_TOKEN=<أي سلسلة عشوائية — ستُستخدم في Meta Dashboard>
WHATSAPP_APP_SECRET=<سر تطبيق Meta>
WHATSAPP_OTP_TEMPLATE=omran_admin_login
WHATSAPP_TEMPLATE_LANG=ar
```

1. أنشئ تطبيق Meta + رقم WhatsApp Business (منصة Meta for Developers).
2. أنشئ قالب رسالة من نوع **Authentication** بالعربية يحتوي `{{1}}` (الكود).
3. في **Webhook** التطبيق: أضف اشتراك "messages"، والرابط
   `https://<نطاقك>/api/webhooks/whatsapp` مع `WHATSAPP_VERIFY_TOKEN`.
4. فعّل اشتراك رقم الهاتف (`messages` webhook fields).

> `AUTH_PEPPER` **إلزامي** في الإنتاج: بدونه يمكن لأي مسروق لقاعدة البيانات
> تزوير جلسات (تُخزَّن كـ hash فقط، والفلفل هو ما يجعلها غير قابلة للعكس).

---

## 3) وضع التطوير (بلا MySQL وبلا واتساب)

يعمل كل شيء في الذاكرة والكود يظهر مباشرة في شاشة الدخول:

```bash
ADMIN_PHONE="+201000000000" ADMIN_NAME="المالك" AUTH_DEV_MODE=1 pnpm run dev
```

- المخزن: `MemoryAdminStore` (يُزرع من `ADMIN_*`، ويُمسح عند إعادة التشغيل).
- الإرسال: يُسجَّل الكود في سجل الخادم ويُعرض في الواجهة (بانر أصفر).
- الرابط السحري يعمل أيضًا (`/admin/login?t=…&p=…`).

---

## 4) RBAC — خريطة الصلاحيات

| الحقل في المنتج | الصلاحية | limited_admin | super_admin |
|---|---|---|---|
| `name` | `products.name` | ✅ | ✅ |
| `price` | `products.price` | ✅ | ✅ |
| `description` | `products.description` | ✅ | ✅ |
| `image` | `products.images` | ✅ | ✅ |
| `active` (إظهار/إخفاء) | — | ❌ | ✅ فقط |

- **الإنفاذ على الخادم حصرًا**: أي حقل خارج صلاحيات المدير يُسقط الطلب
  كاملًا بـ 403 (لا تنفيذ جزئي صامت) مع تسجيل `product.update.denied`.
- الصلاحيات تُقرأ من قاعدة البيانات **مع كل طلب** — سحب صلاحية موظف يظهر
  فورًا دون انتظار انتهاء جلسته.
- كل فعل (ناجح أو مرفوض) في `admin_audit_log` مع `ip_hash` (بدون IP صريح).

## 5) تعديلات المنتجات — كيف تعمل مع Google Sheets؟

الشيت يبقى **مصدر الحقيقة** للبنية والترتيب والمنتجات الجديدة. تعديلات
اللوحة تُحفظ كـ **تجاوزات** في `product_overrides` وتُدمج فوق الشيت عند
القراءة (الحقل غير NULL يعلو قيمة الشيت):

```
الزائر ← /api/products ← حافة Cloudflare
                          ├─ شيت Google (كاش 5 دقائق)
                          └─ manifest التجاوزات من الأصل (كاش 60 ثانية)
                             └─ product_overrides في MySQL
```

- التعديل يظهر خلال ≤ ~5 دقائق (مدة كاش الكتالوج).
- إخفاء منتج (`active=false`) يحذفه من الكتالوج العام فور الدمج.
- إفراغ حقل في اللوحة = "لا تغيير" — لا يمكن مسح قيمة من الشيت عبر اللوحة
  (عدّل الشيت مباشرة لذلك).
- إذا تعذّر الوصول للأصل: تُقدَّم بيانات الشيت كما هي (تدهور سلس).

## 6) ملاحظات أمنية

- **الكود والتوكن لا يُخزَّنان نصًا أبدًا** — فقط `sha256(pepper::value)`.
- تحدٍّ واحد نشط لكل رقم؛ أي طلب كود جديد يُبطل السابق.
- 5 محاولات تحقق كحد أقصى ثم يُبطل التحدي (429).
- جلسة 8 ساعات بتجديد منزلق صامت، وإبطال فوري عند تسجيل الخروج.
- `SameSite=None` + `Secure` للكوكي (توافق مع المعاينة داخل iframe)، ومقابله
  حارس CSRF صارم: الطلبات المُغيِّرة تتطلب نفس الأصل أو رأس `X-Requested-With`.
- Webhook Meta: يرفض أي طلب بلا توقيع `X-Hub-Signature-256` صحيح
  (مقارنة زمنية ثابتة، والجسم الخام حرفيًا).
- حدود المعدل في الذاكرة (مناسبة للحاوية الواحدة) — عند التوسع لعدة نسخ
  انقل العدّاد إلى مخزن مشترك.

## 7) استكشاف الأخطاء

| العرض | السبب | الحل |
|---|---|---|
| 503 `database_unavailable` | `DATABASE_URL` غير مضبوط أو القاعدة معطلة | اضبطه وشغّل `db:push` |
| "هذا الرقم غير مسجّل كمدير" | الرقم ليس في `admin_users` | شغّل `seed-admin.mjs` |
| 502 "تعذّر إرسال كود واتساب" | إعدادات Meta ناقصة | راجع الأسرار والقالب |
| 403 `cross_origin_forbidden` | طلب مُغيِّر بلا رأس CSRF | عميل اللوحة يرسله تلقائيًا |
| الكود لا يصل | القالب غير معتمد أو الرقم ليس Business | راجع Meta Dashboard |
