/**
 * OMRAN TOYS — التصنيفات والفئات العمرية الموحّدة (نُقلت من المستودع المرجعي
 * `omrantoys-store` بعد التحقق: src/data/categories.js).
 *
 * هذه الوحدة "معجم" مرجعي فقط: لا تغيّر مصدر بيانات المنتجات (Google Sheets)
 * ولا تُخزَّن في قاعدة البيانات — تُستخدم لاحقًا لصفحات التصنيفات ولتطبيع
 * أسماء التصنيفات الواردة من الشيت حتى لا تتفرع تصنيفات مكررة بالخطأ
 * (سيارات / السيارات / سيارات أطفال / العاب سيارات → تصنيف واحد).
 */

export type CategoryVisibility = "visible" | "coming_soon";

export type Category = {
  /** معرّف ثابت (slug إنجليزي) يُستخدم في المسارات المستقبلية /categories/[slug] */
  id: string;
  /** الاسم العربي المعتمد للواجهة */
  name: string;
  nameEn: string;
  slug: string;
  visibility: CategoryVisibility;
  sortOrder: number;
  description: string;
  /** أسماء/صيغ بديلة تُطبع جميعًا على نفس التصنيف (بعد التطبيع) */
  aliases: readonly string[];
};

export type AgeGroup = {
  id: string;
  label: string;
  description: string;
};

/** الترتيب كما ورد في المرجع (الأقسام النشطة أولًا ثم "قريباً"). */
export const CATEGORIES: readonly Category[] = [
  {
    id: "educational",
    name: "تعليمية وذكاء STEM",
    nameEn: "Educational & STEM",
    slug: "educational",
    visibility: "visible",
    sortOrder: 1,
    description:
      "تجارب علمية، روبوتات ذكية، وألغاز لتنمية مهارات التفكير والابتكار",
    aliases: ["ألعاب تعليمية", "تعليمية", "ذكاء", "ستيم", "STEM"],
  },
  {
    id: "building",
    name: "مكعبات وبناء",
    nameEn: "Building & Blocks",
    slug: "building",
    visibility: "visible",
    sortOrder: 2,
    description: "أطقم بناء، ليغو، وهياكل تنمي الخيال والصبر والتركيز",
    aliases: ["مكعبات", "بناء", "ليجو", "ليغو", "بلوكات"],
  },
  {
    id: "rc-electronic",
    name: "تحكم عن بعد وروبوتات",
    nameEn: "RC & Robotics",
    slug: "rc-electronic",
    visibility: "visible",
    sortOrder: 3,
    description: "سيارات دريفت، طائرات درون، وروبوتات تفاعلية تتحدث وتتحرك",
    aliases: [
      "سيارات",
      "السيارات",
      "سيارات أطفال",
      "العاب سيارات",
      "سيارة بالريموت",
      "سيارات بالريموت",
      "تحكم عن بعد",
      "روبوتات",
      "مركبات كهربائية",
      "دبابات",
    ],
  },
  {
    id: "dolls-figures",
    name: "دمى وشخصيات أبطال",
    nameEn: "Dolls & Action Figures",
    slug: "dolls-figures",
    visibility: "visible",
    sortOrder: 4,
    description: "شخصيات أبطال خارقين، دمى لطيفة، وبيوت دمى خيالية",
    aliases: ["دمى", "عرائس", "عروسة", "شخصيات", "مطبخ ألعاب", "ألعاب تقليدية"],
  },
  {
    id: "board-games",
    name: "ألعاب عائلية ولوحية",
    nameEn: "Board Games & Puzzles",
    slug: "board-games",
    visibility: "visible",
    sortOrder: 5,
    description: "أوقات مرح وتنافس وتواصل أسري ممتع لجميع أفراد العائلة",
    aliases: ["ألعاب لوحية", "بازل", "ألغاز", "عائلية"],
  },
  {
    id: "outdoor",
    name: "حركية وخارجية",
    nameEn: "Outdoor & Ride-ons",
    slug: "outdoor",
    visibility: "visible",
    sortOrder: 6,
    description: "سكوترات، سيارات كهربائية، ومعدات رياضية لصحة ونشاط دائم",
    aliases: ["خارجية", "سكوتر", "دراجات", "حركية"],
  },
  {
    id: "infant",
    name: "الرضع والطفولة المبكرة",
    nameEn: "Baby & Toddler",
    slug: "infant",
    visibility: "visible",
    sortOrder: 7,
    description: "ألعاب آمنة 100% خالية من المواد الضارة لتحفيز الحواس والحركة",
    aliases: ["رضع", "أطفال صغار", "مواليد"],
  },
  {
    id: "arts-crafts",
    name: "فنون وإبداع وصلصال",
    nameEn: "Arts & Crafts",
    slug: "arts-crafts",
    visibility: "visible",
    sortOrder: 8,
    description: "ألوان سحرية، صلصال طبيعي، وأدوات تصميم تفجر إبداع طفلك",
    aliases: ["صلصال", "فنون", "إبداع", "اسكوشي", "تسلية"],
  },
  {
    id: "ramadan-lanterns",
    name: "فوانيس رمضان",
    nameEn: "Ramadan Lanterns",
    slug: "ramadan-lanterns",
    visibility: "coming_soon",
    sortOrder: 9,
    description:
      "فوانيس رمضان بأشكال وأحجام متنوعة، إضاءة وأنغام، وزينة كاملة للشهر الكريم",
    aliases: ["فوانيس", "رمضان", "زينة رمضان"],
  },
  {
    id: "seasonal",
    name: "المنتجات الموسمية",
    nameEn: "Seasonal Products",
    slug: "seasonal",
    visibility: "coming_soon",
    sortOrder: 10,
    description:
      "تشكيلات المواسم والأعياد: رمضان، العيد، المدارس، والاحتفالات الخاصة",
    aliases: ["موسمية", "مواسم", "أعياد"],
  },
] as const;

