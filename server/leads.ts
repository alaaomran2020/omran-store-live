import { randomBytes, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { Express, NextFunction, Request, Response } from "express";
import { ORDER_STATUSES, orderItems, orders } from "../drizzle/schema";
import {
  audit,
  hasPermission,
  resolveSession,
  sameOriginOrXhr,
} from "./adminAuth";
import { getStore, type AdminRecord } from "./adminStore";
import { getDb } from "./db";

type LeadAdminRequest = Request & {
  leadAdmin?: AdminRecord;
};

export type LeadCreateInput = {
  customerName: string;
  phone: string;
  source: string;
  notes: string | null;
  productId: string | null;
  productName: string | null;
  quantity: number;
  unitPrice: number | null;
  utm: Record<string, string> | null;
};

const jsonError = (res: Response, status: number, error: string, extra: Record<string, unknown> = {}) =>
  res.status(status).json({ error, ...extra });

const cleanText = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const normalizeLeadPhone = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  let normalized = value.trim().replace(/[\s()-]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (!/^\+?\d{7,15}$/.test(normalized)) return null;
  return normalized;
};

const normalizeUtm = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = cleanText(input[key], 160);
    if (v) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
};

/**
 * Validate the public lead payload before any database access.
 * The endpoint intentionally accepts both `name` and `customerName`, and both
 * `message` and `notes`, so the storefront can evolve without silently
 * breaking the production contract.
 */
export function parseLeadCreateInput(body: unknown):
  | { ok: true; value: LeadCreateInput }
  | { ok: false; fields: Record<string, string> } {
  const input = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};

  const customerName = cleanText(input.customerName ?? input.name, 120);
  const phone = normalizeLeadPhone(input.phone);
  const source = cleanText(input.source, 40) || "website";
  const notes = cleanText(input.notes ?? input.message, 2000) || null;
  const productId = cleanText(input.productId ?? input.product_id, 64) || null;
  const productName = cleanText(input.productName ?? input.product_name, 240) || null;

  const rawQuantity = Number(input.quantity ?? 1);
  const quantity = Number.isInteger(rawQuantity) && rawQuantity >= 1 && rawQuantity <= 99
    ? rawQuantity
    : 1;

  const rawUnitPrice = input.unitPrice ?? input.unit_price;
  const parsedPrice = rawUnitPrice == null || rawUnitPrice === "" ? null : Number(rawUnitPrice);
  const unitPrice = parsedPrice != null && Number.isFinite(parsedPrice) && parsedPrice >= 0
    ? parsedPrice
    : null;

  const fields: Record<string, string> = {};
  if (!customerName) fields.customerName = "required";
  if (!phone) fields.phone = "invalid";
  if (source.length > 40) fields.source = "too_long";

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  return {
    ok: true,
    value: {
      customerName,
      phone: phone!,
      source,
      notes,
      productId,
      productName,
      quantity,
      unitPrice,
      utm: normalizeUtm(input.utm),
    },
  };
}

