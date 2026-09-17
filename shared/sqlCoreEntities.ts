import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES, type EmployeeRole, type EmployeeStatus } from "./rbac";
import {
  toDisplayableImageUrl,
  type Product,
  type QaStatus,
  type WorkflowStatus,
} from "./products";
import type { CustomerStatus } from "./identity";

export const INVENTORY_STATUSES = [
  "UNKNOWN",
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "DISCONTINUED",
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export type SqlProductRow = {
  product_id: string;
  sku: string | null;
  barcode?: string | null;
  name: string;
  category_id?: string | null;
  category_legacy: string | null;
  description: string;
  price: number | string | null;
  availability?: string | null;
  tags?: string[] | null;
  image_url: string | null;
  image_source: string | null;
  source_drive_id: string | null;
  processed_image: string | null;
  product_prompt: string;
  active: boolean;
  workflow_status: WorkflowStatus | null;
  qa_status: QaStatus | null;
  review_reason: string | null;
  sort_order: number | null;
  legacy_row_index: number | null;
};

export type SqlInventoryRow = {
  product_id: string;
  sku: string | null;
  on_hand_qty: number | null;
  reserved_qty: number;
  low_stock_threshold: number | null;
  reorder_qty: number | null;
  inventory_status: InventoryStatus;
  last_counted_at: string | null;
  updated_at: string;
};

export type InventoryRecord = {
  productId: string;
  sku: string | null;
  onHandQty: number | null;
  reservedQty: number;
  availableQty: number | null;
  lowStockThreshold: number | null;
  reorderQty: number | null;
  inventoryStatus: InventoryStatus;
  lastCountedAt: string | null;
  updatedAt: string;
};

export type SqlEmployeeRow = {
  employee_id: string;
  full_name: string;
  mobile: string | null;
  access_email: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  mobile_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type EmployeeRecord = {
  employeeId: string;
  fullName: string;
  mobile: string;
  accessEmail: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  mobileVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type SqlCustomerRow = {
  customer_id: string;
  mobile: string;
  status: CustomerStatus;
  mobile_verified_at: string | null;
  full_name: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type CustomerRecord = {
  customerId: string;
  fullName: string;
  mobile: string;
  status: CustomerStatus;
  mobileVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

const CUSTOMER_STATUSES: readonly CustomerStatus[] = ["PENDING_PROFILE", "ACTIVE", "SUSPENDED"];
const WORKFLOW_STATUSES: readonly WorkflowStatus[] = ["REVIEW", "PUBLISHED", "REJECTED", "DRAFT", "ERROR"];
const QA_STATUSES: readonly QaStatus[] = ["PASS", "NEEDS_REVIEW", "FAIL"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonnegativeInteger(value: unknown): number | null {
  const number = finiteNumber(value);
  return number !== null && Number.isInteger(number) && number >= 0 ? number : null;
}

export function mapSqlProductRow(value: unknown): Product | null {
  if (!isRecord(value)) return null;
  const id = nullableString(value.product_id);
  const name = nullableString(value.name);
  if (!id || !name) return null;

  const rawWorkflow = nullableString(value.workflow_status);
  const workflowStatus = rawWorkflow && WORKFLOW_STATUSES.includes(rawWorkflow as WorkflowStatus)
    ? (rawWorkflow as WorkflowStatus)
    : null;
  const rawQa = nullableString(value.qa_status);
  const qaStatus = rawQa && QA_STATUSES.includes(rawQa as QaStatus) ? (rawQa as QaStatus) : null;
  const imageSource = nullableString(value.image_source) ?? nullableString(value.image_url);

  return {
    id,
    sku: nullableString(value.sku),
    name,
    price: finiteNumber(value.price),
    category: nullableString(value.category_legacy) ?? "",
    description: typeof value.description === "string" ? value.description : "",
    image: toDisplayableImageUrl(nullableString(value.image_url) ?? imageSource),
    imageSource,
    active: value.active === true,
    sortOrder: nonnegativeInteger(value.sort_order),
    productPrompt: typeof value.product_prompt === "string" ? value.product_prompt : "",
    workflowStatus,
    qaStatus,
    sourceDriveId: nullableString(value.source_drive_id),
    processedImage: nullableString(value.processed_image),
    reviewReason: nullableString(value.review_reason),
    rowIndex: nonnegativeInteger(value.legacy_row_index) ?? 0,
  };
}

export function mapSqlInventoryRow(value: unknown): InventoryRecord | null {
  if (!isRecord(value)) return null;
  const productId = nullableString(value.product_id);
  const status = nullableString(value.inventory_status);
  const reservedQty = nonnegativeInteger(value.reserved_qty);
  if (!productId || !status || !INVENTORY_STATUSES.includes(status as InventoryStatus) || reservedQty === null) {
    return null;
  }
  const onHandQty = nonnegativeInteger(value.on_hand_qty);
  return {
    productId,
    sku: nullableString(value.sku),
    onHandQty,
    reservedQty,
    availableQty: onHandQty === null ? null : Math.max(0, onHandQty - reservedQty),
    lowStockThreshold: nonnegativeInteger(value.low_stock_threshold),
    reorderQty: nonnegativeInteger(value.reorder_qty),
    inventoryStatus: status as InventoryStatus,
    lastCountedAt: nullableString(value.last_counted_at),
    updatedAt: nullableString(value.updated_at) ?? "",
  };
}

export function mapSqlEmployeeRow(value: unknown): EmployeeRecord | null {
  if (!isRecord(value)) return null;
  const employeeId = nullableString(value.employee_id);
  const fullName = nullableString(value.full_name);
  const role = nullableString(value.role);
  const status = nullableString(value.status);
  if (
    !employeeId || !fullName || !role || !status ||
    !EMPLOYEE_ROLES.includes(role as EmployeeRole) ||
    !EMPLOYEE_STATUSES.includes(status as EmployeeStatus)
  ) return null;

  return {
    employeeId,
    fullName,
    mobile: nullableString(value.mobile) ?? "",
    accessEmail: nullableString(value.access_email),
    role: role as EmployeeRole,
    status: status as EmployeeStatus,
    mobileVerifiedAt: nullableString(value.mobile_verified_at),
    lastLoginAt: nullableString(value.last_login_at),
    createdAt: nullableString(value.created_at) ?? "",
  };
}

export function mapSqlCustomerRow(value: unknown): CustomerRecord | null {
  if (!isRecord(value)) return null;
  const customerId = nullableString(value.customer_id);
  const mobile = nullableString(value.mobile);
  const status = nullableString(value.status);
  if (!customerId || !mobile || !status || !CUSTOMER_STATUSES.includes(status as CustomerStatus)) return null;

  return {
    customerId,
    fullName: nullableString(value.full_name) ?? "",
    mobile,
    status: status as CustomerStatus,
    mobileVerifiedAt: nullableString(value.mobile_verified_at),
    lastLoginAt: nullableString(value.last_login_at),
    createdAt: nullableString(value.created_at) ?? "",
  };
}
