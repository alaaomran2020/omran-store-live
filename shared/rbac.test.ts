import { describe, expect, it } from "vitest";
import {
  can,
  canAssignRole,
  canChangeUserRole,
  canDisableUser,
  canReactivateUser,
  permissionsOf,
  rolePermissions,
  type Principal,
} from "./rbac";

const owner: Principal = { domain: "EMPLOYEE", role: "OWNER", status: "ACTIVE", id: "emp-owner" };
const admin: Principal = { domain: "EMPLOYEE", role: "ADMIN", status: "ACTIVE", id: "emp-admin" };
const catalog: Principal = { domain: "EMPLOYEE", role: "CATALOG_MANAGER", status: "ACTIVE" };
const inventory: Principal = { domain: "EMPLOYEE", role: "INVENTORY_STAFF", status: "ACTIVE" };
const editor: Principal = { domain: "EMPLOYEE", role: "CONTENT_EDITOR", status: "ACTIVE" };
const viewer: Principal = { domain: "EMPLOYEE", role: "VIEWER", status: "ACTIVE" };
const suspended: Principal = { domain: "EMPLOYEE", role: "OWNER", status: "SUSPENDED" };
const invited: Principal = { domain: "EMPLOYEE", role: "VIEWER", status: "INVITED" };
const customer: Principal = { domain: "CUSTOMER", status: "ACTIVE" };

describe("RBAC role matrix", () => {
  it("grants viewers read-only access", () => {
    expect(can(viewer, "dashboard:view")).toBe(true);
    expect(can(viewer, "product:update")).toBe(false);
    expect(can(viewer, "inventory:update")).toBe(false);
    expect(can(viewer, "user:create")).toBe(false);
  });

  it("limits content editor to content updates", () => {
    expect(can(editor, "content:update")).toBe(true);
    expect(can(editor, "inventory:update")).toBe(false);
    expect(can(editor, "product:publish")).toBe(false);
  });

  it("limits catalog manager to catalog scope", () => {
    expect(can(catalog, "product:publish")).toBe(true);
    expect(can(catalog, "user:create")).toBe(false);
    expect(can(catalog, "inventory:update")).toBe(false);
    expect(can(catalog, "settings:update")).toBe(false);
  });

  it("limits inventory staff to inventory updates", () => {
    expect(can(inventory, "inventory:update")).toBe(true);
    expect(can(inventory, "product:update")).toBe(false);
    expect(can(inventory, "content:update")).toBe(false);
  });

  it("gives admin broad but not owner-assigning power", () => {
    expect(can(admin, "user:create")).toBe(true);
    expect(can(admin, "settings:update")).toBe(true);
    expect(canAssignRole(admin, "ADMIN")).toBe(true);
    expect(canAssignRole(admin, "OWNER")).toBe(false);
  });

  it("gives owner every permission", () => {
    for (const permission of rolePermissions("OWNER")) {
      expect(can(owner, permission)).toBe(true);
    }
    expect(canAssignRole(owner, "OWNER")).toBe(true);
  });

  it("denies everyone who is not an active employee", () => {
    expect(can(suspended, "dashboard:view")).toBe(false);
    expect(can(invited, "dashboard:view")).toBe(false);
    expect(can(customer, "dashboard:view")).toBe(false);
    expect(can(customer, "audit:view")).toBe(false);
    expect(can(null, "product:view")).toBe(false);
    expect(permissionsOf(customer)).toEqual([]);
  });
});

describe("owner protection", () => {
  const ownerTarget = { id: "emp-owner", role: "OWNER" as const, status: "ACTIVE" as const };
  const adminTarget = { id: "emp-admin", role: "ADMIN" as const, status: "ACTIVE" as const };

  it("prevents demoting or disabling the last owner", () => {
    expect(canChangeUserRole(owner, ownerTarget, "ADMIN", { activeOwnerCount: 1 })).toBe(false);
    expect(canDisableUser(owner, ownerTarget, { activeOwnerCount: 1 })).toBe(false);
  });

  it("allows demoting another owner when more than one active owner exists", () => {
    const otherOwner = { id: "emp-owner-2", role: "OWNER" as const, status: "ACTIVE" as const };
    expect(canChangeUserRole(owner, otherOwner, "ADMIN", { activeOwnerCount: 2 })).toBe(true);
  });

  it("prevents non-owner from assigning owner even when permitted to update roles", () => {
    expect(canChangeUserRole(admin, adminTarget, "OWNER", { activeOwnerCount: 1 })).toBe(false);
  });

  it("prevents self-disable and self-demotion", () => {
    expect(canDisableUser(owner, ownerTarget, { activeOwnerCount: 2 })).toBe(false);
    expect(canChangeUserRole(owner, ownerTarget, "VIEWER", { activeOwnerCount: 2 })).toBe(false);
  });

  it("allows only privileged actors to reactivate staff", () => {
    expect(canReactivateUser(admin, { role: "INVENTORY_STAFF", status: "DISABLED" })).toBe(true);
    expect(canReactivateUser(viewer, { role: "INVENTORY_STAFF", status: "DISABLED" })).toBe(false);
    expect(canReactivateUser(admin, adminTarget)).toBe(false);
  });
});
