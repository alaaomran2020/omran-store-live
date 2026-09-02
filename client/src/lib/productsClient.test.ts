// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProducts } from "./productsClient";

/**
 * سلسلة المحاولات في productsClient:
 *   /api/products → /edge-api/products → رابط CSV المباشر.
 * هنا نتحقق من الترتيب: المسار الأساسي المسموم (route قديم بلا status)
 * يُرفض، فتنجح المرآة، ولا يُجرَّب رابط CSV أصلًا.
 */

type Route = {
  match: (url: string) => boolean;
  respond: () => { ok: boolean; status: number; json: () => Promise<unknown> };
};

function stubFetch(routes: Route[]) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url.split("?")[0]);
    const route = routes.find(r => r.match(url));
    if (!route) throw new Error(`unexpected fetch: ${url}`);
    return route.respond();
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("productsClient fallback chain", () => {
  it("يتخطى /api/products القديم (بلا status) ويحمل من المرآة", async () => {
    const calls = stubFetch([
      {
        // رد النظام القديم فعليًا على الإنتاج: products بلا status.
        match: url => url.includes("/api/products"),
        respond: () => ({
          ok: true,
          status: 200,
          json: async () => ({
            products: [
              {
                id: "1",
                name: "سيارة سباق بالريموت",
                price: 350,
                image_url: "",
                category: "",
                stock: 10,
              },
            ],
          }),
        }),
      },
      {
        match: url => url.includes("/edge-api/products"),
        respond: () => ({
          ok: true,
          status: 200,
          json: async () => ({
            status: "ok",
            fetchedAt: new Date().toISOString(),
            products: [
              {
                id: "1",
                name: "سيارة سباق بالريموت",
                price: 350,
                category: "",
                description: "سيارة أطفال سريعة",
                image: null,
                imageSource: null,
                active: true,
                sortOrder: 1,
                productPrompt: "",
                rowIndex: 1,
              },
            ],
          }),
        }),
      },
    ]);

    const payload = await fetchProducts();

    expect(payload.status).toBe("ok");
    expect(payload.products).toHaveLength(1);
    expect(payload.products[0].name).toBe("سيارة سباق بالريموت");
    // المسار الأساسي ثم المرآة — بلا محاولة CSV.
    expect(calls).toEqual(["/api/products", "/edge-api/products"]);
  });

  it("إذا فشل المساران same-origin ينتقل إلى CSV المدمج", async () => {
    const calls = stubFetch([
      {
        match: url => url.includes("/api/products"),
        respond: () => ({
          ok: false,
          status: 502,
          json: async () => ({}),
        }),
      },
      {
        match: url => url.includes("/edge-api/products"),
        respond: () => ({
          ok: false,
          status: 502,
          json: async () => ({}),
        }),
      },
      {
        match: url => url.includes("docs.google.com"),
        respond: () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("CSV لا يُقرأ كـJSON");
          },
          text: async () =>
            [
              "id,name,price,category,description,image,active,sort_order,product_prompt",
              "1,دمية دب,120,,دب قطيري,,،,1,",
            ].join("\n"),
        }),
      },
    ]);

    // بلا رابط مدمج في بيئة node الاختبارية (SHEET_URL فارغ وقت تحميل الوحدة):
    // حمولة فارغة بحالة not_configured بعد استنفاد المسارات same-origin.
    const payload = await fetchProducts();

    expect(payload.status).toBe("not_configured");
    expect(payload.products).toEqual([]);
    expect(calls).toEqual(["/api/products", "/edge-api/products"]);
  });
});
