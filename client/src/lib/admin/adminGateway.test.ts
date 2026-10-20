import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminActionsConfigured,
  normalizeCustomerRecord,
  normalizeEmployeeRecord,
  normalizeInventoryRecord,
  postAdminAction,
  readEmployees,
  readWhatsAppMetrics,
} from "./adminGateway";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("admin SQL gateway normalization", () => {
  it("accepts SQL snake_case employee rows", () => {
    expect(normalizeEmployeeRecord({
      employee_id: "EMP-1", full_name: "Employee", mobile: null,
      access_email: "employee@example.com", role: "CATALOG_MANAGER", status: "ACTIVE",
      mobile_verified_at: null, last_login_at: null, created_at: "2026-09-18T00:00:00Z",
    })).toMatchObject({ employeeId: "EMP-1", role: "CATALOG_MANAGER", status: "ACTIVE" });
  });

  it("keeps compatibility with existing camelCase employee rows", () => {
    expect(normalizeEmployeeRecord({
      employeeId: "EMP-2", fullName: "Viewer", mobile: "",
      accessEmail: null, role: "VIEWER", status: "ACTIVE",
      mobileVerifiedAt: null, lastLoginAt: null, createdAt: "2026-09-18T00:00:00Z",
    })?.employeeId).toBe("EMP-2");
  });

  it("accepts SQL customer rows and rejects invalid status", () => {
    expect(normalizeCustomerRecord({
      customer_id: "CUS-1", full_name: null, mobile: "+201000000000",
      status: "ACTIVE", mobile_verified_at: null, last_login_at: null,
      created_at: "2026-09-18T00:00:00Z",
    })?.customerId).toBe("CUS-1");
    expect(normalizeCustomerRecord({ customer_id: "CUS-2", mobile: "+201000000001", status: "DELETED" })).toBeNull();
  });

  it("maps SQL inventory without inventing unknown stock", () => {
    expect(normalizeInventoryRecord({
      product_id: "OMR-1", sku: null, on_hand_qty: null, reserved_qty: 0,
      low_stock_threshold: null, reorder_qty: null, inventory_status: "UNKNOWN",
      last_counted_at: null, updated_at: "2026-09-18T00:00:00Z",
    })).toMatchObject({ productId: "OMR-1", onHandQty: null, availableQty: null });
  });
});

describe("admin gateway private data boundary", () => {
  it("requests employee records only from an uncached same-origin API", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", mockFetch);
    expect(await readEmployees()).toEqual({ status: "not_configured" });
    const [request, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(new URL(request).pathname).toBe("/api/admin/read");
    expect(new URL(request).searchParams.get("action")).toBe("employees");
    expect(options.credentials).toBe("same-origin");
    expect(options.cache).toBe("no-store");
  });

  it("keeps public aggregate metrics separate from credentialed admin reads", async () => {
    const mockFetch = vi.fn().mockResolvedValue(Response.json({ total: 0 }));
    vi.stubGlobal("fetch", mockFetch);
    expect((await readWhatsAppMetrics()).status).toBe("live");
    const [request, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(request).toContain("hook.eu1.make.com");
    expect(options.credentials).toBe("omit");
  });

  it("rejects external write webhooks even if configured in the public build", async () => {
    vi.stubEnv("VITE_ADMIN_ACTIONS_WEBHOOK_URL", "https://hook.example.test/secret");
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    expect(adminActionsConfigured()).toBe(false);
    expect(await postAdminAction("update", { id: "1" })).toMatchObject({ ok: false, code: "NOT_CONFIGURED" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not claim an admin write succeeded without explicit server acceptance", async () => {
    vi.stubEnv("VITE_ADMIN_ACTIONS_WEBHOOK_URL", "/api/admin");
    const mockFetch = vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);
    expect((await postAdminAction("update", { id: "1" })).ok).toBe(false);
    expect((await postAdminAction("update", { id: "1" })).ok).toBe(true);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/admin/actions");
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
  });
});
