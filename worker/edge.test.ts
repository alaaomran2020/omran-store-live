// @vitest-environment node
import { describe, expect, it } from "vitest";
import worker from "./index";

const ctx = {} as ExecutionContext;

function get(url: string): Promise<Response> {
  return worker.fetch(new Request(url, { method: "GET" }), {}, ctx);
}

describe("API-only edge ownership", () => {
  it("لا يخدم /health كواجهة عامة ولا يعيد توجيه النطاق", async () => {
    const apex = await get("https://omrantoys.store/health");
    const www = await get("https://www.omrantoys.store/health");

    expect(apex.status).toBe(404);
    expect(www.status).toBe(404);
    expect(apex.headers.get("location")).toBeNull();
    expect(www.headers.get("location")).toBeNull();
  });

  it("لا يخدم صفحات المتجر من Worker", async () => {
    const home = await get("https://omrantoys.store/");
    const products = await get("https://www.omrantoys.store/products?cat=5&utm=x");

    expect(home.status).toBe(404);
    expect(products.status).toBe(404);
    expect(products.headers.get("location")).toBeNull();
  });
});

describe("Product API on apex and www", () => {
  it("يعيد نفس عقد JSON مباشرة على النطاقين بدون redirect", async () => {
    const apex = await get("https://omrantoys.store/api/products");
    const www = await get("https://www.omrantoys.store/api/products");

    expect(apex.status).toBe(200);
    expect(www.status).toBe(200);
    expect(apex.headers.get("location")).toBeNull();
    expect(www.headers.get("location")).toBeNull();

    const apexBody = (await apex.json()) as {
      products: unknown[];
      status: string;
    };
    const wwwBody = (await www.json()) as {
      products: unknown[];
      status: string;
    };

    expect(apexBody).toEqual({ products: [], status: "not_configured" });
    expect(wwwBody).toEqual(apexBody);
    expect(apex.headers.get("x-edge")).toBe("omran-store-live");
    expect(www.headers.get("x-edge")).toBe("omran-store-live");
  });
});

describe("fail-closed edge behavior", () => {
  it("مسار غير مسموح → 404", async () => {
    const res = await get("https://omrantoys.store/whatever");
    expect(res.status).toBe(404);
  });

  it("Admin API بلا ORIGIN_BASE_URL لا يتحول إلى proxy عشوائي", async () => {
    const res = await get("https://omrantoys.store/api/admin/auth/me");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "origin_base_url_unset_or_insecure" });
  });
});

describe("edge /edge-api/products mirror", () => {
  it("نفس عقد /api/products: 200 + JSON (not_configured بلا ضبط)", async () => {
    const res = await get("https://omrantoys.store/edge-api/products");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      products: unknown[];
      status: string;
    };
    expect(body.status).toBe("not_configured");
    expect(body.products).toEqual([]);
    expect(res.headers.get("x-edge")).toBe("omran-store-live");
  });
});
