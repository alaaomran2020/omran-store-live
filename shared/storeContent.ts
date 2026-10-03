import { OPENING_PROFILE } from "./openingProfile";

/**
 * OMRAN TOYS — سجلّ المحتوى التسويقي القابل للإدارة من لوحة الإدارة.
 *
 * هذا هو المصدر المرجعي للمحتوى الذي تعرضه الواجهة: شريط المستجدات،
 * بيانات التواصل، الفروع، الروابط الرسمية. القيم الحالية مشتقة من
 * Opening Data Source of Truth حتى لا تتكرر بيانات الافتتاح في ملفات متعددة.
 *
 * التعديلات الإنتاجية تمر عبر قناة موثّقة (بوابة إجراءات الإدارة أو حزمة
 * تعديل يدوية للشيت/الكود) — لا تُكتب مباشرة في المتصفح.
 */

export type StoreAnnouncement = {
  id: string;
  message: string;
  href?: string;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
};

export type StoreBranch = {
  id: string;
  name: string;
  address: string;
  city: string;
};

export type StoreContact = {
  /** واتساب/موبايل بصيغة دولية بلا + (مثل 201555570269). */
  whatsapp: string;
  whatsappDisplay: string;
  /** هاتف أرضي بصيغة دولية بلا +، للاستخدام في روابط tel. */
  landline: string | null;
  landlineDisplay: string;
  officialDomain: string;
};

export type StoreSocialLinks = {
  instagram: string;
  facebook: string;
};

export const STORE_CONTACT: StoreContact = {
  whatsapp: OPENING_PROFILE.contacts.whatsapp,
  whatsappDisplay: OPENING_PROFILE.contacts.whatsappDisplay,
  landline: OPENING_PROFILE.contacts.landline,
  landlineDisplay: OPENING_PROFILE.contacts.landlineDisplay,
  officialDomain: OPENING_PROFILE.officialDomain,
};

export const STORE_BRANCHES: StoreBranch[] = OPENING_PROFILE.branches.map(
  ({ id, name, address, city }) => ({ id, name, address, city })
);

export const STORE_SOCIAL: StoreSocialLinks = {
  instagram: "https://www.instagram.com/omrantoys.store/",
  facebook:
    "https://www.facebook.com/profile.php?id=61590544803396&locale=ar_AR",
};

export const POPUP_SOCIAL: StoreSocialLinks = {
  instagram: "https://www.instagram.com/popup.gifts_balloons",
  facebook:
    "https://www.facebook.com/profile.php?id=61589179737729",
};

export const STORE_ANNOUNCEMENTS: StoreAnnouncement[] = [
  {
    id: "opening",
    message: `الافتتاح الرسمي يوم ${OPENING_PROFILE.opening.displayDate} — فرع السيد البدوي، طنطا.`,
    href: "#branches",
    active: true,
  },
  {
    id: "catalog",
    message: "تشكيلات لعب أطفال جديدة بتتضاف للكتالوج باستمرار",
    href: "/products",
    active: true,
  },
  { id: "whatsapp", message: "للسعر والتوفر: استفسر مباشرة عبر واتساب", active: true },
];

export type StoreContentSection =
  | "announcements"
  | "contact"
  | "branches"
  | "social"
  | "popup_social";

export const CONTENT_SECTION_LABELS_AR: Record<StoreContentSection, string> = {
  announcements: "شريط المستجدات",
  contact: "التواصل والواتساب",
  branches: "الفروع",
  social: "روابط Omran Toys",
  popup_social: "روابط POP UP",
};
