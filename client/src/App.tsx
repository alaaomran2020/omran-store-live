import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import SkipLink from "./components/SkipLink";

const AdminAccess = lazy(() => import("@/admin/AdminAccess"));
const AccountApp = lazy(() => import("@/account/AccountApp"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PopUp = lazy(() => import("@/pages/PopUp"));
const PopupVideos = lazy(() => import("@/pages/PopupVideos"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const Storefront = lazy(() => import("@/pages/Storefront"));
const Rewards = lazy(() => import("@/pages/Rewards"));
const VipProgram = lazy(() => import("@/pages/VipProgram"));
const VipPrivacy = lazy(() => import("@/pages/VipPrivacy"));
const VipQrTest = lazy(() => import("@/pages/VipQrTest"));
const VipStaffRegistration = lazy(() => import("@/pages/VipStaffRegistration"));
const VipTerms = lazy(() => import("@/pages/VipTerms"));

/**
 * كل مسارات الإدارة تُركّب AdminAccess نفسه (بوابة Cloudflare Access على
 * الحافة) ثم يتولى الراوتر المتداخل في admin/AdminApp.tsx توزيع الصفحات.
 * المسارات القديمة (product-intake/vip-operations) ومسارات النسخة المبسطة
 * السابقة (reviews/search/leads/vip/staff/activity/diagnostics) محفوظة هنا؛
 * غير المعروف منها يحوّله الراوتر المتداخل إلى لوحة التحكم.
 */
const ADMIN_PATHS = [
  "/admin/dashboard",
  "/admin/products",
  "/admin/products/:id",
  "/admin/categories",
  "/admin/inventory",
  "/admin/content",
  "/admin/whatsapp",
  "/admin/quality",
  "/admin/reports",
  "/admin/customers",
  "/admin/users",
  "/admin/audit-log",
  "/admin/settings",
  "/admin/product-intake",
  "/admin/vip-operations",
  // مسارات محفوظة من نسخة اللوحة السابقة (تُعاد توجيهها داخل AdminApp).
  "/admin/reviews",
  "/admin/search",
  "/admin/leads",
  "/admin/vip",
  "/admin/staff",
  "/admin/activity",
  "/admin/diagnostics",
];

const ACCOUNT_PATHS = [
  "/account",
  "/account/login",
  "/account/profile",
  "/account/addresses",
  "/account/wishlist",
  "/account/vip",
  "/account/settings",
];

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Storefront} />
      <Route path={"/products"} component={ProductsPage} />
      <Route path={"/popup/videos"} component={PopupVideos} />
      <Route path={"/popup"} component={PopUp} />
      <Route path={"/rewards"} component={Rewards} />
      <Route path={"/vip"} component={VipProgram} />
      <Route path={"/vip/terms"} component={VipTerms} />
      <Route path={"/vip/privacy"} component={VipPrivacy} />
      <Route path={"/vip/staff-register"} component={VipStaffRegistration} />
      <Route path={"/vip/qr-test"} component={VipQrTest} />

      {ACCOUNT_PATHS.map(path => (
        <Route key={path} path={path} component={AccountApp} />
      ))}

      <Route path={"/admin"} component={AdminAccess} />
      {ADMIN_PATHS.map(path => (
        <Route key={path} path={path} component={AdminAccess} />
      ))}
      {/* المساران التشغيليان الإلزاميان بعقود صريحة (يطلبها integration-audit). */}
      <Route path={"/admin/product-intake"} component={AdminAccess} />
      <Route path={"/admin/vip-operations"} component={AdminAccess} />

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SkipLink />
      <Suspense
        fallback={
          <div
            className="min-h-screen bg-brand-cream px-4 py-6 sm:px-6"
            role="status"
            aria-live="polite"
            aria-label="جاري تحميل الصفحة"
          >
            <div className="container animate-pulse space-y-5 motion-reduce:animate-none">
              <div className="h-16 rounded-2xl border border-brand-border bg-white" />
              <div className="h-52 rounded-3xl bg-brand-sky sm:h-64" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="aspect-[4/5] rounded-2xl border border-brand-border bg-white" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <Router />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
