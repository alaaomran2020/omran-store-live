// @vitest-environment jsdom
/**
 * اختبارات حالة فهرسة روابط الكتالوج في صفحة Products الفعلية:
 * البحث/الفلتر = noindex,follow، منتج مفقود = noindex,follow (soft-404)،
 * منتج حقيقي = indexable مع JSON-LD.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Products from "@/pages/Products";
import { SeoMetadata } from "@/components/SeoMetadata";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "@/lib/publicProductsSnapshot";

const PRODUCTS_TITLE = "لعب أطفال | شركة عمران التجارية";
const PRODUCTS_DESCRIPTION =
  "اكتشف كتالوج لعب الأطفال من شركة عمران التجارية، وشاهد الصور والمواصفات وتواصل عبر واتساب.";

/** يحاكي بنية الصفحة الفعلية: SeoMetadata الصفحات + Products. */
function renderCatalog(catalog: "toys" | "popup" = "toys") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const basePath = catalog === "popup" ? "/popup" : "/products";
  return render(
    <QueryClientProvider client={queryClient}>
      <SeoMetadata path={basePath} title={PRODUCTS_TITLE} description={PRODUCTS_DESCRIPTION} />
      <Products catalog={catalog} />
    </QueryClientProvider>
  );
}

const meta = (name: string) =>
  document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;

beforeEach(() => {
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("catalog gateway unavailable"))));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  document.head.innerHTML = "";
});

describe("حالة فهرسة روابط الكتالوج", () => {
  it("رابط الكتالوج الصافي indexable", async () => {
    window.history.replaceState({}, "", "/products");
    renderCatalog();
    await waitFor(() => expect(screen.getAllByTestId("product-card").length).toBeGreaterThan(0));

    await waitFor(() => expect(meta("robots")).toBe("index,follow"));
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toBe("https://omrantoys.store/products");
  });

  it("حالة البحث noindex,follow (لا index bloat) مع بقاء الواجهة تعمل", async () => {
    window.history.replaceState({}, "", "/products?search=%D9%85%D8%B7%D8%A8%D8%AE");
    renderCatalog();
    await waitFor(() => expect(screen.getAllByTestId("product-card").length).toBeGreaterThan(0));

    await waitFor(() => expect(meta("robots")).toBe("noindex,follow"));
    // canonical يظل الرابط الصافي — لا canonical لكل نتيجة بحث.
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toBe("https://omrantoys.store/products");
  });

  it("حالة الفلتر + الفرز noindex,follow", async () => {
    window.history.replaceState({}, "", "/products?category=%D9%85%D8%B7%D8%A8%D8%AE&sort=name-asc");
    renderCatalog();
    await waitFor(() => expect(meta("robots")).toBe("noindex,follow"));
  });

  it("منتج غير موجود (?product=...) = noindex,follow ولا يفتح dialog (soft-404 آمن)", async () => {
    window.history.replaceState({}, "", "/products?product=DOES-NOT-EXIST");
    renderCatalog();
    await waitFor(() => expect(screen.getAllByTestId("product-card").length).toBeGreaterThan(0));

    await waitFor(() => expect(meta("robots")).toBe("noindex,follow"));
    expect(screen.queryByTestId("product-details")).toBeNull();
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toBe("https://omrantoys.store/products");
  });

  it("رابط منتج حقيقي يفتح الـdialog ويطبّق metadata وJSON-LD قابل للفهرسة", async () => {
    const first = PUBLIC_PRODUCTS_SNAPSHOT[0];
    window.history.replaceState({}, "", `/products?product=${encodeURIComponent(first.id)}`);
    renderCatalog();

    await waitFor(() => expect(screen.getByTestId("product-details")).toBeTruthy(), { timeout: 4000 });
    expect(meta("robots")).toBe("index,follow");
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toBe(`https://omrantoys.store/products?product=${encodeURIComponent(first.id)}`);

    const script = document.getElementById("omran-product-jsonld");
    expect(script).toBeTruthy();
    const parsed = JSON.parse((script as HTMLScriptElement).textContent ?? "{}") as Record<string, unknown>;
    const graph = parsed["@graph"] as Record<string, unknown>[];
    expect(graph.find(node => (node["@type"] as string) === "Product")?.name).toBe(first.name);
    expect(graph.some(node => (node["@type"] as string) === "Product" && "offers" in node)).toBe(false);
  });

  it("POP UP: رابط منتج popup على /products لا يُفهرس (alias) ولا يفتح في كتالوج toys", async () => {
    // منتج POP-BAL-US-100 موجود في كتالوج popup فقط.
    window.history.replaceState({}, "", "/products?product=POP-BAL-US-100");
    renderCatalog();
    await waitFor(() => expect(screen.getAllByTestId("product-card").length).toBeGreaterThan(0));

    await waitFor(() => expect(meta("robots")).toBe("noindex,follow"));
    expect(screen.queryByTestId("product-details")).toBeNull();
  });
});
