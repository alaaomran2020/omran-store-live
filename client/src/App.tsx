import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartDrawer } from "@/components/CartDrawer";
import { SavedProductsPanel } from "@/components/SavedProductsPanel";
import AdminAccess from "@/admin/AdminAccess";
import NotFound from "@/pages/NotFound";
import PopUp from "@/pages/PopUp";
import ProductsPage from "@/pages/ProductsPage";
import Storefront from "@/pages/Storefront";
import Videos from "@/pages/Videos";
import Rewards from "@/pages/Rewards";
import VipProgram from "@/pages/VipProgram";
import VipQrTest from "@/pages/VipQrTest";
import VipStaffRegistration from "@/pages/VipStaffRegistration";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Storefront} />
      <Route path={"/products"} component={ProductsPage} />
      <Route path={"/popup"} component={PopUp} />
      <Route path={"/videos"} component={Videos} />
      <Route path={"/rewards"} component={Rewards} />
      <Route path={"/vip"} component={VipProgram} />
      <Route path={"/vip/staff-register"} component={VipStaffRegistration} />
      <Route path={"/vip/qr-test"} component={VipQrTest} />
      <Route path={"/admin"} component={AdminAccess} />
      <Route path={"/admin/product-intake"} component={AdminAccess} />
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
          <Router />
          <CartDrawer />
          <SavedProductsPanel />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
