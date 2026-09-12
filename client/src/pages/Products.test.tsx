// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Products from "@/pages/Products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "@/lib/publicProductsSnapshot";
import { POPUP_PRODUCTS_SNAPSHOT } from "@/lib/popupProductsSnapshot";
import { makeCatalogUrl } from "@/lib/makeGateway";

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
const initialVisibleCount = Math.min(24, PUBLIC_PRODUCTS_SNAPSHOT.length);

const liveHeaders = [
  "id", "name", "price", "category", "description", "image", "active", "sort_order",
  "product_prompt", "workflow_status", "qa_status", "source_drive_id", "processed_image",
  "review_reason", "sku", "age_min", "age_max", "brand", "tags", "availability",
];

const liveRow = (
  id: string,
  name: string,
  category: string,
  brand: string,
  tags: string,
  availability: string,
  ageMin: string,
  ageMax: string,
  sortOrder: string
) => [
  id, name, "", category, "وصف موثق", "", "TRUE", sortOrder, "", "PUBLISHED", "PASS", "", "", "", id,
  ageMin, ageMax, brand, tags, availability,
];

beforeEach(() => {
  window.history.replaceState({}, "", "/products");
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("catalog gateway unavailable"))));
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

  it("يعرض Snapshot المحلي إذا تعذر الكتالوج الحي", async () => {
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
    expect(fetch).toHaveBeenCalledWith(
      makeCatalogUrl(),
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
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
    expect(fetch).toHaveBeenCalledWith(
      makeCatalogUrl(),
      expect.objectContaining({ method: "GET" })
    );
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

  it("يدعم دمج البحث والفئة والفلتر المتقدم ثم يعيد كل الحالة عبر مسح الكل", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        values: [
          liveHeaders,
          liveRow("LIVE-A", "سيارة سباق", "سيارات", "Fun Toys", "سريع", "available", "3", "8", "1"),
          liveRow("LIVE-B", "عروسة حفلات", "عرايس", "Dolls", "ناعم", "preorder", "6", "10", "2"),
          liveRow("LIVE-C", "سيارة تعليمية", "سيارات", "Fun Toys", "سريع", "unavailable", "9", "12", "3"),
        ],
      }),
    })));
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: /تحكم عن بعد وروبوتات/ }));
    expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual(["LIVE-A", "LIVE-C"]);

    fireEvent.click(screen.getByRole("button", { name: "فتح الفلاتر الإضافية" }));
    fireEvent.change(screen.getByLabelText("الماركة"), { target: { value: "Fun Toys" } });
    fireEvent.change(screen.getByLabelText("التوفر"), { target: { value: "available" } });
    expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual(["LIVE-A"]);

    fireEvent.change(screen.getByTestId("product-search"), { target: { value: "سيارة" } });
    await waitFor(() => expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual(["LIVE-A"]));

    fireEvent.click(screen.getByRole("button", { name: "مسح الكل" }));
    await waitFor(() => expect(cards()).toHaveLength(3));
    expect((screen.getByTestId("product-search") as HTMLInputElement).value).toBe("");
    expect(window.location.search).toBe("");
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

    fireEvent.click(within(cards()[0]).getByRole("button", { name: "التفاصيل" }));
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