function newOrderNumber(): string {
  return `OMR-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

async function requireLeadAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const resolved = await resolveSession(getStore(), req);
    if (!resolved) {
      jsonError(res, 401, "unauthorized");
      return;
    }
    const canRead =
      resolved.admin.role === "super_admin" ||
      hasPermission(resolved.admin, "leads.read") ||
      hasPermission(resolved.admin, "leads.manage");
    if (!canRead) {
      jsonError(res, 403, "forbidden");
      return;
    }
    (req as LeadAdminRequest).leadAdmin = resolved.admin;
    next();
  } catch (error) {
    console.error("[leads] auth error:", error);
    jsonError(res, 500, "internal_error");
  }
}

function requireLeadWrite(req: Request, res: Response, next: NextFunction) {
  const admin = (req as LeadAdminRequest).leadAdmin;
  if (!admin) {
    jsonError(res, 401, "unauthorized");
    return;
  }
  const canWrite = admin.role === "super_admin" || hasPermission(admin, "leads.manage");
  if (!canWrite) {
    jsonError(res, 403, "forbidden");
    return;
  }
  if (!sameOriginOrXhr(req)) {
    jsonError(res, 403, "cross_origin_forbidden");
    return;
  }
  next();
}

export function registerLeadsRoutes(app: Express) {
  /** Public lead capture. Always JSON; validation happens before DB access. */
  app.post("/api/leads", async (req, res) => {
    const parsed = parseLeadCreateInput(req.body);
    if (!parsed.ok) {
      jsonError(res, 422, "validation_error", { fields: parsed.fields });
      return;
    }

    const db = await getDb();
    if (!db) {
      jsonError(res, 503, "database_unavailable");
      return;
    }

    const leadId = randomUUID();
    const orderNumber = newOrderNumber();
    const createdAt = new Date();

    try {
      await db.transaction(async tx => {
        await tx.insert(orders).values({
          id: leadId,
          orderNumber,
          customerName: parsed.value.customerName,
          phone: parsed.value.phone,
          source: parsed.value.source,
          utm: parsed.value.utm,
          status: "new",
          paymentStatus: "pending",
          total: parsed.value.unitPrice == null
            ? null
            : String(parsed.value.unitPrice * parsed.value.quantity),
          notes: parsed.value.notes,
          createdBy: null,
          createdAt,
          updatedAt: createdAt,
        });

        if (parsed.value.productId || parsed.value.productName) {
          await tx.insert(orderItems).values({
            id: randomUUID(),
            orderId: leadId,
            productId: parsed.value.productId,
            nameSnapshot: parsed.value.productName || parsed.value.productId || "استفسار منتج",
            quantity: parsed.value.quantity,
            unitPrice: parsed.value.unitPrice == null ? null : String(parsed.value.unitPrice),
            createdAt,
          });
        }
      });

      res.status(201).json({
        ok: true,
        lead: {
          id: leadId,
          reference: orderNumber,
          status: "new",
          createdAt: createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("[leads] create failed:", error);
      jsonError(res, 500, "internal_error");
    }
  });

  /** Admin list. Auth is resolved before touching the leads database query. */
  app.get("/api/leads", requireLeadAdmin, async (req, res) => {
    const db = await getDb();
    if (!db) {
      jsonError(res, 503, "database_unavailable");
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    try {
      const rows = await db
        .select({
          id: orders.id,
          reference: orders.orderNumber,
          customerName: orders.customerName,
          phone: orders.phone,
          source: orders.source,
          utm: orders.utm,
          status: orders.status,
          notes: orders.notes,
          total: orders.total,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      res.set("Cache-Control", "no-store");
      res.json({
        leads: rows.map(row => ({
          ...row,
          total: row.total == null ? null : Number(row.total),
        })),
        limit,
        offset,
      });
    } catch (error) {
      console.error("[leads] list failed:", error);
      jsonError(res, 500, "internal_error");
    }
  });

  /** Admin lead management: status and notes only. */
  app.patch("/api/leads/:id", requireLeadAdmin, requireLeadWrite, async (req, res) => {
    const input = req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};

    const status = typeof input.status === "string" ? input.status.trim() : "";
    const notesPresent = Object.prototype.hasOwnProperty.call(input, "notes");
    const notes = notesPresent ? cleanText(input.notes, 2000) || null : undefined;

    if (status && !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      jsonError(res, 422, "validation_error", { fields: { status: "invalid" } });
      return;
    }
    if (!status && !notesPresent) {
      jsonError(res, 400, "no_changes");
      return;
    }

    const db = await getDb();
    if (!db) {
      jsonError(res, 503, "database_unavailable");
      return;
    }

    try {
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (notesPresent) updates.notes = notes;
      updates.updatedAt = new Date();

      await db.update(orders).set(updates).where(eq(orders.id, req.params.id));
      const rows = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
      if (rows.length === 0) {
        jsonError(res, 404, "lead_not_found");
        return;
      }

      const admin = (req as LeadAdminRequest).leadAdmin!;
      await audit(getStore(), {
        admin,
        action: "lead.update",
        entityType: "lead",
        entityId: req.params.id,
        detail: { fields: Object.keys(updates).filter(key => key !== "updatedAt") },
        req,
      });

      const row = rows[0];
      res.json({
        ok: true,
        lead: {
          ...row,
          reference: row.orderNumber,
          total: row.total == null ? null : Number(row.total),
        },
      });
    } catch (error) {
      console.error("[leads] update failed:", error);
      jsonError(res, 500, "internal_error");
    }
  });
}
