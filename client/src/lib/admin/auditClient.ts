/**
 * عميل سجل التدقيق:
 * - القراءة عبر readAuditLog() من Admin Runtime.
 * - الكتابة fire-and-forget عبر postAdminAction("audit_append").
 * - لا يعتمد على Make، ولا يخزن OTP أو أسرار في المتصفح.
 */
import {
  buildAuditEvent,
  type AuditAction,
  type AuditEvent,
  type AuditTargetType,
} from "@shared/audit";
import { postAdminAction } from "@/lib/admin/adminGateway";

export type AuditActor = { id: string; name: string };

export function emitAudit(
  actor: AuditActor,
  fields: {
    action: AuditAction;
    targetType: AuditTargetType;
    targetId: string;
    targetName?: string | null;
    metadata?: Record<string, unknown>;
  }
): AuditEvent {
  const event = buildAuditEvent({
    actorId: actor.id,
    actorName: actor.name,
    action: fields.action,
    targetType: fields.targetType,
    targetId: fields.targetId,
    targetName: fields.targetName,
    metadata: fields.metadata,
  });

  void postAdminAction("audit_append", {
    event_id: event.id,
    event_at: event.occurredAt,
    event_name: "admin_audit",
    audit_action: event.action,
    actor_id: event.actorId,
    actor_name: event.actorName,
    target_type: event.targetType,
    target_id: event.targetId,
    target_name: event.targetName ?? "",
    metadata_json: JSON.stringify(event.metadata ?? {}),
  }).catch(() => undefined);

  return event;
}