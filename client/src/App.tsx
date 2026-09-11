import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const AdminAccess = lazy(() => import("@/admin/AdminAccess"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PopUp = lazy(() => import("@/pages/PopUp"));
const PopupVideos = lazy(() => import("@/pages/PopupVideos"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const Storefront = lazy(() => import("@/pages/Storefront"));
const Videos = lazy(() => import("@/pages/Videos"));
const Rewards = lazy(() => import("@/pages/Rewards"));
const VipProgram = lazy(() => import("@/pages/VipProgram"));
const VipPrivacy = lazy(() => import("@/pages/VipPrivacy"));
const VipQrTest = lazy(() => import("@/pages/VipQrTest"));
const VipStaffRegistration = lazy(() => import("@/pages/VipStaffRegistration"));
const VipTerms = lazy(() => import("@/pages/VipTerms"));

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Storefront} />
      <Route path={"/products"} component={ProductsPage} />
      <Route path={"/popup/videos"} component={PopupVideos} />
      <Route path={"/popup"} component={PopUp} />
      <Route path={"/videos"} component={Videos} />
      <Route path={"/rewards"} component={Rewards} />
      <Route path={"/vip"} component={VipProgram} />
      <Route path={"/vip/terms"} component={VipTerms} />
      <Route path={"/vip/privacy"} component={VipPrivacy} />
      <Route path={"/vip/staff-register"} component={VipStaffRegistration} />
      <Route path={"/vip/qr-test"} component={VipQrTest} />
      <Route path={"/admin"} component={AdminAccess} />
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<div className="min-h-screen bg-brand-cream" aria-label="جاري تحميل الصفحة" />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
