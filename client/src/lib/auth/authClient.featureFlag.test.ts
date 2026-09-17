// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("OTP production feature flag", () => {
  it("fails closed without any network request when auth is disabled", async () => {
    vi.stubEnv("VITE_AUTH_ENABLED", "false");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const auth = await import("./authClient");

    await expect(auth.requestOtp("CUSTOMER", "+201000000000")).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
    expect(await auth.isAuthProviderConfigured()).toBe(false);
    expect(await auth.fetchCustomerSession()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
