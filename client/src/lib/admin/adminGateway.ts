/**
 * بوابة بيانات الإدارة (قراءات + إجراءات كتابية موثّقة).
 *
 * القراءات التشغيلية (واتساب، الموظفون، العملاء، المخزون، سجل التدقيق)
 * تمر عبر Runtime موحد على نفس الأصل افتراضيًا: /api/admin.
 * لا تعتمد هذه الطبقة على Make أو أي مزود خارجي بعينه.
 *
 * كل قراءة تُرجع حالة صريحة: live / not_configured / error.
 * الكتابة تستخدم VITE_ADMIN_ACTIONS_URL عند تفعيل Runtime الكتابة، مع توافق
 * مؤقت مع VITE_ADMIN_ACTIONS_WEBHOOK_URL القديم.
 */
import {
  mapSqlCustomerRow,
  mapSqlEmployeeRow,
  mapSqlInventoryRow,
  type CustomerRecord,
  type EmployeeRecord,
  type InventoryRecord,
} from "@shared/sqlCoreEntities";

export type { CustomerRecord, EmployeeRecord, InventoryRecord } from "@shared/sqlCoreEntities";

export type ReadStatus = "live" | "not_configured" | "error";

export type ReadResult<T> =
  | { status: "live"; data: T; fetchedAt: string }
  | { status: "not_configured" }
  | { status: "error"; message: string };

const GET_TIMEOUT_MS = 9_000;
const DEFAULT_ADMIN_READS_BASE_URL = "/api/admin";

export function adminReadsBaseUrl(): string {
  const configured = (import.meta.env.VITE_ADMIN_READS_BASE_URL ?? "").trim();
  return configured || DEFAULT_ADMIN_READS_BASE_URL;
}

