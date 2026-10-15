// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomeProductShowcase from "./HomeProductShowcase";
import { getInitialProductsSnapshot } from "@/lib/productsClient";
import { filterProductsByCatalog } from "@/lib/productCatalog";
import { productImageCandidates } from "./ProductImage";
import { canonicalCategory } from "@shared/taxonomy";

function renderShowcase() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <HomeProductShowcase />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("catalog must remain local")))
  );
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("lightweight home catalog", () => {
  it("shows current catalog images latest first without a mismatched fixed promotional image", () => {
    renderShowcase();
    const expected = [
      ...filterProductsByCatalog(getInitialProductsSnapshot().products, "toys")
        .filter(product => canonicalCategory(product.category)?.id !== "ramadan-lanterns"),
    ]
      .sort((a, b) => b.rowIndex - a.rowIndex)
      .slice(0, 8);
    const cards = screen.getAllByTestId("product-card");
    expect(cards.map(card => card.dataset.productId)).toEqual(
      expected.map(product => product.id)
    );
    const image = within(cards[0]).getByRole("img", { name: expected[0].name });
    expect(image.getAttribute("src")).toBe(
      productImageCandidates(expected[0])[0]
    );
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(
      document.querySelector(
        'img[src="/products/processed/product-kids-digital-watch-featured.webp"]'
      )
    ).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads details when requested and keeps the direct WhatsApp inquiry working", async () => {
    renderShowcase();
    expect(screen.queryByRole("dialog")).toBeNull();
    const first = screen.getAllByTestId("product-card")[0];
    const whatsapp = within(first).getByRole("link", {
      name: "اسأل عن السعر",
    }) as HTMLAnchorElement;
    expect(whatsapp.href).toContain("https://wa.me/201000000000");
    const details = within(first).getByRole("link", { name: /التفاصيل/ });
    details.focus();
    fireEvent.click(details);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "إغلاق" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "إغلاق" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
