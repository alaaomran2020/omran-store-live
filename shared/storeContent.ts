/**
 * OMRAN TOYS — سجلّ المحتوى التسويقي القابل للإدارة من لوحة الإدارة.
 *
 * هذا هو المصدر المرجعي للمحتوى الذي تعرضه الواجهة: شريط المستجدات،
 * بيانات التواصل، الفروع، الروابط الرسمية. القيم الحالية منقولة حرفيًا من
 * مكوّنات المتجر المعتمدة (AnnouncementBar / SiteFooter / socialEmbeds) حتى
 * لا يتغير سلوك المتجر.
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
  /** هاتف أرضي للعرض. */
  landline: string | null;
  officialDomain: string;
};

export type StoreSocialLinks = {
  instagram: string;
  facebook: string;
};

export const STORE_CONTACT: StoreContact = {
  whatsapp: "201555570269",
  landline: "20403411149",
  officialDomain: "omrantoys.store",
};

export const STORE_BRANCHES: StoreBranch[] = [
  {
    id: "sayyid-al-badawi",
    name: "فرع السيد البدوي",
    address: "ميدان السيد البدوي، شارع درب الأبشيهي، طنطا.",
    city: "طنطا",
  },
  {
    id: "al-stad",
    name: "فرع الاستاد",
    address: "أمام نادي سيتي كلوب ومطعم سي السيد، طنطا.",
    city: "طنطا",
  },
];

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
