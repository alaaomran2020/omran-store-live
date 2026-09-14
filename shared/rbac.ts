/**
 * OMRAN TOYS — صلاحيات الوصول المركزية (RBAC) لموظفي لوحة الإدارة.
 *
 * القواعد:
 *   1. هذه الوحدة هي المرجع الوحيد للأدوار والصلاحيات — لا فحوصات أدوار
 *      مبعثرة في الواجهة. الاستخدام دائمًا عبر `can(employee, permission)`.
 *   2. العميل (CUSTOMER) domain منفصل تمامًا: لا يحمل أي صلاحية إدارية إطلاقًا.
 *   3. فحوصات الواجهة للعرض فقط؛ التنفيذ الإلزامي يجب أن يكون في طبقة الكتابة
 *      (بوابة التشغيل/الخادم) — إخفاء الأزرار ليس أمانًا.
 *   4. الموظف الموقوف/المعطّل بلا أي صلاحيات (fail-closed).
 *   5. المالك الأخير محمي: لا يمكن تعطيله أو إنزال دوره.
 */

// ---------------------------------------------------------------------------
// الأدوار
// ---------------------------------------------------------------------------

export const EMPLOYEE_ROLES = [
  "OWNER",
  "ADMIN",
  "CATALOG_MANAGER",
  "INVENTORY_STAFF",
  "CONTENT_EDITOR",
  "VIEWER",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const EMPLOYEE_STATUSES = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const ROLE_LABELS_AR: Record<EmployeeRole, string> = {
  OWNER: "مالك",
  ADMIN: "مدير",
  CATALOG_MANAGER: "مسؤول الكتالوج",
  INVENTORY_STAFF: "موظف مخزون",
  CONTENT_EDITOR: "محرر محتوى",
  VIEWER: "مشاهد",
};

export const ROLE_DESCRIPTIONS_AR: Record<EmployeeRole, string> = {
  OWNER: "وصول كامل لكل شيء، بما في ذلك تعيين الملاك وإدارة المديرين.",
  ADMIN: "إدارة المنتجات والمحتوى والمخزون والموظفين، دون تعيين دور المالك.",
  CATALOG_MANAGER: "المنتجات والأقسام وحالات النشر ومراجعة الجودة فقط.",
  INVENTORY_STAFF: "عرض الكتالوج وتحديث حالة/كميات المخزون فقط.",
  CONTENT_EDITOR: "عرض الكتالوج وتحرير المحتوى التسويقي فقط.",
  VIEWER: "قراءة فقط لكل شاشات الإدارة بلا أي تعديل.",
};

// ---------------------------------------------------------------------------
// الصلاحيات
// ---------------------------------------------------------------------------

export const PERMISSIONS = [
  "dashboard:view",
  "product:view",
  "product:create",
  "product:update",
  "product:publish",
  "product:archive",
  "category:view",
  "category:create",
  "category:update",
  "category:reorder",
  "inventory:view",
  "inventory:update",
  "content:view",
  "content:update",
  "quality:view",
  "quality:update",
  "analytics:view",
  "whatsapp:view",
  "customer:view",
  "user:view",
  "user:create",
  "user:update",
  "user:disable",
  "user:role:update",
  "audit:view",
  "settings:view",
  "settings:update",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** كل صلاحيات القراءة — تُمنح لأي دور إداري نشط. */
const VIEW_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "product:view",
  "category:view",
  "inventory:view",
  "content:view",
  "quality:view",
  "analytics:view",
  "whatsapp:view",
  "customer:view",
  "user:view",
  "audit:view",
  "settings:view",
];

const CATALOG_PERMISSIONS: Permission[] = [
  ...VIEW_PERMISSIONS,
  "product:create",
  "product:update",
  "product:publish",
  "product:archive",
  "category:create",
  "category:update",
  "category:reorder",
  "quality:update",
];

const ROLE_PERMISSIONS: Record<EmployeeRole, readonly Permission[]> = {
  VIEWER: VIEW_PERMISSIONS,
  CONTENT_EDITOR: [...VIEW_PERMISSIONS, "content:update"],
  INVENTORY_STAFF: [...VIEW_PERMISSIONS, "inventory:update"],
  CATALOG_MANAGER: CATALOG_PERMISSIONS,
  ADMIN: [
    ...new Set<Permission>([
      ...CATALOG_PERMISSIONS,
      "content:update",
      "inventory:update",
      "user:create",
      "user:update",
      "user:disable",
      "user:role:update",
      "settings:update",
    ]),
  ],
  OWNER: PERMISSIONS,
};

// ---------------------------------------------------------------------------
// الهوية (شكل مصغّر — الأنوات الكاملة في shared/identity.ts)
// ---------------------------------------------------------------------------

export type RolePrincipal = {
  domain: "EMPLOYEE";
  role: EmployeeRole;
  status: EmployeeStatus;
  id?: string;
};

export type CustomerPrincipal = {
  domain: "CUSTOMER";
  status?: string;
};

export type Principal = RolePrincipal | CustomerPrincipal;

export function rolePermissions(role: EmployeeRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * القرار المركزي للصلاحيات.
 * - العميل (CUSTOMER): مرفوض دائمًا في أي صلاحية إدارية.
 * - موظف غير ACTIVE: مرفوض دائمًا (fail-closed حتى لصلاحيات القراءة).
 */
export function can(principal: Principal | null | undefined, permission: Permission): boolean {
  if (!principal || principal.domain !== "EMPLOYEE") return false;
  if (principal.status !== "ACTIVE") return false;
  return rolePermissions(principal.role).includes(permission);
}

/** يُرجع كل صلاحيات principal الفعلية (مصفوفة فارغة لأي حالة غير نشطة). */
export function permissionsOf(principal: Principal | null | undefined): Permission[] {
  if (!principal || principal.domain !== "EMPLOYEE") return [];
  if (principal.status !== "ACTIVE") return [];
  return [...rolePermissions(principal.role)];
}

// ---------------------------------------------------------------------------
// حماية المالك
// ---------------------------------------------------------------------------

export type RoleAssignmentContext = {
  /** عدد الملاك النشطين حاليًا في النظام (لقراءة البوابة من مصدر الموظفين). */
  activeOwnerCount: number;
};

/** هل يسمح لـ actor بتعيين دور newRole لموظف؟ فقط المالك يُعيّن مالكًا. */
export function canAssignRole(
  actor: Principal | null | undefined,
  newRole: EmployeeRole
): boolean {
  if (!can(actor, "user:role:update")) return false;
  if (newRole === "OWNER" && actor?.domain === "EMPLOYEE" && actor.role !== "OWNER") {
    return false;
  }
  return true;
}

/** هل يمكن تغيير دور هدف؟ المالك لا يُنزَّل إلا بقرار مالك، والمالك الأخير محمي. */
export function canChangeUserRole(
  actor: Principal | null | undefined,
  target: { id?: string; role: EmployeeRole; status: EmployeeStatus },
  newRole: EmployeeRole,
  ctx: RoleAssignmentContext
): boolean {
  if (!can(actor, "user:role:update")) return false;
  if (newRole === target.role) return false;
  if (actor?.domain !== "EMPLOYEE") return false;
  // لا يغيّر المرء دوره نفسه عبر هذه البوابة (مسار منفصل موثّق).
  if (actor.id && target.id && actor.id === target.id) {
    return false;
  }
  if (newRole === "OWNER" && actor.role !== "OWNER") {
    return false;
  }
  // إنزال المالك الأخير ممنوع منعًا لقفل المنشأة.
  if (
    target.role === "OWNER" &&
    target.status === "ACTIVE" &&
    newRole !== "OWNER" &&
    ctx.activeOwnerCount <= 1
  ) {
    return false;
  }
  return true;
}

/** هل يمكن تعطيل/إيقاف موظف؟ المالك الأخيف لا يُعطَّل، والنفس لا تُعطَّل هنا. */
export function canDisableUser(
  actor: Principal | null | undefined,
  target: { id?: string; role: EmployeeRole; status: EmployeeStatus },
  ctx: RoleAssignmentContext
): boolean {
  if (!can(actor, "user:disable")) return false;
  if (actor?.domain !== "EMPLOYEE") return false;
  if (actor.id && target.id && actor.id === target.id) {
    return false;
  }
  if (target.role === "OWNER" && target.status === "ACTIVE" && ctx.activeOwnerCount <= 1) {
    return false;
  }
  return true;
}

export function canReactivateUser(
  actor: Principal | null | undefined,
  target: { role: EmployeeRole; status: EmployeeStatus }
): boolean {
  if (!can(actor, "user:update")) return false;
  return target.status === "SUSPENDED" || target.status === "DISABLED";
}

/** تسميات الصلاحيات بالعربية (للعرض في شاشات المستخدمين/الإعدادات). */
export const PERMISSION_LABELS_AR: Record<Permission, string> = {
  "dashboard:view": "عرض لوحة التحكم",
  "product:view": "عرض المنتجات",
  "product:create": "إضافة منتج",
  "product:update": "تعديل المنتجات",
  "product:publish": "نشر/سحب المنتجات",
  "product:archive": "أرشفة المنتجات",
  "category:view": "عرض الأقسام",
  "category:create": "إضافة أقسام",
  "category:update": "تعديل الأقسام",
  "category:reorder": "إعادة ترتيب الأقسام",
  "inventory:view": "عرض المخزون",
  "inventory:update": "تحديث المخزون",
  "content:view": "عرض المحتوى",
  "content:update": "تعديل المحتوى",
  "quality:view": "عرض مركز الجودة",
  "quality:update": "تحديث حالات الجودة",
  "analytics:view": "عرض التحليلات",
  "whatsapp:view": "عرض أداء واتساب",
  "customer:view": "عرض العملاء",
  "user:view": "عرض الموظفين",
  "user:create": "إضافة موظف",
  "user:update": "تعديل الموظفين",
  "user:disable": "إيقاف/تعطيل الموظفين",
  "user:role:update": "تغيير أدوار الموظفين",
  "audit:view": "عرض سجل التدقيق",
  "settings:view": "عرض الإعدادات",
  "settings:update": "تعديل الإعدادات",
};
