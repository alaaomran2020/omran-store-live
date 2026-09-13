// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminAccess from "./AdminAccess";

vi.mock("@/lib/productsClient", () => ({
  fetchProducts: vi.fn(async () => ({
    products: [],
    status: "ok",
    fetchedAt: "2026-09-13T00:00:00.000Z",
  })),
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
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ email: "admin@example.com" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
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
