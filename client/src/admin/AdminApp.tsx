/**
 * تطبيق لوحة الإدارة — راوتر متداخل تحت /admin مع هيكل مشترك وحماية هوية.
 *
 * المصادقة تُحسم على الحافة (Cloudflare Access) قبل وصول هذه المكوّنات،
 * وتمرير الهوية يأتي من AdminAccess. الأدوات التشغيلية القديمة (إدخال منتج /
 * عمليات VIP) تبقى تعمل بصفحاتها الأصلية الكاملة بلا هيكل جديد.
 */
import { lazy, Suspense, type ComponentType } from "react";
import { Redirect, Route, Router, Switch, useRoute } from "wouter";
import { SeoMetadata } from "@/components/SeoMetadata";
import { LogOut, ShieldAlert } from "lucide-react";
import {
  AdminIdentityProvider,
  useAdminIdentity,
  type CloudflareIdentity,
} from "./AdminIdentity";
import { ROLE_LABELS_AR } from "@shared/rbac";
import { LoadingState } from "./components/primitives";
import ProductIntake from "@/pages/ProductIntake";
import VipOperations from "@/pages/VipOperations";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductEditorPage = lazy(() => import("./pages/ProductEditorPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const ContentPage = lazy(() => import("./pages/ContentPage"));
const WhatsAppPage = lazy(() => import("./pages/WhatsAppPage"));
const QualityPage = lazy(() => import("./pages/QualityPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const LOGOUT_URL = "/cdn-cgi/access/logout";

function AccessBlocked({ reason }: { reason: "SUSPENDED" | "DISABLED" | "INVITED" }) {
  const { resolved } = useAdminIdentity();
  const copy = {
    SUSPENDED: {
      title: "حسابك موقوف مؤقتًا",
      body: "تم تعليق صلاحيات الدخول للوحة الإدارة. تواصل مع المالك أو المدير لإعادة التفعيل.",
    },
    DISABLED: {
      title: "الحساب معطّل",
      body: "تم تعطيل هذا الحساب. لا يمكن تنفيذ أي إجراء إداري.",
    },
    INVITED: {
      title: "بانتظار تفعيل الحساب",
      body: "وصلت عبر Cloudflare Access لكن حسابك الموظفي ما زال في حالة دعوة/غير مفعّل في دليل الموظفين.",
    },
  }[reason];

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-brand-cream px-4">
      <SeoMetadata
        path="/admin"
        title="الوصول مقيد | لوحة إدارة عمران تويز"
        description="حساب موظف مقيد أو غير مفعّل."
        robots="noindex,nofollow"
      />
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-brand-red">
          <ShieldAlert size={26} aria-hidden="true" />
        </span>
        <h1 className="text-lg font-black text-brand-ink">{copy.title}</h1>
        <p className="mt-2 text-sm leading-7 text-brand-muted">{copy.body}</p>
        <p className="mt-4 rounded-xl bg-brand-cream px-3 py-2 text-xs font-bold text-brand-navy">
          {resolved.fullName} — {ROLE_LABELS_AR[resolved.role]}
        </p>
        <a
          href={LOGOUT_URL}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-extrabold text-white hover:bg-brand-blue-hover"
        >
          <LogOut size={16} /> تسجيل الخروج
        </a>
      </div>
    </div>
  );
}

function lazyPage(Component: ComponentType) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Component />
    </Suspense>
  );
}

function AdminRoutes() {
  const { resolved } = useAdminIdentity();

  if (resolved.status !== "ACTIVE") {
    return <AccessBlocked reason={resolved.status === "SUSPENDED" ? "SUSPENDED" : resolved.status === "DISABLED" ? "DISABLED" : "INVITED"} />;
  }

  return (
    <Switch>
      {/* أدوات قديمة بملء الشاشة بهويتها الأصلية */}
      <Route path="/product-intake">{<ProductIntake />}</Route>
      <Route path="/vip-operations">{<VipOperations />}</Route>

      <Route path="/">{lazyPage(DashboardPage)}</Route>
      <Route path="/dashboard">{lazyPage(DashboardPage)}</Route>
      <Route path="/products">{lazyPage(ProductsPage)}</Route>
      <Route path="/products/:id">{lazyPage(ProductEditorPage)}</Route>
      <Route path="/categories">{lazyPage(CategoriesPage)}</Route>
      <Route path="/inventory">{lazyPage(InventoryPage)}</Route>
      <Route path="/content">{lazyPage(ContentPage)}</Route>
      <Route path="/whatsapp">{lazyPage(WhatsAppPage)}</Route>
      <Route path="/quality">{lazyPage(QualityPage)}</Route>
      <Route path="/reports">{lazyPage(ReportsPage)}</Route>
      <Route path="/customers">{lazyPage(CustomersPage)}</Route>
      <Route path="/users">{lazyPage(UsersPage)}</Route>
      <Route path="/audit-log">{lazyPage(AuditLogPage)}</Route>
      <Route path="/settings">{lazyPage(SettingsPage)}</Route>

      {/* روابط النسخة المبسطة السابقة تُعاد توجيهها للصفحات الكاملة. */}
      <Route path="/reviews">
        <Redirect to="/quality" />
      </Route>
      <Route path="/search">
        <Redirect to="/products" />
      </Route>
      <Route path="/leads">
        <Redirect to="/customers" />
      </Route>
      <Route path="/staff">
        <Redirect to="/users" />
      </Route>
      <Route path="/activity">
        <Redirect to="/audit-log" />
      </Route>
      <Route path="/diagnostics">
        <Redirect to="/settings" />
      </Route>
      <Route path="/vip">
        <Redirect to="/vip-operations" />
      </Route>
      <Route>
        <Redirect to="/dashboard" />
      </Route>
    </Switch>
  );
}

export default function AdminApp({ identity }: { identity: CloudflareIdentity }) {
  return (
    <Router base="/admin">
      <AdminIdentityProvider identity={identity}>
        <AdminRoutes />
      </AdminIdentityProvider>
    </Router>
  );
}

/** خطّاف مساعدة للصفحات المتداخلة. */
export function useAdminRoute(pattern: string) {
  return useRoute(pattern);
}
