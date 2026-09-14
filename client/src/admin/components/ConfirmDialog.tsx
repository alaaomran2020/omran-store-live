import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminButton } from "./primitives";

/**
 * حوار تأكيد بسيط للقرارات المدمّرة/الحساسة (نشر/سحب/تعطيل).
 * مبني بعناصر HTML دلالية + trap تركيز أساسي بلا مكتبات إضافية، ويُغلق
 * بـEscape. الاستخدام: عرض شرطي من الصفحة.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-brand-ink/45 p-4 backdrop-blur-[1px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? "confirm-desc" : undefined}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone === "danger" ? "bg-red-50 text-brand-red" : "bg-emerald-50 text-brand-success"}`}>
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-base font-black text-brand-ink">
              {title}
            </h2>
            {description ? (
              <p id="confirm-desc" className="mt-1.5 text-sm leading-6 text-brand-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AdminButton variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </AdminButton>
          <AdminButton
            ref={confirmRef}
            variant={tone === "danger" ? "danger" : "success"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
