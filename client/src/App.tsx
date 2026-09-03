import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Products from "@/pages/Products";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Keep customer-facing storefront code in the initial bundle. Administrative
// and internal settings code is fetched only when those routes are opened.
const AdminApp = lazy(() => import("@/admin/AdminApp"));
const SocialSettings = lazy(() => import("@/pages/SocialSettings"));

function RouteLoadingFallback() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#f7f3ec] px-6 text-center text-stone-700"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-bold">جارٍ تحميل الصفحة…</p>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path={"/"} component={Products} />
        <Route path={"/products"} component={Products} />
        <Route path={"/settings/social"} component={SocialSettings} />
        <Route path={"/admin"} component={AdminApp} />
        <Route path={"/admin/:rest*"} component={AdminApp} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
