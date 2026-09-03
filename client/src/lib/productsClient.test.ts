// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProducts } from "./productsClient";

/**
 * سلسلة المحاولات في productsClient:
 *   /api/products → /edge-api/products → CSV → validated snapshot.
 */

type Route = {
  match: (url: string) => boolean;
  respond: () => { ok: boolean; status: number; json: () => Promise<unknown>; text?: () => Promise<string> };
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
  it("يتخطى /api/products القديم ويحمل من المرآة", async () => {
    const calls = stubFetch([
      {
        match: url => url.includes("/api/products"),
        respond: () => ({
          ok: true,
          status: 200,
          json: async () => ({ products: [{ id: "legacy", name: "قديم" }] }),
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
                id: "P-1",
                name: "منتج موثّق",
                price: 350,
                category: "ألعاب",
                description: "",
                image: null,
                imageSource: null,
                active: true,
                sortOrder: 1,
                productPrompt: "",
                workflowStatus: "PUBLISHED",
                qaStatus: "PASS",
                sourceDriveId: null,
                processedImage: null,
                reviewReason: null,
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
    expect(payload.products[0].id).toBe("P-1");
    expect(calls).toEqual(["/api/products", "/edge-api/products"]);
  });

  it("لا يعتبر status=ok مع قائمة فارغة نجاحًا ويكمل إلى البدائل", async () => {
    const calls = stubFetch([
      {
        match: url => url.includes("/api/products"),
        respond: () => ({ ok: true, status: 200, json: async () => ({ status: "ok", products: [] }) }),
      },
      {
        match: url => url.includes("/edge-api/products"),
        respond: () => ({ ok: true, status: 200, json: async () => ({ status: "ok", products: [] }) }),
      },
    ]);

    const payload = await fetchProducts();

    expect(payload.status).toBe("ok");
    expect(payload.products.length).toBeGreaterThan(0);
    for (const product of payload.products) {
      expect(product.active).toBe(true);
      expect(product.workflowStatus).toBe("PUBLISHED");
      expect(product.qaStatus).toBe("PASS");
    }
    expect(calls).toEqual(["/api/products", "/edge-api/products"]);
  });

  it("إذا فشلت المصادر الحية كلها يستخدم snapshot الموثّق بدل كتالوج فارغ", async () => {
    const calls = stubFetch([
      {
        match: url => url.includes("/api/products"),
        respond: () => ({ ok: false, status: 502, json: async () => ({}) }),
      },
      {
        match: url => url.includes("/edge-api/products"),
        respond: () => ({ ok: false, status: 502, json: async () => ({}) }),
      },
    ]);

    const payload = await fetchProducts();

    expect(payload.status).toBe("ok");
    expect(payload.products.map(p => p.id)).toEqual([
      "OMR-IG-KIT-46",
      "OMR-IG-HC-104",
      "OMR-IG-SQ-01",
      "OMR-RAW-001",
      "OMR-RAW-002",
      "OMR-RAW-003",
      "OMR-RAW-004",
      "OMR-RAW-005",
    ]);
    expect(calls).toEqual(["/api/products", "/edge-api/products"]);
  });
});
