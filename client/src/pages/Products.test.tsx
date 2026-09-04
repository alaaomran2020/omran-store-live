// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Products from "@/pages/Products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "@/lib/publicProductsSnapshot";

function renderCatalog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Products />
    </QueryClientProvider>
  );
}

const cards = () => screen.getAllByTestId("product-card");

beforeEach(() => {
  window.history.replaceState({}, "", "/products");
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
  vi.stubGlobal("fetch", vi.fn(() => {
    throw new Error("Static catalog must not use fetch");
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("كتالوج المنتجات الثابت", () => {
  it("يعرض كل منتجات الـSnapshot المحلي دون شبكة", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(PUBLIC_PRODUCTS_SNAPSHOT.length));
    expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual(
      PUBLIC_PRODUCTS_SNAPSHOT.map(product => product.id)
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("يبحث ويفلتر داخل البيانات المحلية", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(PUBLIC_PRODUCTS_SNAPSHOT.length));

    const target = PUBLIC_PRODUCTS_SNAPSHOT[0];
    fireEvent.change(screen.getByTestId("product-search"), {
      target: { value: target.name },
    });
    await waitFor(() => expect(screen.getByText(target.name)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: target.category }));
    expect(cards().every(card => {
      const id = card.getAttribute("data-product-id");
      return PUBLIC_PRODUCTS_SNAPSHOT.find(product => product.id === id)?.category === target.category;
    })).toBe(true);
  });

  it("يفتح تفاصيل المنتج من رابط ثابت", async () => {
    const target = PUBLIC_PRODUCTS_SNAPSHOT[0];
    window.history.replaceState({}, "", `/products?product=${encodeURIComponent(target.id)}`);
    renderCatalog();

    const dialog = await screen.findByTestId("product-details");
    expect(within(dialog).getByText(target.name)).toBeTruthy();
  });

  it("يبني رابط واتساب للمنتج دون إرسال Lead إلى خادم", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(PUBLIC_PRODUCTS_SNAPSHOT.length));

    const links = screen.getAllByRole("link", { name: /اطلب عبر واتساب/ }) as HTMLAnchorElement[];
    expect(links[0].href).toContain("wa.me/201000000000");
    expect(decodeURIComponent(links[0].href)).toContain(PUBLIC_PRODUCTS_SNAPSHOT[0].name);
    expect(fetch).not.toHaveBeenCalled();
  });
});
