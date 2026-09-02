/**
 * server/adminStore.ts — طبقة تخزين لوحة الإدارة بديلين:
 *
 *  1) MySQL عبر Drizzle (الإنتاج): نفس جداول drizzle/schema.ts.
 *  2) في الذاكرة (تطوير/معاينة بلا DATABASE_URL): تطبيق كامل بمجموعة
 *     Map، مع حساب مدير مبدئي يُزرع من متغيرات ADMIN_* البيئية حتى
 *     يمكن اختبار دورة الدخول كاملة محليًا دون قاعدة بيانات.
 *
 * الواجهة موحّدة — بقية الكود لا يعرف أي بديل يعمل.
 */

import {
  and,
  desc,
  eq,
  gt,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import type { Express } from "express";
import {
  adminAuditLog,
  adminAuthChallenges,
  adminSessions,
  adminUsers,
  productOverrides,
} from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

// ============================ الأنواع ============================

export type AdminRecord = {
  id: string;
  phone: string;
  fullName: string;
  role: "super_admin" | "limited_admin";
  permissions: string[];
  isActive: boolean;
};

export type ChallengeRecord = {
  id: string;
  adminId: string;
  phone: string;
  codeHash: string;
  linkTokenHash: string | null;
  channel: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  deliveryStatus: string;
  messageId: string | null;
  createdAt: Date;
};

export type SessionRecord = {
  id: string;
  adminId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipHash: string | null;
};

export type AuditRecord = {
  id: string;
  adminId: string | null;
  adminPhone: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  outcome: "ok" | "denied" | "error";
  detail: unknown;
  ipHash: string | null;
  createdAt: Date;
};

export type OverrideRecord = {
  productId: string;
  name: string | null;
  price: number | null;
  description: string | null;
  image: string | null;
  active: boolean | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export interface AdminStore {
  findAdminByPhone(phone: string): Promise<AdminRecord | null>;
  createChallenge(c: {
    id: string;
    adminId: string;
    phone: string;
    codeHash: string;
    linkTokenHash: string | null;
    expiresAt: Date;
  }): Promise<void>;
  findActiveChallenge(phone: string): Promise<ChallengeRecord | null>;
  consumeChallenge(id: string): Promise<void>;
  bumpChallengeAttempts(id: string, attempts: number): Promise<void>;
  revokeChallenge(id: string): Promise<void>;
  updateChallengeDeliveryByMessageId(messageId: string, status: string): Promise<void>;
  revokeChallengesForPhone(phone: string): Promise<void>;
  setChallengeMessageId(id: string, messageId: string): Promise<void>;
  createSession(s: {
    id: string;
    adminId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    lastSeenAt: Date;
    revokedAt: Date | null;
    userAgent: string | null;
    ipHash: string | null;
  }): Promise<void>;
  findSessionByTokenHash(
    tokenHash: string
  ): Promise<{ session: SessionRecord; admin: AdminRecord } | null>;
  touchSession(id: string, opts?: { extendTo?: Date }): Promise<void>;
  revokeSession(id: string): Promise<void>;
  markAdminLogin(adminId: string): Promise<void>;
  insertAudit(a: AuditRecord): Promise<void>;
  recentAudit(adminId: string, limit: number): Promise<AuditRecord[]>;
  getOverrides(): Promise<OverrideRecord[]>;
  getOverride(productId: string): Promise<OverrideRecord | null>;
  upsertOverride(o: {
    productId: string;
    name: string | null;
    price: number | null;
    description: string | null;
    image: string | null;
    active: boolean | null;
    updatedBy: string | null;
  }): Promise<void>;
}

export class StoreUnavailableError extends Error {
  constructor() {
    super("database_unavailable");
  }
}

// ============================ MySQL (Drizzle) ============================

async function requireDb() {
  const db = await getDb();
  if (!db) throw new StoreUnavailableError();
  return db;
}

const toAdminRecord = (row: {
  id: string;
  phone: string;
  fullName: string;
  role: "super_admin" | "limited_admin";
  permissions: string[];
  isActive: boolean;
}): AdminRecord => ({
  id: row.id,
  phone: row.phone,
  fullName: row.fullName,
  role: row.role,
  permissions: Array.isArray(row.permissions) ? row.permissions : [],
  isActive: row.isActive,
});

const toOverrideRecord = (row: {
  productId: string;
  name: string | null;
  price: string | number | null;
  description: string | null;
  image: string | null;
  active: boolean | null;
  updatedAt: Date;
  updatedBy: string | null;
}): OverrideRecord => ({
  productId: row.productId,
  name: row.name,
  price: row.price == null ? null : Number(row.price),
  description: row.description,
  image: row.image,
  active: row.active,
  updatedAt: row.updatedAt,
  updatedBy: row.updatedBy,
});

class MySqlAdminStore implements AdminStore {
  async findAdminByPhone(phone: string): Promise<AdminRecord | null> {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.phone, phone))
      .limit(1);
    return rows.length > 0 ? toAdminRecord(rows[0]) : null;
  }

  async createChallenge(c: {
    id: string;
    adminId: string;
    phone: string;
    codeHash: string;
    linkTokenHash: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const db = await requireDb();
    await db.insert(adminAuthChallenges).values({
      id: c.id,
      adminId: c.adminId,
      phone: c.phone,
      codeHash: c.codeHash,
      linkTokenHash: c.linkTokenHash,
      expiresAt: c.expiresAt,
    });
  }

  async findActiveChallenge(phone: string): Promise<ChallengeRecord | null> {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(adminAuthChallenges)
      .where(
        and(
          eq(adminAuthChallenges.phone, phone),
          isNull(adminAuthChallenges.consumedAt),
          isNull(adminAuthChallenges.revokedAt),
          gt(adminAuthChallenges.expiresAt, new Date())
        )
      )
      .orderBy(desc(adminAuthChallenges.createdAt))
      .limit(1);
    return rows.length > 0 ? (rows[0] as unknown as ChallengeRecord) : null;
  }

  async consumeChallenge(id: string): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminAuthChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(adminAuthChallenges.id, id));
  }

  async bumpChallengeAttempts(id: string, attempts: number): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminAuthChallenges)
      .set({ attempts })
      .where(eq(adminAuthChallenges.id, id));
  }

  async revokeChallenge(id: string): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminAuthChallenges)
      .set({ revokedAt: new Date() })
      .where(eq(adminAuthChallenges.id, id));
  }

  async updateChallengeDeliveryByMessageId(
    messageId: string,
    status: string
  ): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminAuthChallenges)
      .set({ deliveryStatus: status })
      .where(eq(adminAuthChallenges.messageId, messageId));
  }

  async revokeChallengesForPhone(phone: string): Promise<void> {
    const db = await requireDb();
    const rows = await db
      .select({ id: adminAuthChallenges.id })
      .from(adminAuthChallenges)
      .where(
        and(
          eq(adminAuthChallenges.phone, phone),
          isNull(adminAuthChallenges.consumedAt),
          isNull(adminAuthChallenges.revokedAt)
        )
      );
    if (rows.length === 0) return;
    await db
      .update(adminAuthChallenges)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(adminAuthChallenges.phone, phone),
          isNull(adminAuthChallenges.consumedAt),
          isNull(adminAuthChallenges.revokedAt)
        )
      );
  }

  async setChallengeMessageId(id: string, messageId: string): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminAuthChallenges)
      .set({ messageId })
      .where(eq(adminAuthChallenges.id, id));
  }

  async createSession(s: {
    id: string;
    adminId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    lastSeenAt: Date;
    revokedAt: Date | null;
    userAgent: string | null;
    ipHash: string | null;
  }): Promise<void> {
    const db = await requireDb();
    await db.insert(adminSessions).values({
      id: s.id,
      adminId: s.adminId,
      tokenHash: s.tokenHash,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      revokedAt: s.revokedAt,
      userAgent: s.userAgent,
      ipHash: s.ipHash,
    });
  }

  async findSessionByTokenHash(
    tokenHash: string
  ): Promise<{ session: SessionRecord; admin: AdminRecord } | null> {
    const db = await requireDb();
    const rows = await db
      .select({
        session: adminSessions,
        admin: adminUsers,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id))
      .where(eq(adminSessions.tokenHash, tokenHash))
      .limit(1);
    if (rows.length === 0) return null;
    const { session, admin } = rows[0];
    return {
      session: session as unknown as SessionRecord,
      admin: toAdminRecord(admin),
    };
  }

  async touchSession(id: string, opts?: { extendTo?: Date }): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminSessions)
      .set({
        lastSeenAt: new Date(),
        ...(opts?.extendTo ? { expiresAt: opts.extendTo } : {}),
      })
      .where(eq(adminSessions.id, id));
  }

  async revokeSession(id: string): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(adminSessions.id, id));
  }

  async markAdminLogin(adminId: string): Promise<void> {
    const db = await requireDb();
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, adminId));
  }

  async insertAudit(a: AuditRecord): Promise<void> {
    const db = await requireDb();
    await db.insert(adminAuditLog).values({
      id: a.id,
      adminId: a.adminId,
      adminPhone: a.adminPhone,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      outcome: a.outcome,
      detail: a.detail,
      ipHash: a.ipHash,
      createdAt: a.createdAt,
    });
  }

  async recentAudit(adminId: string, limit: number): Promise<AuditRecord[]> {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.adminId, adminId))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(Math.min(Math.max(limit, 1), 100));
    return rows as unknown as AuditRecord[];
  }

  async getOverrides(): Promise<OverrideRecord[]> {
    const db = await requireDb();
    const rows = await db.select().from(productOverrides);
    return rows.map(r => toOverrideRecord(r));
  }

  async getOverride(productId: string): Promise<OverrideRecord | null> {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(productOverrides)
      .where(eq(productOverrides.productId, productId))
      .limit(1);
    return rows.length > 0 ? toOverrideRecord(rows[0]) : null;
  }

  async upsertOverride(o: {
    productId: string;
    name: string | null;
    price: number | null;
    description: string | null;
    image: string | null;
    active: boolean | null;
    updatedBy: string | null;
  }): Promise<void> {
    const db = await requireDb();
    const values = {
      productId: o.productId,
      name: o.name,
      price: o.price != null ? String(o.price) : null,
      description: o.description,
      image: o.image,
      active: o.active,
      updatedBy: o.updatedBy,
    };
    await db
      .insert(productOverrides)
      .values(values)
      .onDuplicateKeyUpdate({
        set: {
          name: values.name,
          price: values.price,
          description: values.description,
          image: values.image,
          active: values.active,
          updatedBy: values.updatedBy,
        },
      });
  }
}

