/**
 * سياق هوية الإدارة:
 *   - المصادقة (Authentication) تُحسم على الحافة عبر Cloudflare Access، ولا
 *     يمكن تزويرها في المتصفح (الهوية تأتي من /cdn-cgi/access/get-identity).
 *   - التفويض (Authorization) يُشتق مركزيًا هنا عبر shared/rbac.ts:
 *       1. /api/admin/me من الخادم: لا يعيد إلا هوية صاحب الجلسة (الموظفون).
 *       2. دليل الموظفين الكامل يقرأه المالك فقط.
 *       3. قائمة الملاك VITE_OWNER_EMAILS بذرة تشغيل (غير سرية).
 *       4. أي هوية غير مؤكدة = INVITED بلا صلاحيات.
 *   - موظف عليه DISABLED/SUSPENDED في الدليل يُمنع من اللوحة بالكامل
 *     (دفاع متعدد الطبقات فوق إزالته من سياسة Access نفسها).
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  can as canPermission,
  permissionsOf,
  type EmployeeRole,
  type EmployeeStatus,
  type Permission,
  type Principal,
} from "@shared/rbac";
import { readEmployees, readOwnEmployee, type EmployeeRecord } from "@/lib/admin/adminGateway";

export type CloudflareIdentity = {
  email?: string;
  name?: string;
  id?: string;
};

export type ResolvedEmployee = {
  principal: Principal;
  role: EmployeeRole;
  status: EmployeeStatus;
  fullName: string;
  email: string | null;
  employeeId: string;
  /** من أين جاء الدور: دليل البوابة، قائمة الملاك، أم افتراضي مشاهد. */
  roleSource: "directory" | "owner_allowlist" | "default_viewer";
};

type AdminIdentityContextValue = {
  cloudflare: CloudflareIdentity;
  resolved: ResolvedEmployee;
  /** principal الجاهز لاستهلاك shared/rbac.can مباشرة. */
  principal: Principal;
  directory: EmployeeRecord[];
  directoryStatus: "live" | "not_configured" | "error";
  activeOwnerCount: number;
  can: (permission: Permission) => boolean;
  permissions: Permission[];
  actor: { id: string; name: string };
};

const AdminIdentityContext = createContext<AdminIdentityContextValue | null>(null);

const ROLE_ORDER: EmployeeRole[] = [
  "OWNER",
  "ADMIN",
  "SALES_WAREHOUSE_MANAGER",
  "SALES_MANAGER",
  "CASHIER",
  "CATALOG_MANAGER",
  "INVENTORY_STAFF",
  "CONTENT_EDITOR",
  "VIEWER",
];

function isEmployeeRole(value: string): value is EmployeeRole {
  return (ROLE_ORDER as readonly string[]).includes(value);
}

function isEmployeeStatus(value: string): value is EmployeeStatus {
  return (["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"] as readonly string[]).includes(value);
}

function ownerAllowlist(): string[] {
  return String(import.meta.env.VITE_OWNER_EMAILS ?? "")
    .split(/[,;]+/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

export function AdminIdentityProvider({
  identity,
  children,
}: {
  identity: CloudflareIdentity;
  children: ReactNode;
}) {
  const accessEmail = (identity.email ?? "").trim().toLowerCase();
  const bootOwner = Boolean(accessEmail && ownerAllowlist().includes(accessEmail));
  // الموظف العادي لا يُحمِّل دليل الزملاء مطلقًا إلى المتصفح.
  // /api/admin/me يجب أن يتحقق من Access JWT ويرجع صف صاحب الجلسة فقط.
  const ownQuery = useQuery({
    queryKey: ["admin", "current-employee", accessEmail],
    queryFn: readOwnEmployee,
    enabled: Boolean(accessEmail) && !bootOwner,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const ownRecord = ownQuery.data?.status === "live" ? ownQuery.data.data : null;
  const isVerifiedOwner = Boolean(
    ownRecord &&
    ownRecord.accessEmail?.trim().toLowerCase() === accessEmail &&
    ownRecord.role === "OWNER" &&
    ownRecord.status === "ACTIVE"
  );
  const employeesQuery = useQuery({
    queryKey: ["admin", "employees-directory"],
    queryFn: readEmployees,
    enabled: bootOwner || isVerifiedOwner,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const value = useMemo<AdminIdentityContextValue>(() => {
    const result = employeesQuery.data;
    const directory = result?.status === "live" ? result.data : [];
    const directoryStatus =
      result?.status === "live"
        ? "live"
        : result?.status === "error"
          ? "error"
          : "not_configured";

    const email = (identity.email ?? "").trim().toLowerCase() || null;
    const ownMatch = ownQuery.data?.status === "live" &&
      ownQuery.data.data.accessEmail?.trim().toLowerCase() === email
      ? ownQuery.data.data
      : undefined;
    const match = email
      ? directory.find(record => (record.accessEmail ?? "").trim().toLowerCase() === email) ?? ownMatch
      : undefined;

    let role: EmployeeRole = "VIEWER";
    let status: EmployeeStatus = "INVITED";
    let employeeId = email ? `cf:${email}` : (identity.id ?? "cf:unknown");
    let roleSource: ResolvedEmployee["roleSource"] = "default_viewer";

    if (match) {
      role = isEmployeeRole(match.role) ? match.role : "VIEWER";
      status = isEmployeeStatus(match.status) ? match.status : "INVITED";
      employeeId = match.employeeId;
      roleSource = "directory";
    } else if (email && ownerAllowlist().includes(email)) {
      role = "OWNER";
      status = "ACTIVE";
      roleSource = "owner_allowlist";
    }

    // المدعوّون الذين لم يُفعّلوا بعد والموقوفون/المعطّلون: صفر صلاحيات.
    if (status === "INVITED" || status === "SUSPENDED" || status === "DISABLED") {
      // يبقى الدور معروفًا للعرض لكن principal غير ACTIVE فلا صلاحيات.
    }

    const principal: Principal = {
      domain: "EMPLOYEE",
      role,
      status,
      id: employeeId,
    };

    const activeOwnersInDirectory = directory.filter(
      record => record.role === "OWNER" && record.status === "ACTIVE"
    ).length;
    const activeOwnerCount = Math.max(role === "OWNER" && status === "ACTIVE" ? 1 : 0, activeOwnersInDirectory);

    const resolved: ResolvedEmployee = {
      principal,
      role,
      status,
      fullName: match?.fullName || identity.name || email || "موظف معتمد",
      email,
      employeeId,
      roleSource,
    };

    return {
      cloudflare: identity,
      resolved,
      principal,
      directory,
      directoryStatus,
      activeOwnerCount,
      can: permission => canPermission(principal, permission),
      permissions: permissionsOf(principal),
      actor: {
        id: employeeId,
        name: resolved.fullName,
      },
    };
  }, [employeesQuery.data, ownQuery.data, identity]);

  return (
    <AdminIdentityContext.Provider value={value}>{children}</AdminIdentityContext.Provider>
  );
}

export function useAdminIdentity(): AdminIdentityContextValue {
  const context = useContext(AdminIdentityContext);
  if (!context) {
    throw new Error("useAdminIdentity must be used inside AdminIdentityProvider");
  }
  return context;
}

export function useCan(): (permission: Permission) => boolean {
  return useAdminIdentity().can;
}
