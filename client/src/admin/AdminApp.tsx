/**
 * تطبيق لوحة الإدارة — راوتر متداخل تحت /admin مع هيكل مشترك وحماية هوية.
 *
 * المصادقة تُحسم على الحافة (Cloudflare Access) قبل وصول هذه المكوّنات،
 * وتمرير الهوية يأتي من AdminAccess. الأدوات التشغيلية القديمة (إدخال منتج /
 * عمليات VIP) تبقى تعمل بصفحاتها الأصلية الكاملة بلا هيكل جديد.
 */
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Redirect, Route, Router, Switch, useRoute } from "wouter";
import { SeoMetadata } from "@/components/SeoMetadata";
import { LogOut, ShieldAlert } from "lucide-react";
import {
  AdminIdentityProvider,
  useAdminIdentity,
  type CloudflareIdentity,
} from "./AdminIdentity";
import {
  PERMISSION_LABELS_AR,
  ROLE_LABELS_AR,
  type Permission,
} from "@shared/rbac";
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

function PermissionBlocked({ permission, path }: { permission: Permission; path: string }) {
  const { resolved } = useAdminIdentity();

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-brand-cream px-4">
      <SeoMetadata
        path={`/admin${path === "/" ? "" : path}`}
        title="صلاحية مطلوبة | لوحة إدارة عمران تويز"
        description={`هذه الصفحة تتطلب صلاحية: ${PERMISSION_LABELS_AR[permission]}.`}
        robots="noindex,nofollow"
      />
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldAlert size={26} aria-hidden="true" />
        </span>
        <h1 className="text-lg font-black text-brand-ink">ليس لديك صلاحية لفتح هذه الصفحة</h1>
        <p className="mt-2 text-sm leading-7 text-brand-muted">
          الصلاحية المطلوبة: {PERMISSION_LABELS_AR[permission]}.
        </p>
        <p className="mt-4 rounded-xl bg-brand-cream px-3 py-2 text-xs font-bold text-brand-navy">
          {resolved.fullName} — {ROLE_LABELS_AR[resolved.role]}
        </p>
        <a
          href="/admin/dashboard"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-border bg-white px-5 text-sm font-extrabold text-brand-blue hover:border-brand-blue hover:bg-brand-sky"
        >
          الرجوع للوحة التحكم
        </a>
      </div>
    </div>
  );
}

function RoutePermissionGuard({
  permission,
  path,
  children,
}: {
  permission: Permission;
  path: string;
  children: ReactNode;
}) {
  const { can } = useAdminIdentity();
  return can(permission) ? children : <PermissionBlocked permission={permission} path={path} />;
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
      <Route path="/product-intake">
        <RoutePermissionGuard permission="product:create" path="/product-intake">
          <ProductIntake />
        </RoutePermissionGuard>
      </Route>
      <Route path="/vip-operations">
        <RoutePermissionGuard permission="dashboard:view" path="/vip-operations">
          <VipOperations />
        </RoutePermissionGuard>
      </Route>

      <Route path="/">
        <RoutePermissionGuard permission="dashboard:view" path="/">
          {lazyPage(DashboardPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/dashboard">
        <RoutePermissionGuard permission="dashboard:view" path="/dashboard">
          {lazyPage(DashboardPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/products/:id">
        <RoutePermissionGuard permission="product:view" path="/products/:id">
          {lazyPage(ProductEditorPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/products">
        <RoutePermissionGuard permission="product:view" path="/products">
          {lazyPage(ProductsPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/categories">
        <RoutePermissionGuard permission="category:view" path="/categories">
          {lazyPage(CategoriesPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/inventory">
        <RoutePermissionGuard permission="inventory:view" path="/inventory">
          {lazyPage(InventoryPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/content">
        <RoutePermissionGuard permission="content:view" path="/content">
          {lazyPage(ContentPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/whatsapp">
        <RoutePermissionGuard permission="whatsapp:view" path="/whatsapp">
          {lazyPage(WhatsAppPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/quality">
        <RoutePermissionGuard permission="quality:view" path="/quality">
          {lazyPage(QualityPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/reports">
        <RoutePermissionGuard permission="analytics:view" path="/reports">
          {lazyPage(ReportsPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/customers">
        <RoutePermissionGuard permission="customer:view" path="/customers">
          {lazyPage(CustomersPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/users">
        <RoutePermissionGuard permission="user:view" path="/users">
          {lazyPage(UsersPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/audit-log">
        <RoutePermissionGuard permission="audit:view" path="/audit-log">
          {lazyPage(AuditLogPage)}
        </RoutePermissionGuard>
      </Route>
      <Route path="/settings">
        <RoutePermissionGuard permission="settings:view" path="/settings">
          {lazyPage(SettingsPage)}
        </RoutePermissionGuard>
      </Route>

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
