/**
 * client/src/lib/adminApi.ts — عميل الـ API الإداري للمتصفح.
 *
 * كل الطلبات:
 *  - credentials: "include" لتدفّق كوكي الجلسة HttpOnly
 *  - رأس X-Requested-With (يستخدمه الخادم كطبقة إضافية ضد CSRF)
 *  - لا يوجد أي توكن في localStorage — الجلسة كلها داخل Cookie HttpOnly
 *
 * مهم: فحوصات الصلاحيات هنا (can / editableFields) تجري لتحسين تجربة
 * المستخدم فقط. الإنفاذ الحقيقي يتم على الخادم (server/adminRoutes.ts).
 */

export type AdminInfo = {
  id: string;
  phone: string;
  fullName: string;
  role: "super_admin" | "limited_admin";
  permissions: string[];
};

export class ApiError extends Error {
  status: number;
  payload: Record<string, unknown> | null;
  constructor(message: string, status: number, payload: Record<string, unknown> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request<T = Record<string, unknown>>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      "X-Requested-With": "XMLHttpRequest",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data: Record<string, unknown> | null = null;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // استجابة غير JSON
  }
  if (!res.ok) {
    const message =
      typeof data?.error === "string" ? data.error : `خطأ ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

/** فحص الجلسة الحالية — يعيد بيانات المدير أو يرمي 401 */
export const fetchMe = () =>
  request<{ admin: AdminInfo; session: { id: string; expiresAt: string } }>(
    "/api/admin/auth/me"
  );

/** طلب إرسال كود OTP إلى واتساب المدير */
export const requestCode = (phone: string) =>
  request<{
    ok: boolean;
    delivered: boolean;
    expiresInSec: number;
    retryAfterSec: number;
    devCode?: string;
    devMagicUrl?: string;
  }>("/api/admin/auth/request-code", { method: "POST", body: { phone } });

/** التحقق من الكود (أو الرابط السحري عبر token) */
export const verifyCode = ({ phone, code, token }: { phone: string; code?: string; token?: string }) =>
  request<{ ok: boolean; admin: AdminInfo; session: { expiresAt: string } }>(
    "/api/admin/auth/verify",
    { method: "POST", body: { phone, code, token } }
  );

export const logout = () => request("/api/admin/auth/logout", { method: "POST" });

/** المنتجات (إداري) — كتالوج مدموج يشمل المخفي */
export const fetchAdminProducts = ({
  search = "",
  limit = 20,
  offset = 0,
}: { search?: string; limit?: number; offset?: number } = {}) =>
  request<{
    products: import("@shared/products").Product[];
    total: number;
    status: string;
    fetchedAt: string;
  }>(
    `/api/admin/products?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`
  );

export const fetchAdminProduct = (id: string) =>
  request<{ product: import("@shared/products").Product }>(
    `/api/admin/products/${encodeURIComponent(id)}`
  );

export const patchAdminProduct = (
  id: string,
  fields: Record<string, unknown>
) =>
  request<{ ok: boolean; product: import("@shared/products").Product }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    { method: "PATCH", body: fields }
  );

/** سجل نشاطي الأخير */
export const fetchMyActivity = () =>
  request<{ rows: { action: string; entityType: string | null; entityId: string | null; outcome: string; createdAt: string }[] }>(
    "/api/admin/activity"
  );

// --------------------- مساعدات صلاحيات (UX فقط) ---------------------

export const can = (admin: AdminInfo | null | undefined, permission: string): boolean =>
  !!admin && (admin.permissions.includes("*") || admin.permissions.includes(permission));

/** الحقول القابلة للتحرير بحسب الصلاحيات — تُستخدم لتعطيل الواجهة */
export const editableFields = (admin: AdminInfo | null | undefined) => ({
  name: can(admin, "products.name"),
  price: can(admin, "products.price"),
  description: can(admin, "products.description"),
  images: can(admin, "products.images"),
  active: can(admin, "*"),
});

export const isSuperAdmin = (admin: AdminInfo | null | undefined): boolean =>
  !!admin && admin.role === "super_admin";

/** تنسيق الجنيه المصري */
export const formatEGP = (value: number | null | undefined): string =>
  value == null
    ? "للاستفسار والكميات"
    : `${Number(value).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;
