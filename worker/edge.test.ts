// @vitest-environment node
import { describe, expect, it } from "vitest";
import worker from "./index";

const ctx = {} as ExecutionContext;

function get(url: string): Promise<Response> {
  return worker.fetch(new Request(url, { method: "GET" }), {}, ctx);
}

describe("edge /health", () => {
  it("يرد 200 وجسم JSON خفيف بلا أسرار", async () => {
    const res = await get("https://omrantoys.store/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("omran-store-live");
    expect(typeof body.timestamp).toBe("string");
    // لا أسرار ولا بنى تحتية في الاستجابة
    expect(JSON.stringify(body)).not.toMatch(/token|secret|password|url/i);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("www → apex redirect", () => {
  it("301 دائم مع الحفاظ على المسار والـquery", async () => {
    const res = await get("https://www.omrantoys.store/products?cat=5&utm=x");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "https://omrantoys.store/products?cat=5&utm=x"
    );
  });

  it("الجذر على www يتحول للجذر على apex", async () => {
    const res = await get("https://www.omrantoys.store/");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://omrantoys.store/");
  });

  it("لا إعادة توجيه على النطاق الأساسي", async () => {
    const res = await get("https://omrantoys.store/health");
    expect(res.status).toBe(200);
  });
});

describe("سلوك الحافة بدون أصل", () => {
  it("/api/products بدون PRODUCTS_SHEET_URL → not_configured ولا انهيار", async () => {
    const res = await get("https://omrantoys.store/api/products");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      products: unknown[];
      status: string;
    };
    expect(body.status).toBe("not_configured");
    expect(body.products).toEqual([]);
  });

  it("مسار غير مسموح وبدون ASSETS → 404", async () => {
    const res = await get("https://omrantoys.store/whatever");
    expect(res.status).toBe(404);
  });
});
