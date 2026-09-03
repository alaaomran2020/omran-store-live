// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Products from "@/pages/Products";
import { PUBLIC_PRODUCTS_SNAPSHOT } from "@/lib/publicProductsSnapshot";
import { parseProductsCsv } from "@shared/products";

/**
 * اختبار الواجهة الحقيقي لكتالوج Google Sheets: نمرر نص CSV كما يرده الشيت
 * المنشور، ثم نتحقق من كل بنود قائمة الاختبار (العرض، الصور، الأسعار،
 * التصنيفات، البحث، الفلاتر، التفاصيل، واتساب، المنتجات المخفية، بلا صورة).
 */

const CSV = [
  "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status",
  "001,سيارة أطفال سباق,250,سيارات,سيارة بتصميم رياضي,https://drive.google.com/file/d/1CarFileId12345/view?usp=sharing,TRUE,1,PROMPT,PUBLISHED,PASS",
  "002,دباب كهربائي,1750,مركبات كهربائية,دباب ببطارية قابلة للشحن,https://cdn.example.com/bike.jpg,TRUE,2,PROMPT,PUBLISHED,PASS",
  "003,مكعبات تعليمية,180,ألعاب تعليمية,مكعبات ملونة,,TRUE,3,PROMPT,PUBLISHED,PASS",
  "004,عروسة قماش مخفية,320,عرائس,يجب ألا تظهر,https://cdn.example.com/doll.jpg,FALSE,4,PROMPT,PUBLISHED,PASS",
  "005,طقم مطبخ,اتصل بنا,ألعاب تقليدية,سعر غير صالح,https://cdn.example.com/kitchen.jpg,TRUE,,PROMPT,PUBLISHED,PASS",
  "006,صف قديم بلا دليل نشر,70,أخرى,صف legacy يجب ألا يظهر,,TRUE,5,PROMPT,,",
].join("\n");

const payload = {
  products: parseProductsCsv(CSV),
  status: "ok" as const,
  fetchedAt: new Date().toISOString(),
};

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
  window.history.replaceState({}, "", "/");
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/products")) {
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("{}", { status: 404 });
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("كتالوج المنتجات (من Google Sheets)", () => {
  it("يعرض المنتجات النشطة فقط وبترتيب sort_order", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(4));

    expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual([
      "001",
      "002",
      "003",
      "005",
    ]);
    expect(screen.queryByText("عروسة قماش مخفية")).toBeNull();
    expect(screen.getByTestId("product-count").textContent).toContain("4 من 4");
  });

  it("يعرض الأسعار، ويستبدل السعر غير الصالح بنص محترم", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(4));

    expect(screen.getByText("250 ج.م")).toBeTruthy();
    expect(screen.getByText("1,750 ج.م")).toBeTruthy();
    expect(screen.getByText("للاستفسار والكميات")).toBeTruthy();
  });

  it("يحوّل صور Google Drive ويعرض بديلًا للمنتج بلا صورة", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(4));

    const driveImage = screen.getByAltText("سيارة أطفال سباق") as HTMLImageElement;
    expect(driveImage.src).toBe(
      "https://drive.google.com/thumbnail?id=1CarFileId12345&sz=w1000"
    );
    expect((screen.getByAltText("دباب كهربائي") as HTMLImageElement).src).toBe(
      "https://cdn.example.com/bike.jpg"
    );
    expect(screen.queryByAltText("مكعبات تعليمية")).toBeNull();
    expect(screen.getByLabelText("لا توجد صورة للمنتج مكعبات تعليمية")).toBeTruthy();
  });

  it("يبني رقائق التصنيفات ويفلتر بها", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(4));

    const chips = screen.getAllByTestId("category-chip").map(chip => chip.textContent);
    expect(chips).toEqual(["الكل", "سيارات", "مركبات كهربائية", "ألعاب تعليمية", "ألعاب تقليدية"]);

    fireEvent.click(screen.getByRole("button", { name: "سيارات" }));
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(cards()[0].getAttribute("data-product-id")).toBe("001");

    fireEvent.click(screen.getByRole("button", { name: "الكل" }));
    await waitFor(() => expect(cards()).toHaveLength(4));
  });

  it("يبحث في الاسم والوصف ويعرض حالة لا نتائج قابلة للمسح", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(4));

    const search = screen.getByTestId("product-search");
    fireEvent.change(search, { target: { value: "دباب" } });
    await waitFor(() => expect(cards()).toHaveLength(1));

    fireEvent.change(search, { target: { value: "منتج غير موجود" } });
    await waitFor(() => expect(screen.getByText("لا توجد نتائج مطابقة لبحثك")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "مسح البحث والفلاتر" }));
    await waitFor(() => expect(cards()).toHaveLength(4));
  });

  it("يفتح تفاصيل المنتج ويحدّث الرابط ليكون قابلًا للمشاركة", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(4));

    fireEvent.click(screen.getAllByRole("button", { name: "تفاصيل المنتج" })[0]);
    const dialog = await screen.findByTestId("product-details");
    expect(within(dialog).getByText("سيارة أطفال سباق")).toBeTruthy();
    expect(within(dialog).getByText("250 ج.م")).toBeTruthy();
    expect(window.location.search).toBe("?product=001");

    fireEvent.click(screen.getByLabelText("إغلاق"));
    await waitFor(() => expect(screen.queryByTestId("product-details")).toBeNull());
    expect(window.location.search).toBe("");
  });

  it("يفتح تفاصيل المنتج مباشرة من رابط ?product=", async () => {
    window.history.replaceState({}, "", "/?product=003");
    renderCatalog();
    const dialog = await screen.findByTestId("product-details");
    expect(within(dialog).getByText("مكعبات تعليمية")).toBeTruthy();
  });

  it("زر واتساب يستخدم اسم المنتج من الشيت", async () => {
    renderCatalog();
    await waitFor(() => expect(cards()).toHaveLength(4));

    const links = screen.getAllByRole("link", { name: /اطلب عبر واتساب/ }) as HTMLAnchorElement[];
    const text = decodeURIComponent(new URL(links[0].href).searchParams.get("text")!);
    expect(text).toContain("مرحبًا، أريد الاستفسار عن هذا المنتج من عمران تويز.");
    expect(text).toContain("المنتج: سيارة أطفال سباق");
    expect(text).toContain("كود المنتج: 001");
    expect(text).toContain("التصنيف: سيارات");
    expect(text).toContain("السعر: 250 ج.م");
    expect(text).toContain("رابط المنتج:");
    expect(links[0].href).toContain("wa.me/201000000000");
    expect(links[0].href).toContain("text=");
  });

  it("يعرض آخر كتالوج موثّق إذا تعطلت كل مصادر الشبكة", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    renderCatalog();

    await waitFor(() => expect(cards()).toHaveLength(PUBLIC_PRODUCTS_SNAPSHOT.length));
    expect(cards().map(card => card.getAttribute("data-product-id"))).toEqual(
      PUBLIC_PRODUCTS_SNAPSHOT.map(product => product.id)
    );
    expect(screen.queryByText(/network down/)).toBeNull();
    expect(screen.queryByText("المتجر قيد التجهيز — المنتجات قادمة قريبًا")).toBeNull();
  });
});
