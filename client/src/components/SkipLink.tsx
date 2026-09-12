import { MAIN_CONTENT_ID } from "@/lib/a11y";

/**
 * "تخطَّ إلى المحتوى الرئيسي" — first stop in the tab order on every page
 * (WCAG 2.2 AA — 2.4.1 Bypass Blocks).
 *
 * Hidden until focused, so it never shifts the layout, and it works in RTL
 * because it is positioned with logical inset properties.
 */
export function SkipLink({ targetId = MAIN_CONTENT_ID }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      data-testid="skip-link"
      onClick={event => {
        const target = document.getElementById(targetId);
        if (!target) return;
        event.preventDefault();
        target.focus();
        target.scrollIntoView?.({ block: "start" });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-xl focus:bg-brand-navy focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-brand-yellow"
    >
      تخطَّ إلى المحتوى الرئيسي
    </a>
  );
}

export default SkipLink;
