// @vitest-environment node
import { describe, expect, it } from "vitest";
import { onRequest } from "../../../functions/api/products.js";

describe("Legacy public products API retirement", () => {
  it("fails closed rather than returning historical catalog data", async () => {
    const response = onRequest();
    expect(response.status).toBe(410);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");

    const body = await response.json();
    expect(body).toEqual({
      status: "retired",
      catalogPath: "/products",
    });
    expect(body).not.toHaveProperty("products");
  });

  it("never serializes prices or internal catalog fields", async () => {
    const body = await onRequest().text();
    expect(body).not.toMatch(
      /price|cost|purchase|wholesale|retail|productPrompt|sourceDriveId|imageSource|rowIndex|سعر|الجملة|الشراء/i,
    );
  });
});
