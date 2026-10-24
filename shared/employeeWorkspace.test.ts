import { describe, expect, it } from "vitest";
import { workspaceShortcuts, WORKSPACE_INTRO } from "./employeeWorkspace";
import type { Principal } from "./rbac";

const active = (role: Extract<Principal, {domain:"EMPLOYEE"}>["role"]): Principal =>
  ({ domain: "EMPLOYEE", status: "ACTIVE", role });

describe("private employee workspaces", () => {
  it("includes a personal workspace description for every role", () => {
    expect(WORKSPACE_INTRO.OWNER).toContain("إدارة");
    expect(WORKSPACE_INTRO.CASHIER).toContain("الكاشير");
  });

  it("keeps cashier inside products and inventory, never team or reports", () => {
    const urls = workspaceShortcuts(active("CASHIER")).map(x => x.href);
    expect(urls).toContain("/admin/products");
    expect(urls).toContain("/admin/inventory");
    expect(urls).not.toContain("/admin/users");
    expect(urls).not.toContain("/admin/reports");
  });

  it("allows sales manager reports but reserves inventory changes for the dual manager", () => {
    const sales = workspaceShortcuts(active("SALES_MANAGER"));
    const dual = workspaceShortcuts(active("SALES_WAREHOUSE_MANAGER"));
    expect(sales.some(item => item.href === "/admin/reports")).toBe(true);
    expect(dual.some(item => item.href === "/admin/inventory")).toBe(true);
    expect(sales.some(item => item.href === "/admin/users")).toBe(false);
    expect(dual.some(item => item.href === "/admin/users")).toBe(false);
  });

  it("reserves employee directory for owner, denies unknown and inactive accounts", () => {
    expect(workspaceShortcuts(active("OWNER")).some(item => item.href === "/admin/users")).toBe(true);
    expect(workspaceShortcuts(active("VIEWER")).some(item => item.href === "/admin/users")).toBe(false);
    expect(workspaceShortcuts({ domain: "EMPLOYEE", role: "OWNER", status: "INVITED" })).toEqual([]);
    expect(workspaceShortcuts({ domain: "CUSTOMER", status: "ACTIVE" })).toEqual([]);
    expect(workspaceShortcuts(null)).toEqual([]);
  });
});
