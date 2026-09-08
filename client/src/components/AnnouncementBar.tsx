import { Megaphone, Pause } from "lucide-react";
import { useState } from "react";
import { activeAnnouncements, ANNOUNCEMENTS } from "@/lib/announcements";

export default function AnnouncementBar() {
  const [paused, setPaused] = useState(false);
  const items = activeAnnouncements(ANNOUNCEMENTS);
  if (!items.length) return null;

  return (
    <aside aria-label="مستجدات المتجر" className="border-b border-brand-blue/20 bg-brand-navy text-white">
      <div className="container flex min-h-10 items-center gap-3 overflow-hidden py-2 text-xs font-bold sm:text-sm">
        <Megaphone size={16} className="shrink-0 text-brand-yellow" aria-hidden="true" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className={`flex w-max items-center gap-10 motion-reduce:transform-none ${paused ? "" : "animate-[marquee_16s_linear_infinite] motion-reduce:animate-none"}`}>
            {[...items, ...items].map((item, index) => item.href ? (
              <a key={`${item.id}-${index}`} href={item.href} className="whitespace-nowrap hover:text-brand-yellow">{item.message}</a>
            ) : <span key={`${item.id}-${index}`} className="whitespace-nowrap">{item.message}</span>)}
          </div>
        </div>
        <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? "تشغيل حركة المستجدات" : "إيقاف حركة المستجدات"} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 hover:bg-white/10">
          <Pause size={14} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
