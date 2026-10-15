import { Megaphone } from "lucide-react";
import { activeAnnouncements, ANNOUNCEMENTS } from "@/lib/announcements";

export default function AnnouncementBar() {
  const items = activeAnnouncements(ANNOUNCEMENTS);
  if (!items.length) return null;

  return (
    <aside aria-label="مستجدات المتجر" className="overflow-hidden border-b border-brand-blue/20 bg-brand-navy text-white">
      <div className="container flex min-h-10 items-center gap-2 overflow-hidden py-2 text-xs font-bold sm:gap-3 sm:text-sm">
        <Megaphone size={16} className="shrink-0 text-brand-yellow" aria-hidden="true" />

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {items.map(item => {
              return item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  className="whitespace-nowrap hover:text-brand-yellow"
                >
                  {item.message}
                </a>
              ) : (
                <span key={item.id} className="whitespace-nowrap">
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