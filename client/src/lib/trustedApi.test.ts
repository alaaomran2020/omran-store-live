import { describe, expect, it } from "vitest";
import { trustedSameOriginApiBase } from "./trustedApi";

describe("trusted private API path", () => {
  it("accepts only the dedicated same-origin path", () => {
    expect(trustedSameOriginApiBase("/api/auth", "/api/auth")).toBe("/api/auth");
    expect(trustedSameOriginApiBase(" /api/admin/ ", "/api/admin")).toBe("/api/admin");
    expect(trustedSameOriginApiBase("/api/admin/read", "/api/admin")).toBeNull();
  });
  it.each([
    "https://hook.example.test/private",
    "//hook.example.test/private",
    "javascript:alert(1)",
    "/api/auth?redirect=https://example.test",
    "/api/auth/../../external",
    "/api/admin#fragment",
    "",
  ])("blocks unsafe private destination %s", value => {
    expect(trustedSameOriginApiBase(value, "/api/auth")).toBeNull();
    expect(trustedSameOriginApiBase(value, "/api/admin")).toBeNull();
  });
});
