import { Megaphone } from "lucide-react";
import { activeAnnouncements, ANNOUNCEMENTS } from "@/lib/announcements";

export default function AnnouncementBar() {
  const items = activeAnnouncements(ANNOUNCEMENTS);
  if (!items.length) return null;

  const firstItem = items[0];

  return (
    <aside aria-label="مستجدات المتجر" className="overflow-hidden border-b border-brand-blue/20 bg-brand-navy text-white">
      <div className="container flex min-h-10 items-center gap-2 overflow-hidden py-2 text-xs font-bold sm:gap-3 sm:text-sm">
        <Megaphone size={16} className="shrink-0 text-brand-yellow" aria-hidden="true" />

        <div className="min-w-0 flex-1 sm:hidden">
          {firstItem.href ? (
            <a href={firstItem.href} className="block truncate hover:text-brand-yellow">
              {firstItem.message}
            </a>
          ) : (
            <span className="block truncate">{firstItem.message}</span>
          )}
        </div>

        <div className="hidden min-w-0 flex-1 overflow-hidden sm:block">
          <div className="flex w-max items-center gap-10 animate-[marquee_16s_linear_infinite] motion-reduce:transform-none motion-reduce:animate-none">
            {[...items, ...items].map((item, index) => {
              const isLoopCopy = index >= items.length;
              return item.href ? (
                <a
                  key={`${item.id}-${index}`}
                  href={item.href}
                  aria-hidden={isLoopCopy || undefined}
                  tabIndex={isLoopCopy ? -1 : undefined}
                  className="whitespace-nowrap hover:text-brand-yellow"
                >
                  {item.message}
                </a>
              ) : (
                <span key={`${item.id}-${index}`} aria-hidden={isLoopCopy || undefined} className="whitespace-nowrap">
                  {item.message}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}