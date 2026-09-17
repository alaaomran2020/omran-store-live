// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminApp from "./AdminApp";

vi.mock("@/pages/ProductIntake", () => ({
  default: () => <h1>Product Intake Test Page</h1>,
}));

vi.mock("@/lib/admin/adminGateway", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/admin/adminGateway")>();
  return {
    ...actual,
    readEmployees: vi.fn(async () => ({
      status: "live" as const,
      data: [
        {
          employeeId: "viewer-1",
          fullName: "Viewer User",
          accessEmail: "viewer@example.com",
          role: "VIEWER",
          status: "ACTIVE",
        },
        {
          employeeId: "catalog-1",
          fullName: "Catalog Manager",
          accessEmail: "catalog@example.com",
          role: "CATALOG_MANAGER",
          status: "ACTIVE",
        },
      ],
    })),
  };
});

function mount(email: string) {
  window.history.replaceState({}, "", "/admin/product-intake");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminApp identity={{ email }} />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("Admin Product Intake RBAC", () => {
  it("blocks an ACTIVE VIEWER without product:create", async () => {
    mount("viewer@example.com");

    expect(await screen.findByText("ليس لديك صلاحية لإضافة منتج")).toBeTruthy();
    expect(screen.queryByText("Product Intake Test Page")).toBeNull();
  });

  it("allows an ACTIVE role with product:create", async () => {
    mount("catalog@example.com");

    expect(await screen.findByText("Product Intake Test Page")).toBeTruthy();
    expect(screen.queryByText("ليس لديك صلاحية لإضافة منتج")).toBeNull();
  });
});
