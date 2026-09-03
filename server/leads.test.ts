import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./_core/app";
import { resetMemoryStoreForTests } from "./adminStore";
import { parseLeadCreateInput } from "./leads";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  resetMemoryStoreForTests();
  await Promise.all(
    servers.splice(0).map(
      server => new Promise<void>(resolve => server.close(() => resolve()))
    )
  );
});

async function request(path: string, init?: RequestInit) {
  const server = createServer(buildApp());
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as AddressInfo).port;
  return fetch(`http://127.0.0.1:${port}${path}`, init);
}

describe("parseLeadCreateInput", () => {
  it("accepts the compact storefront payload", () => {
    const parsed = parseLeadCreateInput({
      name: "عميل تجريبي",
      phone: "+201000000000",
      message: "استفسار عن الكمية",
      product_id: "OT-00001",
      product_name: "لعبة اختبار",
      quantity: 2,
      unit_price: 150,
      utm: { utm_source: "facebook", ignored: "x" },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({
      customerName: "عميل تجريبي",
      phone: "+201000000000",
      notes: "استفسار عن الكمية",
      productId: "OT-00001",
      productName: "لعبة اختبار",
      quantity: 2,
      unitPrice: 150,
      source: "website",
      utm: { utm_source: "facebook" },
    });
  });

  it("rejects a missing name and malformed phone", () => {
    const parsed = parseLeadCreateInput({ name: "", phone: "abc" });
    expect(parsed).toEqual({
      ok: false,
      fields: { customerName: "required", phone: "invalid" },
    });
  });
});

describe("/api/leads production contract", () => {
  it("GET without an admin session is 401 JSON, never SPA HTML", async () => {
    const res = await request("/api/leads");
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("POST invalid data is 422 JSON before any DB access", async () => {
    const res = await request("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "bad" }),
    });
    expect(res.status).toBe(422);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toMatchObject({ error: "validation_error" });
  });
});
