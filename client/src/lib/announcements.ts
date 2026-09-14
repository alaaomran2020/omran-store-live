import {
  STORE_ANNOUNCEMENTS,
  type StoreAnnouncement,
} from "@shared/storeContent";

export type Announcement = StoreAnnouncement;

/**
 * المصدر المرجعي لشريط المستجدات أصبح shared/storeContent.ts حتى تديره لوحة
 * الإدارة من مصدر واحد. يبقى هذا الملف توافقًا للمكوّنات الحالية.
 */
export const ANNOUNCEMENTS: Announcement[] = STORE_ANNOUNCEMENTS;

export function activeAnnouncements(items: Announcement[], now = new Date()): Announcement[] {
  const time = now.getTime();
  return items.filter(item => {
    if (!item.active || !item.message.trim()) return false;
    const starts = item.startsAt ? Date.parse(item.startsAt) : Number.NEGATIVE_INFINITY;
    const ends = item.endsAt ? Date.parse(item.endsAt) : Number.POSITIVE_INFINITY;
    return !Number.isNaN(starts) && !Number.isNaN(ends) && starts <= time && time <= ends;
  });
}
