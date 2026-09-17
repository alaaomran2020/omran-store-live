/**
 * عميل سجل التدقيق:
 *  - القراءة عبر readAuditLog() في adminGateway (سجل موثوق من البوابة).
 *  - الكتابة fire-and-forget إلى دفتر الأحداث نفسه الذي يغذي Analytics_Events
 *    عبر Make (event_name=admin_audit). السيناريو يحوّل الحدث لورقة Audit Log.
 *
 * القيم الحساسة تُزال في shared/audit.ts قبل الإرسال، ولا يُرسَل أي OTP/token.
 * إن لم تدعم البوابة الحدث بعد، لا تُختلق سجلات محلية مزيفة — صفحة السجل
 * تعرض حالة "لا بيانات" صادقة.
 */
import {
  buildAuditEvent,
  type AuditAction,
  type AuditEvent,
  type AuditTargetType,
} from "@shared/audit";
import { MAKE_GATEWAY_URL } from "@/lib/makeGateway";

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

  try {
    const body = new URLSearchParams({
      action: "admin_audit",
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
    });
    const encoded = body.toString();
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(
        MAKE_GATEWAY_URL,
        new Blob([encoded], { type: "application/x-www-form-urlencoded;charset=UTF-8" })
      );
      if (sent) return event;
    }
    if (typeof fetch !== "undefined") {
      void fetch(MAKE_GATEWAY_URL, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: encoded,
      }).catch(() => undefined);
    }
  } catch {
    // التدقيق غير الحرج للتنقّل لا يكسر إجراءً إداريًا؛ البوابة اليدوية تبقى قناة موثّقة.
  }

  return event;
}
