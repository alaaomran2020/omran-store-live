import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const schemaPath = fileURLToPath(new URL("../database/001_unified_schema.sql", import.meta.url));
const schema = readFileSync(schemaPath, "utf8");

const requiredTables = [
  "categories", "products", "product_media", "product_intake", "qa_reviews", "approvals",
  "inventory", "stock_movements", "price_history", "suppliers", "purchase_orders",
  "purchase_order_lines", "employees", "customers", "customer_addresses",
  "customer_preferences", "analytics_events", "audit_log", "settings",
] as const;

describe("unified SQL schema contract", () => {
  it("defines every canonical domain table", () => {
    for (const table of requiredTables) {
      expect(schema).toMatch(new RegExp(`CREATE TABLE ${table}\\s*\\(`));
    }
  });

  it("preserves the fail-closed publication gate", () => {
    expect(schema).toContain("CREATE VIEW public_products AS");
    expect(schema).toContain("active = true");
    expect(schema).toContain("workflow_status = 'PUBLISHED'");
    expect(schema).toContain("qa_status = 'PASS'");
  });

  it("preserves current employee RBAC roles and statuses", () => {
    for (const role of ["OWNER", "ADMIN", "CATALOG_MANAGER", "INVENTORY_STAFF", "CONTENT_EDITOR", "VIEWER"]) {
      expect(schema).toContain(`'${role}'`);
    }
    for (const status of ["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"]) {
      expect(schema).toContain(`'${status}'`);
    }
  });

  it("keeps stock history append-oriented and current inventory separate", () => {
    expect(schema).toContain("CREATE TABLE inventory");
    expect(schema).toContain("CREATE TABLE stock_movements");
    expect(schema).toContain("quantity_delta integer NOT NULL");
  });

  it("does not introduce authentication or OTP persistence in PR 3", () => {
    expect(schema).not.toMatch(/CREATE TABLE\s+(auth_|otp_|sessions?\b|password)/i);
  });
});

