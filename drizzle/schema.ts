import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===========================================================================
// لوحة إدارة المدراء — مصادقة واتساب OTP + RBAC (server/adminStore.ts)
//
// لا كلمات مرور: الهوية رقم واتساب (E.164) + كود لمرة واحدة.
// لا تُخزَّن الأسرار نصًا أبدًا: OTP/توكن الجلسة تُخزَّن كـ SHA-256 مع
// AUTH_PEPPER. الصلاحيات تُقرأ من قاعدة البيانات مع كل طلب (لا تُحفظ في
// التوكن) حتى يمكن سحب صلاحية موظف فورًا دون انتظار انتهاء جلسته.
// ===========================================================================

/** المدراء وأدوارهم وصلاحياتهم (JSON array). */
export const adminUsers = mysqlTable("admin_users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  /** بصيغة E.164 مثل +201000000002 */
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  fullName: text("full_name").notNull(),
  role: mysqlEnum("role", ["super_admin", "limited_admin"]).default("limited_admin").notNull(),
  /** JSON: ["products.name", ...] أو ["*"] للمدير العام */
  permissions: json("permissions").$type<string[]>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

/** تحديات المصادقة: كود OTP + رابط سحري، مخزّنة كـ hash فقط. */
export const adminAuthChallenges = mysqlTable(
  "auth_challenges",
  {
  id: varchar("id", { length: 36 }).primaryKey(),
  adminId: varchar("admin_id", { length: 36 }).notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  linkTokenHash: varchar("link_token_hash", { length: 64 }),
  channel: varchar("channel", { length: 20 }).default("whatsapp").notNull(),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("max_attempts").default(5).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  revokedAt: timestamp("revoked_at"),
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("pending").notNull(),
  messageId: varchar("message_id", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    index("idx_challenges_phone").on(table.phone, table.createdAt),
    index("idx_challenges_message").on(table.messageId),
  ]
);

/** جلسات المدراء: التوكن الخام في Cookie HttpOnly فقط، والـhash في القاعدة. */
export const adminSessions = mysqlTable("admin_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  adminId: varchar("admin_id", { length: 36 }).notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  userAgent: text("user_agent"),
  /** hash للـIP مع AUTH_PEPPER — للتدقيق لا للتعقب */
  ipHash: varchar("ip_hash", { length: 64 }),
});

/** سجل تدقيق: كل فعل إداري (ناجح أو مرفوض) — يُكتب best-effort. */
export const adminAuditLog = mysqlTable("admin_audit_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  adminId: varchar("admin_id", { length: 36 }),
  adminPhone: varchar("admin_phone", { length: 20 }),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }),
  entityId: varchar("entity_id", { length: 100 }),
  outcome: mysqlEnum("outcome", ["ok", "denied", "error"]).default("ok").notNull(),
  detail: json("detail").$type<unknown>(),
  ipHash: varchar("ip_hash", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    index("idx_audit_admin").on(table.adminId, table.createdAt),
    index("idx_audit_time").on(table.createdAt),
  ]
);

/**
 * تجاوزات المنتجات: تعديلات المدراء فوق كتالوج Google Sheets.
 * الحقل NULL = بلا تعديل (يبقى من الشيت). product_id = عمود id في الشيت.
 */
export const productOverrides = mysqlTable("product_overrides", {
  productId: varchar("product_id", { length: 64 }).primaryKey(),
  name: text("name"),
  price: decimal("price", { precision: 12, scale: 2 }),
  description: text("description"),
  image: text("image"),
  active: boolean("active"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  updatedBy: varchar("updated_by", { length: 36 }),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type AdminChallenge = typeof adminAuthChallenges.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type AdminAuditRow = typeof adminAuditLog.$inferSelect;
export type ProductOverrideRow = typeof productOverrides.$inferSelect;

// TODO: Add your tables here