// ============================ في الذاكرة (تطوير/معاينة) ============================

type MemorySeed = {
  phone: string;
  fullName: string;
  role: "super_admin" | "limited_admin";
  permissions: string[];
};

export class MemoryAdminStore implements AdminStore {
  private admins = new Map<string, AdminRecord>();
  private challenges = new Map<string, ChallengeRecord>();
  private sessions = new Map<string, SessionRecord>();
  private audits: AuditRecord[] = [];
  private overrides = new Map<string, OverrideRecord>();
  private sessionIndex = new Map<string, string>(); // tokenHash → sessionId

  constructor(seed?: MemorySeed) {
    // زرع حساب المدير من متغيرات البيئة (تطوير/معاينة فقط) أو من بذرة فحص
    const effectiveSeed: MemorySeed | null =
      seed ??
      (ENV.adminPhone
        ? {
            phone: ENV.adminPhone,
            fullName: ENV.adminName || "المالك",
            role: ENV.adminRole === "limited_admin" ? "limited_admin" : "super_admin",
            permissions:
              ENV.adminPermissions.length > 0
                ? ENV.adminPermissions
                : ENV.adminRole === "limited_admin"
                  ? ["products.name", "products.price", "products.description", "products.images"]
                  : ["*"],
          }
        : null);
    if (effectiveSeed) {
      this.admins.set(effectiveSeed.phone, {
        id: "mem-admin-1",
        phone: effectiveSeed.phone,
        fullName: effectiveSeed.fullName,
        role: effectiveSeed.role,
        permissions: effectiveSeed.permissions,
        isActive: true,
      });
    }
  }

