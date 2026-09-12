import { useEffect, useRef, type RefObject } from "react";
import { getFocusableElements, isTopModal, registerModal, unregisterModal } from "@/lib/a11y";

/**
 * Modal focus containment (WCAG 2.2 AA — 2.1.2 No Keyboard Trap, 2.4.3 Focus Order).
 *
 * - Tab / Shift+Tab wrap inside the surface instead of leaking to the page behind it.
 * - Escape is delegated to the top-most open surface only, so a nested lightbox
 *   closes before the dialog that contains it.
 * - Only Tab and Escape are intercepted; every other key keeps native behaviour.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void
): void {
  /* Held in a ref so a new callback identity never re-registers the surface:
     re-registering would push a background dialog back on top of a nested one. */
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    registerModal(container);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal(container)) return;

      if (event.key === "Escape") {
        if (event.defaultPrevented || !onEscapeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab" || event.defaultPrevented) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!current || current === container || !container.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unregisterModal(container);
    };
  }, [active, containerRef]);
}