export function buildAdminReadUrl(action: string, params: Record<string, string> = {}): string {
  const url = new URL(adminReadsBaseUrl(), window.location.origin);
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function gatewayGet<T>(
  action: string,
  params: Record<string, string>,
  accept: (body: unknown) => T | null
): Promise<ReadResult<T>> {
  try {
    const url = buildAdminReadUrl(action, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (response.status === 404 || response.status === 501) {
      return { status: "not_configured" };
    }
    if (!response.ok) return { status: "error", message: `HTTP ${response.status}` };
    const body = await response.json().catch(() => null);
    const data = accept(body);
    if (data === null) return { status: "not_configured" };
    return { status: "live", data, fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "error", message: "timeout" };
    }
    return { status: "not_configured" };
  }
}

// ---------------------------------------------------------------------------
// ضغطات واتساب
// ---------------------------------------------------------------------------

export type WhatsAppMetrics = {
  total: number;
  today: number;
  last7: number;
  trend: { date: string; label: string; count: number }[];
  topProducts: { key: string; label: string; count: number }[];
  topCategories: { key: string; label: string; count: number }[];
};

export function readWhatsAppMetrics(): Promise<ReadResult<WhatsAppMetrics>> {
  return gatewayGet("whatsapp_metrics", {}, body => {
    if (!isRecord(body)) return null;
    const trend = Array.isArray(body.trend) ? body.trend : [];
    const topProducts = Array.isArray(body.top_products)
      ? body.top_products
      : Array.isArray(body.topProducts)
        ? body.topProducts
        : [];
    const topCategories = Array.isArray(body.top_categories)
      ? body.top_categories
      : Array.isArray(body.topCategories)
        ? body.topCategories
        : [];
    if (
      typeof body.total !== "number" &&
      !(isRecord(body.totals) && typeof body.totals.total === "number")
    ) {
      return null;
    }
    const totals = isRecord(body.totals) ? body.totals : body;
    return {
      total: Number(totals.total ?? 0),
      today: Number(totals.today ?? 0),
      last7: Number(totals.last7 ?? totals.last_7 ?? 0),
      trend: trend
        .filter(isRecord)
        .map(point => ({
          date: String(point.date ?? ""),
          label: String(point.label ?? point.date ?? ""),
          count: Number(point.count ?? 0),
        })),
      topProducts: topProducts
        .filter(isRecord)
        .map(item => ({
          key: String(item.key ?? item.product_id ?? item.id ?? ""),
          label: String(item.label ?? item.product_name ?? item.key ?? ""),
          count: Number(item.count ?? 0),
        }))
        .filter(item => item.key),
      topCategories: topCategories
        .filter(isRecord)
        .map(item => ({
          key: String(item.key ?? item.category ?? ""),
          label: String(item.label ?? item.category ?? item.key ?? ""),
          count: Number(item.count ?? 0),
        }))
        .filter(item => item.key),
    };
  });
}

// ---------------------------------------------------------------------------
// الموظفون والعملاء وسجل التدقيق
// ---------------------------------------------------------------------------

export type AuditRecord = {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string | null;
  metadata: Record<string, unknown> | null;
};

function readList<T>(action: string, listKey: string, mapItem: (item: Record<string, unknown>) => T | null): Promise<ReadResult<T[]>> {
  return gatewayGet(action, {}, body => {
    if (!isRecord(body)) return null;
    const raw = body[listKey];
    if (!Array.isArray(raw)) return null;
    const items = raw.filter(isRecord).map(mapItem).filter((item): item is T => item !== null);
    return items;
  });
}

export function normalizeEmployeeRecord(item: Record<string, unknown>): EmployeeRecord | null {
  return mapSqlEmployeeRow({
    employee_id: item.employee_id ?? item.employeeId,
    full_name: item.full_name ?? item.fullName,
    mobile: item.mobile ?? null,
    access_email: item.access_email ?? item.accessEmail ?? null,
    role: item.role,
    status: item.status,
    mobile_verified_at: item.mobile_verified_at ?? item.mobileVerifiedAt ?? null,
    last_login_at: item.last_login_at ?? item.lastLoginAt ?? null,
    created_at: item.created_at ?? item.createdAt,
  });
}

export function normalizeCustomerRecord(item: Record<string, unknown>): CustomerRecord | null {
  return mapSqlCustomerRow({
    customer_id: item.customer_id ?? item.customerId,
    mobile: item.mobile,
    status: item.status,
    mobile_verified_at: item.mobile_verified_at ?? item.mobileVerifiedAt ?? null,
    full_name: item.full_name ?? item.fullName ?? null,
    last_login_at: item.last_login_at ?? item.lastLoginAt ?? null,
    created_at: item.created_at ?? item.createdAt,
  });
}

export function normalizeInventoryRecord(item: Record<string, unknown>): InventoryRecord | null {
  return mapSqlInventoryRow({
    product_id: item.product_id ?? item.productId,
    sku: item.sku ?? null,
    on_hand_qty: item.on_hand_qty ?? item.onHandQty ?? null,
    reserved_qty: item.reserved_qty ?? item.reservedQty ?? 0,
    low_stock_threshold: item.low_stock_threshold ?? item.lowStockThreshold ?? null,
    reorder_qty: item.reorder_qty ?? item.reorderQty ?? null,
    inventory_status: item.inventory_status ?? item.inventoryStatus,
    last_counted_at: item.last_counted_at ?? item.lastCountedAt ?? null,
    updated_at: item.updated_at ?? item.updatedAt ?? "",
  });
}

export const readEmployees = () =>
  readList<EmployeeRecord>("employees", "employees", normalizeEmployeeRecord);

export const readCustomers = () =>
  readList<CustomerRecord>("customers", "customers", normalizeCustomerRecord);

export const readInventory = () =>
  readList<InventoryRecord>("inventory", "inventory", normalizeInventoryRecord);

export const readAuditLog = () =>
  readList<AuditRecord>("audit_log", "events", item => {
    if (typeof item.id !== "string" || typeof item.action !== "string") return null;
    return {
      id: item.id,
      occurredAt: String(item.occurred_at ?? item.occurredAt ?? ""),
      actorId: String(item.actor_id ?? item.actorId ?? ""),
      actorName: String(item.actor_name ?? item.actorName ?? ""),
      action: item.action,
      targetType: String(item.target_type ?? item.targetType ?? ""),
      targetId: String(item.target_id ?? item.targetId ?? ""),
      targetName: (item.target_name ?? item.targetName ?? null) as string | null,
      metadata: isRecord(item.metadata) ? item.metadata : null,
    };
  });

// ---------------------------------------------------------------------------
// إجراءات الكتابة
// ---------------------------------------------------------------------------

function actionsRuntimeUrl(): string | null {
  const configured = (import.meta.env.VITE_ADMIN_ACTIONS_URL ?? import.meta.env.VITE_ADMIN_ACTIONS_WEBHOOK_URL ?? "").trim();
  return configured || null;
}

export type AdminWriteResult =
  | { ok: true; acceptedAt: string }
  | { ok: false; code: "NOT_CONFIGURED" | "REJECTED" | "ERROR"; message: string };

/**
 * يرسل إجراء إداريًا موقّعًا بهوية جلسة Cloudflare Access (كوكيز تُرسل تلقائيًا
 * credentials: include). البوابة هي المسؤولة عن التحقق النهائي من الصلاحيات —
 * فحوصات الواجهة للعرض فقط.
 */
export async function postAdminAction(
  action: string,
  payload: Record<string, string | number | boolean | null>
): Promise<AdminWriteResult> {
  const endpoint = actionsRuntimeUrl();
  if (!endpoint) {
    return { ok: false, code: "NOT_CONFIGURED", message: "بوابة الإجراءات غير مفعلة" };
  }
  try {
    const body = new URLSearchParams({ action, payload_json: JSON.stringify(payload) });
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", Accept: "application/json" },
      body,
    });
    if (!response.ok) return { ok: false, code: "REJECTED", message: `HTTP ${response.status}` };
    const result = await response.json().catch(() => ({}));
    if (result && typeof result === "object" && (result as { ok?: boolean }).ok === false) {
      return { ok: false, code: "REJECTED", message: String((result as { error?: string }).error ?? "رفضت البوابة") };
    }
    return { ok: true, acceptedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, code: "ERROR", message: error instanceof Error ? error.message : "network_error" };
  }
}

export function adminActionsConfigured(): boolean {
  return Boolean(actionsRuntimeUrl());
}
