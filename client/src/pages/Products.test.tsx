// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Products from "@/pages/Products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "@/lib/publicProductsSnapshot";
import { POPUP_PRODUCTS_SNAPSHOT } from "@/lib/popupProductsSnapshot";

function renderCatalog(catalog: "toys" | "popup" = "toys") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Products catalog={catalog} />
    </QueryClientProvider>
  );
}

const cards = () => screen.getAllByTestId("product-card");

/**
 * نداءات الشبكة الوحيدة المسموح بها من صفحة الكتالوج هي بصمات القياس
 * (POST إلى بوابة العمليات). أي نداء قراءة كتالوج (GET أو `action=catalog`)
 * يعني عودة اعتماد خارجي على مصدر منتجات حي.
 */
const catalogNetworkCalls = () =>
  (fetch as unknown as { mock: { calls: [string, { method?: string }?][] } }).mock.calls.filter(
    ([url, init]) =>
      String(url).includes("catalog") || (init?.method ?? "GET").toUpperCase() === "GET"
  );
const initialVisibleCount = Math.min(24, PUBLIC_PRODUCTS_SNAPSHOT.length);

beforeEach(() => {
  window.history.replaceState({}, "", "/products");
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
  // أي نداء شبكة أثناء عرض الكتالوج يعتبر فشلًا معماريًا: الكتالوج مُجمَّع داخل الحزمة.
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network is allowed for the catalog"))));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("كتالوج المنتجات مع fallback محلي", () => {
  it("يعرض landmark واحد باسم main-content يطابق هدف رابط التخطي", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));

    const mains = document.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].getAttribute("id")).toBe("main-content");
    expect(screen.getByRole("main")).toBe(mains[0]);
  });

  it("يعرض الكتالوج المعتمد من المستودع دون أي نداء شبكة", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("contentinfo")).toBeNull();
    expect(screen.queryByRole("heading", { name: "شوف اللعبة وهي بتشتغل قبل الاستفسار" })).toBeNull();
    expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual(
      PUBLIC_PRODUCTS_SNAPSHOT.slice(0, initialVisibleCount).map(product => product.id)
    );
    expect(within(cards()[0]).getByText("اسأل عن التوفر")).toBeTruthy();
    expect(within(cards()[0]).getByRole("link", { name: "للاستفسار والكميات" })).toBeTruthy();
    expect(catalogNetworkCalls()).toEqual([]);
  });

  it("يبحث ويفلتر داخل البيانات المتاحة", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));

    const target = PUBLIC_PRODUCTS_SNAPSHOT[0];
    fireEvent.change(screen.getByTestId("product-search"), {
      target: { value: target.name },
    });
    await waitFor(() => expect(screen.getByText(target.name)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: new RegExp(target.category) }));
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
    expect(within(dialog).getAllByText(target.name).length).toBeGreaterThan(0);
  });

  it("يبني رابط واتساب للاستفسار عن السعر والتوفر مع بقاء fallback الكتالوج مستقلًا", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));

    const links = screen.getAllByRole("link", { name: /للاستفسار والكميات|استفسر عن/ }) as HTMLAnchorElement[];
    expect(links[0].href).toContain("wa.me/201000000000");
    expect(decodeURIComponent(links[0].href)).toContain(PUBLIC_PRODUCTS_SNAPSHOT[0].name);
    expect(catalogNetworkCalls()).toEqual([]);
    expect(screen.queryByText(/طلبك|إضافة للسلة|أضف لطلبك|مقارنة المنتجات/)).toBeNull();
  });

  it("يرسم النتائج على دفعات بدل تحميل كل بطاقات الكتالوج دفعة واحدة", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));

    if (PUBLIC_PRODUCTS_SNAPSHOT.length > initialVisibleCount) {
      fireEvent.click(screen.getByRole("button", { name: "عرض منتجات أكتر" }));
      expect(cards()).toHaveLength(PUBLIC_PRODUCTS_SNAPSHOT.length);
    }
  });

  it("يدعم دمج البحث والفئة ثم يعيد كل الحالة عبر مسح الكل من الكتالوج المضمّن", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));

    const target = PUBLIC_PRODUCTS_SNAPSHOT[0];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(target.category) }));
    const filtered = cards().map(card => card.getAttribute("data-product-id"));
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(id =>
      PUBLIC_PRODUCTS_SNAPSHOT.find(product => product.id === id)?.category === target.category
    )).toBe(true);

    fireEvent.change(screen.getByTestId("product-search"), { target: { value: target.name } });
    await waitFor(() => expect(screen.getByText(target.name)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "مسح الكل" }));
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));
    expect((screen.getByTestId("product-search") as HTMLInputElement).value).toBe("");
    expect(window.location.search).toBe("");
    expect(catalogNetworkCalls()).toEqual([]);
  });

  it("يعزل كتالوج POP UP ويعيد الحالة بعد إزالة بحث لا ينتمي إليه", async () => {
    renderCatalog("popup");
    await waitFor(() => expect(cards()).toHaveLength(POPUP_PRODUCTS_SNAPSHOT.length));

    expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual(
      POPUP_PRODUCTS_SNAPSHOT.map(product => product.id)
    );
    expect(cards().every(card => card.getAttribute("data-catalog") === "popup")).toBe(true);
    expect(screen.queryByText("كتالوج لعب الأطفال")).toBeNull();

    fireEvent.change(screen.getByTestId("product-search"), { target: { value: "سيارة" } });
    await waitFor(() => expect(screen.getByText("لا توجد نتائج مطابقة لبحثك أو الفلاتر")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "مسح البحث والفلاتر" }));
    await waitFor(() => expect(cards()).toHaveLength(POPUP_PRODUCTS_SNAPSHOT.length));
    expect(cards().every(card => card.getAttribute("data-catalog") === "popup")).toBe(true);
  });

  it("يمسح search وsort من الحالة والرابط معًا", async () => {
    const target = PUBLIC_PRODUCTS_SNAPSHOT[0];
    window.history.replaceState({}, "", `/products?search=${encodeURIComponent(target.name)}&sort=name-desc`);
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(1));

    expect((screen.getByTestId("product-search") as HTMLInputElement).value).toBe(target.name);
    fireEvent.click(screen.getByRole("button", { name: "مسح الكل" }));

    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));
    expect((screen.getByTestId("product-search") as HTMLInputElement).value).toBe("");
    expect(window.location.search).toBe("");
  });

  it("يربط فتح المنتج بـback وforward بدل ترك Dialog عالقًا على حالة قديمة", async () => {
    const target = PUBLIC_PRODUCTS_SNAPSHOT[0];
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(initialVisibleCount));

    const detailsLink = within(cards()[0]).getByRole("link", { name: "التفاصيل" });
    expect(detailsLink.getAttribute("href")).toBe(`/products?product=${encodeURIComponent(target.id)}`);
    fireEvent.click(detailsLink);
    await waitFor(() => expect(screen.getByTestId("product-details")).toBeTruthy());
    expect(window.location.search).toContain(`product=${encodeURIComponent(target.id)}`);

    window.history.replaceState({}, "", "/products");
    fireEvent.popState(window);
    await waitFor(() => expect(screen.queryByTestId("product-details")).toBeNull());

    window.history.replaceState({}, "", `/products?product=${encodeURIComponent(target.id)}`);
    fireEvent.popState(window);
    await waitFor(() => expect(screen.getByTestId("product-details")).toBeTruthy());
  });
});