  async findAdminByPhone(phone: string): Promise<AdminRecord | null> {
    return this.admins.get(phone) ?? null;
  }

  async createChallenge(c: {
    id: string;
    adminId: string;
    phone: string;
    codeHash: string;
    linkTokenHash: string | null;
    expiresAt: Date;
  }): Promise<void> {
    this.challenges.set(c.id, {
      ...c,
      channel: "whatsapp",
      attempts: 0,
      maxAttempts: 5,
      consumedAt: null,
      revokedAt: null,
      deliveryStatus: "pending",
      messageId: null,
      createdAt: new Date(),
    });
  }

  async findActiveChallenge(phone: string): Promise<ChallengeRecord | null> {
    const active = [...this.challenges.values()]
      .filter(
        c =>
          c.phone === phone &&
          !c.consumedAt &&
          !c.revokedAt &&
          c.expiresAt.getTime() > Date.now()
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return active[0] ?? null;
  }

  async consumeChallenge(id: string): Promise<void> {
    const c = this.challenges.get(id);
    if (c) this.challenges.set(id, { ...c, consumedAt: new Date() });
  }

  async bumpChallengeAttempts(id: string, attempts: number): Promise<void> {
    const c = this.challenges.get(id);
    if (c) this.challenges.set(id, { ...c, attempts });
  }

  async revokeChallenge(id: string): Promise<void> {
    const c = this.challenges.get(id);
    if (c) this.challenges.set(id, { ...c, revokedAt: new Date() });
  }

  async updateChallengeDeliveryByMessageId(
    messageId: string,
    status: string
  ): Promise<void> {
    for (const [id, c] of this.challenges) {
      if (c.messageId === messageId) {
        this.challenges.set(id, { ...c, deliveryStatus: status });
      }
    }
  }

  async revokeChallengesForPhone(phone: string): Promise<void> {
    for (const [id, c] of this.challenges) {
      if (c.phone === phone && !c.consumedAt && !c.revokedAt) {
        this.challenges.set(id, { ...c, revokedAt: new Date() });
      }
    }
  }

  async setChallengeMessageId(id: string, messageId: string): Promise<void> {
    const c = this.challenges.get(id);
    if (c) this.challenges.set(id, { ...c, messageId });
  }

  async createSession(s: {
    id: string;
    adminId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    lastSeenAt: Date;
    revokedAt: Date | null;
    userAgent: string | null;
    ipHash: string | null;
  }): Promise<void> {
    this.sessions.set(s.id, s);
    this.sessionIndex.set(s.tokenHash, s.id);
  }

  async findSessionByTokenHash(
    tokenHash: string
  ): Promise<{ session: SessionRecord; admin: AdminRecord } | null> {
    const sessionId = this.sessionIndex.get(tokenHash);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const admin = [...this.admins.values()].find(a => a.id === session.adminId);
    if (!admin) return null;
    return { session, admin };
  }

  async touchSession(id: string, opts?: { extendTo?: Date }): Promise<void> {
    const s = this.sessions.get(id);
    if (s) {
      this.sessions.set(id, {
        ...s,
        lastSeenAt: new Date(),
        expiresAt: opts?.extendTo ?? s.expiresAt,
      });
    }
  }

  async revokeSession(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (s) this.sessions.set(id, { ...s, revokedAt: new Date() });
  }

  async markAdminLogin(adminId: string): Promise<void> {
    // لا حاجة لتخزين آخر دخول في النسخة الذاكرية
  }

  async insertAudit(a: AuditRecord): Promise<void> {
    this.audits.unshift(a);
    if (this.audits.length > 500) this.audits.length = 500;
  }

  async recentAudit(adminId: string, limit: number): Promise<AuditRecord[]> {
    return this.audits
      .filter(a => a.adminId === adminId)
      .slice(0, Math.min(Math.max(limit, 1), 100));
  }

  async getOverrides(): Promise<OverrideRecord[]> {
    return [...this.overrides.values()];
  }

  async getOverride(productId: string): Promise<OverrideRecord | null> {
    return this.overrides.get(productId) ?? null;
  }

  async upsertOverride(o: {
    productId: string;
    name: string | null;
    price: number | null;
    description: string | null;
    image: string | null;
    active: boolean | null;
    updatedBy: string | null;
  }): Promise<void> {
    this.overrides.set(o.productId, {
      ...o,
      updatedAt: new Date(),
    });
  }
}

// ============================ المختار ============================

let store: AdminStore | null = null;

/**
 * MySQL عند توفر DATABASE_URL (الإنتاج)، والذاكرة بديلاً (تطوير/معاينة).
 * الاختيار يتم مرة واحدة عند أول استخدام.
 */
export function getStore(): AdminStore {
  if (store) return store;
  if (ENV.databaseUrl) {
    store = new MySqlAdminStore();
  } else {
    console.warn(
      "[admin] DATABASE_URL غير مضبوط — استخدام مخزن في الذاكرة (تطوير/معاينة فقط)."
    );
    store = new MemoryAdminStore();
  }
  return store;
}

/** للاختبارات: إعادة تعيين المخزن الذاكري. */
export function resetMemoryStoreForTests(): void {
  store = null;
}

export type AdminRouterContext = { app: Express };
