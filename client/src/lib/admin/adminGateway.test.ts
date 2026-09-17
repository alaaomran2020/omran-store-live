import { describe, expect, it } from "vitest";
import {
  normalizeCustomerRecord,
  normalizeEmployeeRecord,
  normalizeInventoryRecord,
  normalizeAdminContent,
} from "./adminGateway";

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
  it("maps live Admin content payloads", () => {
    expect(normalizeAdminContent({
      content: {
        announcements: ["A", "B"],
        contact: { whatsapp: "201555570269", landline: "20403411149" },
        social: { instagram: "https://instagram.example", facebook: "https://facebook.example" },
        branches: [{ id: "b1", name: "Branch", address: "Address", city: "Tanta" }],
      },
    })).toMatchObject({
      announcements: ["A", "B"],
      contact: { whatsapp: "201555570269" },
      branches: [{ id: "b1", city: "Tanta" }],
    });
  });

});
