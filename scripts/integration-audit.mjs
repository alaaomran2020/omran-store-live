import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const ok = condition => Boolean(condition);
const exists = relative => fs.existsSync(path.join(root, relative));
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!ok(condition)) errors.push(message);
};

const required = [
  "client/src/App.tsx",
  "client/src/admin/AdminAccess.tsx",
  "client/src/pages/Home.tsx",
  "client/src/pages/Products.tsx",
  "client/src/pages/ProductIntake.tsx",
  "client/src/pages/VipProgram.tsx",
  "client/src/pages/VipStaffRegistration.tsx",
  "client/src/pages/VipQrTest.tsx",
  "client/src/pages/VipOperations.tsx",
  "client/src/lib/vipQr.ts",
  "client/src/lib/vipManualOperation.ts",
  "client/src/lib/productIntakeClient.ts",
  "client/src/lib/analytics.ts",
  "client/src/lib/makeGateway.ts",
  "client/src/lib/publicProductsSnapshot.ts",
  "shared/products.ts",
  "shared/productIntake.ts",
  "shared/vipProgram.ts",
  "public/robots.txt",
  "public/sitemap.xml",
  ".env.example",
  "docs/CURRENT-ARCHITECTURE.md",
  ".github/workflows/deploy-storefront.yml",
];

for (const file of required)
  assert(exists(file), `missing required integration file: ${file}`);

if (exists("client/src/App.tsx")) {
  const app = read("client/src/App.tsx");
  assert(app.includes('path={"/"}'), "home route is not wired");
  assert(app.includes('path={"/products"}'), "products route is not wired");
  assert(app.includes('path={"/admin"}'), "admin route is not wired");
  assert(
    app.includes('path={"/admin/product-intake"}'),
    "product intake route is not wired"
  );
  assert(app.includes('path={"/vip"}'), "VIP program route is not wired");
  assert(
    app.includes('path={"/vip/staff-register"}'),
    "VIP staff registration route is not wired"
  );
  assert(
    app.includes('path={"/vip/qr-test"}'),
    "VIP local QR test route is not wired"
  );
  assert(
    app.includes('path={"/admin/vip-operations"}'),
    "protected VIP operations route is not wired"
  );
}

if (exists("client/src/pages/VipQrTest.tsx")) {
  const qrTest = read("client/src/pages/VipQrTest.tsx");
  assert(!qrTest.includes("fetch("), "VIP QR test must not call an API");
  assert(
    qrTest.includes("لا يثبت صلاحية الكارت"),
    "VIP QR test must warn that QR is not proof of validity"
  );
}

if (exists("client/src/pages/VipOperations.tsx")) {
  const operations = read("client/src/pages/VipOperations.tsx");
  assert(
    operations.includes("buildManualOperation"),
    "VIP operations page must use the validated row builder"
  );
  assert(!operations.includes("fetch("), "VIP operations must not call an API");
  assert(
    operations.includes("PENDING") ||
      read("client/src/lib/vipManualOperation.ts").includes('"PENDING"'),
    "manual VIP operations must start pending review"
  );
}

for (const forbiddenVipRuntime of [
  "automation/google-apps-script/vip-pilot.gs",
  "automation/google-apps-script/vip-operations.gs",
  "automation/google-apps-script/vip-console.gs",
  "automation/google-apps-script/vip-console.html",
]) {
  assert(
    !exists(forbiddenVipRuntime),
    `VIP must not depend on Apps Script: ${forbiddenVipRuntime}`
  );
}

if (exists("client/src/pages/VipStaffRegistration.tsx")) {
  const registration = read("client/src/pages/VipStaffRegistration.tsx");
  assert(
    registration.includes("buildStaffEnrollmentWhatsAppUrl"),
    "staff registration must use the WhatsApp handoff"
  );
  assert(
    !registration.includes("fetch("),
    "VIP staff registration must not call an API"
  );
  assert(
    !registration.includes("localStorage"),
    "VIP staff registration must not create a browser access session"
  );
  assert(
    registration.includes("ليس Access Token"),
    "the request reference must be labelled as non-authorizing"
  );
}

