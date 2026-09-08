export type Announcement = {
  id: string;
  message: string;
  href?: string;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
};

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "catalog", message: "تشكيلات لعب أطفال جديدة بتتضاف للكتالوج باستمرار", href: "/products", active: true },
  { id: "whatsapp", message: "للسعر والتوفر: استفسر مباشرة عبر واتساب", active: true },
];

export function activeAnnouncements(items: Announcement[], now = new Date()): Announcement[] {
  const time = now.getTime();
  return items.filter(item => {
    if (!item.active || !item.message.trim()) return false;
    const starts = item.startsAt ? Date.parse(item.startsAt) : Number.NEGATIVE_INFINITY;
    const ends = item.endsAt ? Date.parse(item.endsAt) : Number.POSITIVE_INFINITY;
    return !Number.isNaN(starts) && !Number.isNaN(ends) && starts <= time && time <= ends;
  });
}
