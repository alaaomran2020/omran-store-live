// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "@shared/rbac";
import AdminApp from "./AdminApp";

const state = vi.hoisted(() => ({ deniedPermission: null as string | null }));

vi.mock("@shared/rbac", async importOriginal => {
  const actual = await importOriginal<typeof import("@shared/rbac")>();
  return {
    ...actual,
    can: (principal: Parameters<typeof actual.can>[0], permission: Permission) =>
      permission === state.deniedPermission ? false : actual.can(principal, permission),
  };
});

vi.mock("@/lib/admin/adminGateway", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/admin/adminGateway")>();
  return {
    ...actual,
    readEmployees: vi.fn(async () => ({
      status: "live" as const,
      data: [
        {
          employeeId: "owner-1",
          fullName: "Owner User",
          accessEmail: "owner@example.com",
          role: "OWNER",
          status: "ACTIVE",
        },
      ],
    })),
  };
});

function mount(path: string, deniedPermission: Permission) {
  state.deniedPermission = deniedPermission;
  window.history.replaceState({}, "", path);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminApp identity={{ email: "owner@example.com" }} />
    </QueryClientProvider>
  );
}

const blockedTitle = "\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u0635\u0644\u0627\u062d\u064a\u0629 \u0644\u0641\u062a\u062d \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629";

const protectedRoutes: Array<[string, Permission]> = [
  ["/admin", "dashboard:view"],
  ["/admin/dashboard", "dashboard:view"],
  ["/admin/products", "product:view"],
  ["/admin/products/test-product", "product:view"],
  ["/admin/categories", "category:view"],
  ["/admin/inventory", "inventory:view"],
  ["/admin/content", "content:view"],
  ["/admin/whatsapp", "whatsapp:view"],
  ["/admin/quality", "quality:view"],
  ["/admin/reports", "analytics:view"],
  ["/admin/customers", "customer:view"],
  ["/admin/users", "user:view"],
  ["/admin/audit-log", "audit:view"],
  ["/admin/settings", "settings:view"],
  ["/admin/product-intake", "product:create"],
  ["/admin/vip-operations", "dashboard:view"],
];

const legacyAliases: Array<[string, Permission]> = [
  ["/admin/reviews", "quality:view"],
  ["/admin/search", "product:view"],
  ["/admin/leads", "customer:view"],
  ["/admin/staff", "user:view"],
  ["/admin/activity", "audit:view"],
  ["/admin/diagnostics", "settings:view"],
  ["/admin/vip", "dashboard:view"],
];

afterEach(() => {
  cleanup();
  state.deniedPermission = null;
});

describe("Admin route RBAC guards", () => {
  it.each(protectedRoutes)("blocks %s when %s is denied", async (path, permission) => {
    mount(path, permission);
    expect(await screen.findByText(blockedTitle)).toBeTruthy();
  });

  it.each(legacyAliases)("keeps alias %s behind target permission %s", async (path, permission) => {
    mount(path, permission);
    expect(await screen.findByText(blockedTitle)).toBeTruthy();
  });
});
