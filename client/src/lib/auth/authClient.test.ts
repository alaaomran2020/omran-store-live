import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCustomerSession, postCustomerAction } from "./authClient";

afterEach(() => vi.unstubAllGlobals());

describe("customer session and private writes", () => {
  it("rejects malformed session results and caches no private response", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(Response.json({ hello: "world" })).mockResolvedValueOnce(
      Response.json({ authenticated: false, customer: null })
    );
    vi.stubGlobal("fetch", mockFetch);
    expect(await fetchCustomerSession()).toBeNull();
    expect(await fetchCustomerSession()).toEqual({ authenticated: false, customer: null });
    expect(mockFetch.mock.calls[0][0]).toBe("/api/auth/session?domain=CUSTOMER");
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
  });

  it("fails closed if a customer action returns HTTP 200 without explicit acceptance", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);
    expect((await postCustomerAction("update_profile", { name: "Test" })).ok).toBe(false);
    expect((await postCustomerAction("update_profile", { name: "Test" })).ok).toBe(true);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
  });
});
