// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminAccess from "./AdminAccess";

vi.mock("./pages/DashboardPage", () => ({
  default: () => <h2>نظرة عامة</h2>,
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
    expect(screen.queryByText("نظرة عامة")).toBeNull();
  });

  it("يرفض الوصول المباشر عند غياب جلسة Access", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 403 })
    );
    mount("/admin/products");
    expect(await screen.findByText(/تم رفض الوصول افتراضيًا/)).toBeTruthy();
    expect(screen.queryByText("كل المنتجات")).toBeNull();
  });

  it("يحوّل /admin إلى Dashboard بعد إثبات الهوية", async () => {
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
      throw new Error(`Unexpected fetch in AdminAccess test: ${url}`);
    });
    mount("/admin");
    expect(await screen.findByText("نظرة عامة")).toBeTruthy();
    await waitFor(() =>
      expect(window.location.pathname).toBe("/admin/dashboard")
    );
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute("content")
    ).toBe("noindex,nofollow");
  });
});
