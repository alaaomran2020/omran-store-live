import { describe, expect, it } from "vitest";
import {
  mapSqlCustomerRow,
  mapSqlEmployeeRow,
  mapSqlInventoryRow,
  mapSqlProductRow,
} from "./sqlCoreEntities";

describe("SQL core entity adapters", () => {
  it("maps SQL products while preserving publication fields", () => {
    const product = mapSqlProductRow({
      product_id: "OMR-1", sku: "SKU-1", name: "Test Product", category_legacy: "Toys",
      description: "", price: "250.00", image_url: "/products/test.webp",
      image_source: "/products/test.webp", source_drive_id: null,
      processed_image: "/products/test.webp", product_prompt: "", active: true,
      workflow_status: "PUBLISHED", qa_status: "PASS", review_reason: null,
      sort_order: 1, legacy_row_index: 9,
    });
    expect(product).toMatchObject({ id: "OMR-1", price: 250, workflowStatus: "PUBLISHED", qaStatus: "PASS" });
  });

  it("keeps unknown inventory quantity nullable and derives available quantity only when known", () => {
    expect(mapSqlInventoryRow({
      product_id: "OMR-1", sku: null, on_hand_qty: null, reserved_qty: 0,
      low_stock_threshold: null, reorder_qty: null, inventory_status: "UNKNOWN",
      last_counted_at: null, updated_at: "2026-09-18T00:00:00Z",
    })?.availableQty).toBeNull();
    expect(mapSqlInventoryRow({
      product_id: "OMR-2", sku: "SKU-2", on_hand_qty: 10, reserved_qty: 3,
      low_stock_threshold: 2, reorder_qty: 6, inventory_status: "IN_STOCK",
      last_counted_at: null, updated_at: "2026-09-18T00:00:00Z",
    })?.availableQty).toBe(7);
  });

  it("rejects invalid employee RBAC values", () => {
    expect(mapSqlEmployeeRow({ employee_id: "E1", full_name: "Test", role: "SUPER_ADMIN", status: "ACTIVE" })).toBeNull();
  });

  it("maps SQL employee and customer rows to application contracts", () => {
    expect(mapSqlEmployeeRow({
      employee_id: "E1", full_name: "Employee", mobile: null,
      access_email: "employee@example.com", role: "VIEWER", status: "ACTIVE",
      mobile_verified_at: null, last_login_at: null, created_at: "2026-09-18T00:00:00Z",
    })).toMatchObject({ employeeId: "E1", role: "VIEWER", status: "ACTIVE" });
    expect(mapSqlCustomerRow({
      customer_id: "C1", mobile: "+201000000000", status: "PENDING_PROFILE",
      mobile_verified_at: null, full_name: null, last_login_at: null,
      created_at: "2026-09-18T00:00:00Z",
    })).toMatchObject({ customerId: "C1", fullName: "", status: "PENDING_PROFILE" });
  });
});