/** الفئات العمرية المعتمدة (من المرجع بعد التحقق). */
export const AGE_GROUPS: readonly AgeGroup[] = [
  { id: "0-2", label: "0 - سنتين (مواليد ورضع)", description: "تطوير حسي وحركي آمن" },
  { id: "3-5", label: "3 - 5 سنوات (ما قبل المدرسة)", description: "خيال، إبداع، واستكشاف" },
  { id: "6-8", label: "6 - 8 سنوات (بداية المدرسة)", description: "مغامرة وتفكير وبناء" },
  { id: "9-12", label: "9 - 12 سنة (مهارات متقدمة)", description: "تحدي، روبوتات، وتنافس" },
  { id: "12+", label: "12+ سنة (مراهقين وكبار)", description: "نماذج معقدة وألعاب ذكاء" },
] as const;

// ---------------------------------------------------------------------------
// تطبيع الأسماء العربية لمنع تفرّع تصنيفات مكررة بالخطأ
// ---------------------------------------------------------------------------

/** يطبّع نصًا عربيًا للمقارنة: تشكيل، همزات، تاء مربوطة، بادئات "ال"، وكلمات حشو. */
export function normalizeCategoryName(raw: string): string {
  let text = (raw ?? "").trim();
  // إزالة التشكيل والهمزات التطبيعية
  text = text.replace(/[\u064b-\u0652\u0670\u0640]/g, "");
  text = text
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
  // توحيد المسافات ثم معالجة كلمة-بكلمة
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  // كلمات حشو تُحذف أينما وردت (بعد تطبيع الأحرف تصبح ألعاب→العاب وهكذا)،
  // مع فصل واو العطف الملتصقة مثل "وألعاب".
  const FILLER = new Set(["العاب", "لعبه", "لعب", "اطفال"]);
  text = words
    .map(word => word.replace(/^و+/, ""))
    .filter(word => word !== "" && !FILLER.has(word))
    // حذف بادئة التعريف "ال" من كل كلمة باقية
    .map(word => (word.startsWith("ال") && word.length > 3 ? word.slice(2) : word))
    .join(" ")
    .trim();
  return text;
}

const slugById = new Map(CATEGORIES.map(category => [category.id, category]));

const aliasIndex: ReadonlyMap<string, Category> = (() => {
  const map = new Map<string, Category>();
  for (const category of CATEGORIES) {
    map.set(normalizeCategoryName(category.name), category);
    map.set(normalizeCategoryName(category.nameEn).toLowerCase(), category);
    for (const alias of category.aliases) {
      map.set(normalizeCategoryName(alias), category);
    }
  }
  return map;
})();

/**
 * يرد التصنيفCanonical المطابق لاسم حر (مثل قيمة عمود category في الشيت)،
 * أو null إن لم يُعرف — عندها يُعرض الاسم كما هو دون اختراع تصنيف.
 */
export function canonicalCategory(raw: string): Category | null {
  const text = (raw ?? "").trim();
  if (text === "") return null;
  const byId = slugById.get(text.toLowerCase());
  if (byId) return byId;
  const bySlug = slugById.get(text);
  if (bySlug) return bySlug;
  return aliasIndex.get(normalizeCategoryName(text)) ?? null;
}

/** التصنيفات الظاهرة فعليًا في الواجهة. */
export const VISIBLE_CATEGORIES = CATEGORIES.filter(
  category => category.visibility === "visible"
);

/** أقسام "قريباً" المعلَن عنها فقط. */
export const COMING_SOON_CATEGORIES = CATEGORIES.filter(
  category => category.visibility === "coming_soon"
);
