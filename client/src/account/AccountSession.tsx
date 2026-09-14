/**
 * سياق جلسة العميل — تُقرأ فقط من نقطة النهاية Same-origin التي تُرجع
 * هوية الجلسة المقترنة بشطيرة HttpOnly (نظير get-identity للموظفين).
 * لا توكنات في المتصفح ولا أدوار موثوقة من العميل.
 */
import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCustomerSession,
  logout as serverLogout,
} from "@/lib/auth/authClient";
import type { CustomerSessionResult } from "@shared/identity";

type AccountSessionContextValue = {
  session: CustomerSessionResult | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
};

const AccountSessionContext = createContext<AccountSessionContextValue | null>(null);

export function AccountSessionProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ["account", "session"],
    queryFn: ({ signal }) => fetchCustomerSession(signal),
    staleTime: 60_000,
    retry: false,
  });
  const queryClient = useQueryClient();

  const session = query.data ?? null;

  const logout = async () => {
    await serverLogout("CUSTOMER");
    await queryClient.invalidateQueries({ queryKey: ["account", "session"] });
  };

  return (
    <AccountSessionContext.Provider
      value={{
        session,
        isLoading: query.isLoading,
        isAuthenticated: session?.authenticated === true,
        refresh: () => queryClient.invalidateQueries({ queryKey: ["account", "session"] }),
        logout,
      }}
    >
      {children}
    </AccountSessionContext.Provider>
  );
}

export function useAccountSession(): AccountSessionContextValue {
  const context = useContext(AccountSessionContext);
  if (!context) throw new Error("useAccountSession must be used inside AccountSessionProvider");
  return context;
}
