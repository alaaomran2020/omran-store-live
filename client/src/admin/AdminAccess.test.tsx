// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminAccess from "./AdminAccess";

vi.mock("./pages/MyWorkspacePage", () => ({
  default: () => <h2>مساحتي التجريبية</h2>,
}));

function mount(path: string) {
  window.history.replaceState({}, "", path);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminAccess />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AdminAccess", () => {
  it("لا يعرض أي بيانات إدارية قبل اكتمال التحقق", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>(() => undefined)
    );
    mount("/admin/dashboard");
    expect(
      screen.getByText("جاري التحقق من جلسة Cloudflare Access...")
    ).toBeTruthy();
    expect(screen.queryByText("مساحتي التجريبية")).toBeNull();
  });

  it("يرفض الوصول المباشر عند غياب جلسة Access", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 403 })
    );
    mount("/admin/products");
    expect(await screen.findByText(/تم رفض الوصول افتراضيًا/)).toBeTruthy();
    expect(screen.queryByText("كل المنتجات")).toBeNull();
  });

  it("يفتح المساحة الشخصية لهوية موظف معتمدة بعد التحقق", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url === "/cdn-cgi/access/get-identity") {
        return new Response(JSON.stringify({ email: "admin@example.com" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === "/api/admin/me") {
        return new Response(JSON.stringify({ employee: {
          employee_id: "test-owner", full_name: "Test Owner",
          access_email: "admin@example.com", role: "OWNER", status: "ACTIVE",
          created_at: "2026-10-24T00:00:00Z",
        } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`Unexpected fetch in AdminAccess test: ${url}`);
    });
    mount("/admin");
    expect(await screen.findByText("مساحتي التجريبية")).toBeTruthy();
    await waitFor(() =>
      expect(window.location.pathname).toBe("/admin/me")
    );
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute("content")
    ).toBe("noindex,nofollow");
  });
});
