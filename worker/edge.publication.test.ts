// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import worker from "./index";

const ctx = {} as ExecutionContext;

/**
 * بوابة النشر النهائية على حافة Cloudflare (defense-in-depth فوق
 * shared/products.ts): أي صف ليس (active + PUBLISHED + PASS) لا يصل للزائر.
 */
describe("edge /api/products — Final Publication Gate", () => {
  const CSV_PUBLIC = [
    "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status",
    "OK-1,منتج منشور,100,ألعاب,وصف,,TRUE,1,,PUBLISHED,PASS",
    "HOLD-1,منتج يحتاج مراجعة,200,ألعاب,وصف,,TRUE,2,,PUBLISHED,NEEDS_REVIEW",
    "REV-1,منتج قيد المراجعة,150,ألعاب,وصف,,TRUE,3,,REVIEW,PASS",
    "NOQA-1,بلا QA,50,ألعاب,وصف,,TRUE,4,,PUBLISHED,",
    "OFF-1,مخفي,50,ألعاب,وصف,,FALSE,5,,PUBLISHED,PASS",
  ].join("\n");

  it("يعيد المنشور فقط ولا يسرّب NEEDS_REVIEW/REVIEW/مخفي/بلا QA", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(CSV_PUBLIC, {
        status: 200,
        headers: { "content-type": "text/csv" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const res = await worker.fetch(
        new Request("https://omrantoys.store/api/products", { method: "GET" }),
        { PRODUCTS_SHEET_URL: "https://example.com/products.csv" } as Env,
        ctx
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("x-publication-gate")).toBe("active+published+pass");
      const body = (await res.json()) as {
        products: { id: string; active: boolean; qaStatus: string; workflowStatus: string }[];
        status: string;
      };
      expect(body.status).toBe("ok");
      expect(body.products.map(p => p.id)).toEqual(["OK-1"]);
      for (const product of body.products) {
        expect(product.active).toBe(true);
        expect(product.qaStatus).toBe("PASS");
        expect(product.workflowStatus).toBe("PUBLISHED");
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