if (exists("client/src/pages/VipProgram.tsx")) {
  const vipPage = read("client/src/pages/VipProgram.tsx");
  assert(
    vipPage.includes("اسأل عن موعد الإطلاق"),
    "VIP page must make the pre-launch state clear through its customer CTA"
  );
  assert(
    !/(اشتر|شراء|اطلب الكارت)/.test(vipPage),
    "VIP page must not offer card sales before launch approval"
  );
  assert(
    !/\b(50|70|100)\s*(جنيه|جنيهًا)/.test(vipPage),
    "VIP page contains an unapproved example price or discount"
  );
}

if (exists("shared/vipProgram.ts")) {
  const vipEngine = read("shared/vipProgram.ts");
  assert(
    vipEngine.includes("maximumDiscountPiasters"),
    "VIP offers must require a monetary discount cap"
  );
  assert(
    vipEngine.includes("usageLimitPerCard"),
    "VIP offers must enforce a per-card usage limit"
  );
  assert(
    vipEngine.includes("OFFER_BUDGET_EXCEEDED"),
    "VIP offers must enforce the configured total budget"
  );
}

if (exists("client/src/admin/AdminAccess.tsx")) {
  const admin = read("client/src/admin/AdminAccess.tsx");
  assert(
    admin.includes("/cdn-cgi/access/get-identity"),
    "admin must verify Cloudflare Access identity"
  );
  assert(
    admin.includes("/cdn-cgi/access/logout"),
    "admin logout must use Cloudflare Access logout"
  );
  assert(
    !admin.includes("VITE_ADMIN_AUTH_URL"),
    "admin must not depend on a custom auth API"
  );
  assert(
    !admin.includes("sessionStorage"),
    "admin must not trust a browser-only session token"
  );
  assert(
    !admin.includes("localStorage") || !admin.includes("admin-session"),
    "admin must not trust a local admin session"
  );
}

if (exists("client/src/pages/ProductIntake.tsx")) {
  const intakePage = read("client/src/pages/ProductIntake.tsx");
  assert(
    intakePage.includes("submitProductIntake"),
    "product intake must submit to the operations gateway"
  );
  assert(
    !intakePage.includes("localStorage"),
    "product intake must not persist operational drafts in localStorage"
  );
  assert(
    !intakePage.includes("exportDrafts"),
    "product intake must not use CSV export as the operational handoff"
  );
}

if (exists("client/src/lib/productIntakeClient.ts")) {
  const intakeClient = read("client/src/lib/productIntakeClient.ts");
  assert(
    intakeClient.includes("FormData"),
    "product intake gateway must send the product image as multipart data"
  );
  assert(
    intakeClient.includes('form.append("photo"'),
    "product intake gateway must include the original photo"
  );
  assert(
    intakeClient.includes("NEEDS_REVIEW"),
    "product intake gateway must fail closed to NEEDS_REVIEW"
  );
}

if (exists("client/src/lib/analytics.ts")) {
  const analytics = read("client/src/lib/analytics.ts");
  assert(
    analytics.includes('"whatsapp_conversion"'),
    "analytics must expose the canonical WhatsApp conversion event"
  );
  assert(
    analytics.includes("MAKE_GATEWAY_URL"),
    "WhatsApp conversions must use the unified Make operations gateway"
  );
  assert(
    analytics.includes("product_id"),
    "conversion tracking must include product_id"
  );
  assert(analytics.includes("sku"), "conversion tracking must include SKU");
  assert(
    analytics.includes("category"),
    "conversion tracking must include category"
  );
}

if (exists("client/src/lib/makeGateway.ts")) {
  const gateway = read("client/src/lib/makeGateway.ts");
  assert(
    gateway.includes("hook.eu1.make.com"),
    "unified Make gateway URL must be configured"
  );
  assert(
    gateway.includes("catalog"),
    "unified Make gateway must expose the catalog action URL"
  );
}

if (exists("shared/productIntake.ts")) {
  const intake = read("shared/productIntake.ts");
  for (const source of [
    "Facebook",
    "Instagram",
    "WhatsApp",
    "Telegram",
    "Upload",
    "Camera",
    "Sync",
  ]) {
    assert(
      intake.includes(`"${source}"`),
      `image source is missing from intake contract: ${source}`
    );
  }
  assert(
    intake.includes('"NEEDS_REVIEW"'),
    "intake must fail closed to NEEDS_REVIEW"
