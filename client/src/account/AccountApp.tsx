/**
 * راوتر منطقة العميل تحت /account — نطاق هوية CUSTOMER منفصل تمامًا عن
 * /admin (لا يشارك التفويض إطلاقًا). الجلسات شطائر منفصلة ومسار موثوق.
 */
import { Suspense, lazy } from "react";
import { Redirect, Route, Router, Switch } from "wouter";
import { LoadingState } from "@/admin/components/primitives";
import { AccountSessionProvider } from "./AccountSession";
import AccountLayout from "./AccountLayout";
import AccountLoginPage from "./AccountLoginPage";

const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AddressesPage = lazy(() => import("./pages/AddressesPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const AccountVipPage = lazy(() => import("./pages/AccountVipPage"));
const AccountSettingsPage = lazy(() => import("./pages/AccountSettingsPage"));

function Protected({ children }: { children: React.ReactNode }) {
  // الحارس الفعلي داخل AccountLayout (يقرأ الجلسة من نقطة الخادم).
  return <AccountLayout>{children}</AccountLayout>;
}

export default function AccountApp() {
  return (
    <AccountSessionProvider>
      <Router base="/account">
        <Suspense fallback={<div dir="rtl" className="grid min-h-screen place-items-center bg-brand-cream"><LoadingState /></div>}>
          <Switch>
            <Route path="/login">{<AccountLoginPage />}</Route>
            <Route path="/profile">{<Protected><ProfilePage /></Protected>}</Route>
            <Route path="/addresses">{<Protected><AddressesPage /></Protected>}</Route>
            <Route path="/wishlist">{<Protected><WishlistPage /></Protected>}</Route>
            <Route path="/vip">{<Protected><AccountVipPage /></Protected>}</Route>
            <Route path="/settings">{<Protected><AccountSettingsPage /></Protected>}</Route>
            <Route>
              <Redirect to="/profile" />
            </Route>
          </Switch>
        </Suspense>
      </Router>
    </AccountSessionProvider>
  );
}
