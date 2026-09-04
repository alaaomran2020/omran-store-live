import type { Product } from "@shared/products";

type SnapshotProduct = Pick<
  Product,
  | "id"
  | "name"
  | "price"
  | "category"
  | "description"
  | "image"
  | "imageSource"
  | "sortOrder"
  | "sourceDriveId"
  | "processedImage"
  | "rowIndex"
>;

/**
 * Last-known-good public catalog snapshot.
 *
 * Live API / edge mirror / published Google Sheet remain authoritative and are
 * attempted first. This snapshot is used only when every live source is
 * unavailable, so a temporary upstream outage never collapses the storefront
 * to an empty catalog.
 *
 * Every row here was visually verified and was PUBLIC in Omran Trading Master
 * Database at snapshot time: active=true + PUBLISHED + PASS.
 */
const verified = (product: SnapshotProduct): Product => ({
  sku: null,
  ...product,
  active: true,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
  reviewReason: null,
});

const driveSource = (id: string) =>
  `https://drive.google.com/uc?export=view&id=${id}`;

export const PUBLIC_PRODUCTS_SNAPSHOT: Product[] = [
  verified({
    id: "OMR-IG-KIT-46",
    name: "مطبخ ألعاب للأطفال — 46 قطعة",
    price: 850,
    category: "ألعاب تمثيل أدوار",
    description:
      "مطبخ أطفال كامل بأدوات وأواني وإكسسوارات كثيرة للعب التخيلي مناسب للبنات والأولاد. تنبيه أمان: يُستخدم تحت إشراف الكبار حسب العمر الموصى به.",
    image: "/products/processed/product-kitchen-46pcs-main.webp",
    imageSource: "/products/processed/product-kitchen-46pcs-main.webp",
    sortOrder: 2,
    sourceDriveId: null,
    processedImage: "/products/processed/product-kitchen-46pcs-main.webp",
    rowIndex: 1,
  }),
  verified({
    id: "OMR-IG-HC-104",
    name: "مطبخ Home Chef للأطفال — 104 قطعة",
    price: 1850,
    category: "ألعاب تمثيل أدوار",
    description:
      "مطبخ لعب واقعي جدًا بإضاءة وأصوات وملحقات كثيرة مناسب للأطفال من 3 سنوات. تنبيه أمان: يُستخدم تحت إشراف الكبار حسب العمر الموصى به.",
    image: "/products/processed/product-home-chef-104pcs-main.webp",
    imageSource: "/products/processed/product-home-chef-104pcs-main.webp",
    sortOrder: 3,
    sourceDriveId: null,
    processedImage: "/products/processed/product-home-chef-104pcs-main.webp",
    rowIndex: 2,
  }),
  verified({
    id: "OMR-IG-SQ-01",
    name: "لعبة الاسكوشي بأشكال وألوان متنوعة",
    price: 275,
    category: "فنون وإبداع",
    description:
      "لعبة ناعمة ولطيفة للتسلية وتفريغ الطاقة تنفع كهدية حلوة للأطفال والكبار. تنبيه أمان: غير مناسبة للأطفال أقل من 3 سنوات لاحتوائها على أجزاء صغيرة.",
    image: "/products/processed/product-ot-00001-main.webp",
    imageSource: "/products/processed/product-ot-00001-main.webp",
    sortOrder: 4,
    sourceDriveId: null,
    processedImage: "/products/processed/product-ot-00001-main.webp",
    rowIndex: 3,
  }),
  verified({
    id: "OMR-RAW-001",
    name: "محلول فقاعات صابون",
    price: null,
    category: "ألعاب خارجية",
    description:
      "محلول فقاعات صابون للأطفال بعبوة 250 مل كما هو ظاهر على العبوة، مناسب لألعاب الفقاعات والأنشطة الخارجية.",
    image: "/products/processed/generated/product-omr-raw-001-main.webp",
    imageSource: driveSource("1dtiEbbptINTXxtQAwpkKpI2fxBAxYbLm"),
    sortOrder: 5,
    sourceDriveId: "1I_QGGoYTxq7zdfd5UgWFReB7MS9Tg36U",
    processedImage:
      "/products/processed/generated/product-omr-raw-001-main.webp",
    rowIndex: 4,
  }),
  verified({
    id: "OMR-RAW-002",
    name: "حقيبة رسم وتلوين زرقاء",
    price: null,
    category: "ألعاب تعليمية وفنية",
    description:
      "حقيبة رسم وتلوين زرقاء تضم مجموعة متنوعة من أقلام التلوين والألوان وأدوات الرسم مرتبة داخل حقيبة.",
    image: "/products/processed/generated/product-omr-raw-002-main.webp",
    imageSource: driveSource("1ORWMwfpwHgF-Usqg1oBvzCx4FIVhj18T"),
    sortOrder: 6,
    sourceDriveId: "1Sdozgd1CS2oAtJcUN-fjIhQzmAq_AuVl",
    processedImage:
      "/products/processed/generated/product-omr-raw-002-main.webp",
    rowIndex: 5,
  }),
  verified({
    id: "OMR-RAW-003",
    name: "حقيبة رسم وتلوين وردية",
    price: null,
    category: "ألعاب تعليمية وفنية",
    description:
      "حقيبة رسم وتلوين وردية تضم مجموعة متنوعة من أقلام التلوين والألوان وأدوات الرسم مرتبة داخل حقيبة.",
    image: "/products/processed/generated/product-omr-raw-003-main.webp",
    imageSource: driveSource("13TDSnLvR07wTBesPQcHb6jTZYtjIxwKT"),
    sortOrder: 7,
    sourceDriveId: "1pM9lcH17V7pCw9l_6_hC4hPrPoDCNZVn",
    processedImage:
      "/products/processed/generated/product-omr-raw-003-main.webp",
    rowIndex: 6,
  }),
  verified({
    id: "OMR-RAW-004",
    name: "بيانو أطفال بشكل كلب",
    price: null,
    category: "ألعاب موسيقية",
    description:
      "بيانو أطفال بتصميم كلب لطيف مع مفاتيح موسيقية وعناصر تفاعلية ظاهرة بالعبوة.",
    image: "/products/processed/generated/product-omr-raw-004-main.webp",
    imageSource: driveSource("1SZxh2FDS3GOpt9RkBDdg9R1Vv0ecI4oZ"),
    sortOrder: 8,
    sourceDriveId: "16HLRBn8l6aRKSTnE17sDyfaZNSFNC-cP",
    processedImage:
      "/products/processed/generated/product-omr-raw-004-main.webp",
    rowIndex: 7,
  }),
  verified({
    id: "OMR-RAW-005",
    name: "Rabbit Piano بيانو أطفال",
    price: null,
    category: "ألعاب موسيقية",
    description:
      "Rabbit Piano للأطفال بتصميم أرنب، يضم مفاتيح موسيقية وعناصر تفاعلية كما هو ظاهر على العبوة.",
    image: "/products/processed/generated/product-omr-raw-005-main.webp",
    imageSource: driveSource("1z_jLgW6E1cOc8TVxImwf8qb7POrcQC8b"),
    sortOrder: 9,
    sourceDriveId: "1YTUycmB_vORBD4n29HkhZoZ1vpxJT29y",
    processedImage:
      "/products/processed/generated/product-omr-raw-005-main.webp",
    rowIndex: 8,
  }),
  verified({
    id: "OMR-RAW-006",
    name: "عروسة مع إكسسوارات",
    price: null,
    category: "عرائس وألعاب بنات",
    description:
      "عروسة أطفال مع مجسم كلب أليف وإكسسوارات لعب ظاهرة داخل العبوة. موضح على العبوة أنها مناسبة لعمر 3 سنوات فأكثر.",
    image: "/products/processed/generated/product-omr-raw-006-main.webp",
    imageSource: driveSource("1WmeT2WM1bICSV4Rjpug56QcKGMErSr1v"),
    sortOrder: 10,
    sourceDriveId: "1o1mToFYNDPH63LW51wpIxPocB-G1U8wz",
    processedImage:
      "/products/processed/generated/product-omr-raw-006-main.webp",
    rowIndex: 9,
  }),
  verified({
    id: "OMR-RAW-007",
    name: "عروسة Beauty مع إكسسوارات",
    price: null,
    category: "عرائس وألعاب بنات",
    description:
      "عروسة Dream Girl بفستان مزخرف مع حقيبة صغيرة كإكسسوار، كما يظهر داخل العبوة. موضح على العبوة أنها مناسبة لعمر 3 سنوات فأكثر.",
    image: "/products/processed/generated/product-omr-raw-007-main.webp",
    imageSource: driveSource("1hPd8kbo1rTHrtBqB8WWP-0VvjQ4YY2Sz"),
    sortOrder: 11,
    sourceDriveId: "1Pj8la4jAnm7DXCSB0YJDAW27cs_cKA-U",
    processedImage:
      "/products/processed/generated/product-omr-raw-007-main.webp",
    rowIndex: 10,
  }),
  verified({
    id: "OMR-RAW-008",
    name: "طقم عرائس Beauty Girl",
    price: null,
    category: "عرائس وألعاب بنات",
    description:
      "طقم عرائس عائلي يضم أربع شخصيات بملابس متناسقة داخل عبوة Fashion، كما هو ظاهر بالصورة. موضح على العبوة أنها مناسبة لعمر 3 سنوات فأكثر.",
    image: "/products/processed/generated/product-omr-raw-008-main.webp",
    imageSource: driveSource("1kYmIS3wPoq9po4YGyh8CIv6M8O8CUw_p"),
    sortOrder: 12,
    sourceDriveId: "1xdLyrMzA0GDxlk2DpXi-Hb8ZfUo9yqxC",
    processedImage:
      "/products/processed/generated/product-omr-raw-008-main.webp",
    rowIndex: 11,
  }),
  verified({
    id: "OMR-RAW-010",
    name: "Magnetic Force Chess",
    price: null,
    category: "ألعاب تعليمية وفنية",
    description:
      "Magnetic Force Chess لعبة تحدي مغناطيسية بلوحة وكرات معدنية كما يظهر على العبوة، مناسبة للعب الذهني والتحدي.",
    image: "/products/processed/generated/product-omr-raw-010-main.webp",
    imageSource: driveSource("1kR-HMHQp0JltOSmVtolsd073JqesLngW"),
    sortOrder: 13,
    sourceDriveId: "14-0b1Xsqvpi--nu8MIrZkQQBjpB7zAIZ",
    processedImage:
      "/products/processed/generated/product-omr-raw-010-main.webp",
    rowIndex: 12,
  }),
  verified({
    id: "OMR-RAW-011",
    name: "طائرة مقاتلة بالريموت",
    price: null,
    category: "سيارات وريموت",
    description:
      "طائرة لعبة بالريموت بتصميم مقاتلة مع مراوح مدمجة ووحدة تحكم لاسلكية، كما يظهر على العبوة والصورة.",
    image: "/products/processed/generated/product-omr-raw-011-main.webp",
    imageSource: driveSource("1v2V_v6GidoqTbwEbPh9tv4xd3stiDz4R"),
    sortOrder: 14,
    sourceDriveId: "1GppbeR4M1VDBw6OVUmv9hkLJcDF0NnzF",
    processedImage:
      "/products/processed/generated/product-omr-raw-011-main.webp",
    rowIndex: 13,
  }),
  verified({
    id: "OMR-RAW-012",
    name: "خزنة أطفال إلكترونية",
    price: null,
    category: "ألعاب تعليمية وفنية",
    description:
      "خزنة لعبة للأطفال بتصميم إلكتروني، تحتوي على لوحة أرقام ومقبض دائري وفتحة علوية كما يظهر بالصورة.",
    image: "/products/processed/generated/product-omr-raw-012-main.webp",
    imageSource: driveSource("1Sl8j6xkubkcSRdAYoJjsta905lTl2ho0"),
    sortOrder: 15,
    sourceDriveId: "1GNkXFyJ0mZEyYQxhrSXjBND0OR1TSSPC",
    processedImage:
      "/products/processed/generated/product-omr-raw-012-main.webp",
    rowIndex: 12,
  }),
  verified({
    id: "OMR-RAW-013",
    name: "طقم مطبخ أطفال",
    price: null,
    category: "ألعاب تمثيل أدوار",
    description:
      "Mini Kitchen طقم مطبخ لعب للأطفال مكوّن من 47 قطعة، يضم أدوات مطبخ وأواني وملحقات كما هو موضح على العبوة.",
    image: "/products/processed/generated/product-omr-raw-013-main.webp",
    imageSource: driveSource("18_ryNh_KuKnmeYiRkbfMSB_QwBpp4Ix3"),
    sortOrder: 16,
    sourceDriveId: "1GOkTZLGhiwMy3w6NW6y8nJZfcay0cS09",
    processedImage:
      "/products/processed/generated/product-omr-raw-013-main.webp",
    rowIndex: 13,
  }),
  verified({
    id: "OMR-RAW-014",
    name: "حذاء تزلج أطفال Roller Skates",
    price: null,
    category: "ألعاب حركة ورياضة",
    description:
      "حذاء تزلج Roller Skates للأطفال باللونين الأسود والأخضر، مزوّد بأربع عجلات متتالية كما يظهر بالصورة.",
    image: "/products/processed/generated/product-omr-raw-014-main.webp",
    imageSource: driveSource("11HUU4vP3EaUvkU9iareZhV8rdQsEqEPb"),
    sortOrder: 17,
    sourceDriveId: "1LCtGyec2Wi3vgC73YRNiglngQ2C88164",
    processedImage:
      "/products/processed/generated/product-omr-raw-014-main.webp",
    rowIndex: 14,
  }),
  verified({
    id: "OMR-RAW-015",
    name: "سيارة سباق بالريموت",
    price: null,
    category: "سيارات وريموت",
    description:
      "سيارة Speed Racing بالريموت بمقياس 1:18 وتحكم لاسلكي 27MHz، مع وحدة تحكم على شكل عجلة قيادة كما يظهر على العبوة.",
    image: "/products/processed/generated/product-omr-raw-015-main.webp",
    imageSource: driveSource("176s-ansOHYcOZRHFHmgVIuu-mXAT59fW"),
    sortOrder: 18,
    sourceDriveId: "1X0kneqOH1xM_gYH_M5LofoH1yJKnbBeR",
    processedImage:
      "/products/processed/generated/product-omr-raw-015-main.webp",
    rowIndex: 15,
  }),
  verified({
    id: "OMR-RAW-017",
    name: "طقم أدوات لعب للأطفال",
    price: null,
    category: "ألعاب تمثيل أدوار",
    description:
      "طقم أدوات لعب للأطفال يضم خوذة وأدوات متنوعة للعب التخيلي مثل المنشار والمفكات وملحقات أخرى، والعبوة موضح عليها عمر 3 سنوات فأكثر.",
    image: "/products/processed/generated/product-omr-raw-017-main.webp",
    imageSource: driveSource("1UozlVTKY_dH5SUrlWFCKiqyc1Sr330Nq"),
    sortOrder: 19,
    sourceDriveId: "11L2JzfLrVq6sDXomqLlaWta5bu5MeprU",
    processedImage:
      "/products/processed/generated/product-omr-raw-017-main.webp",
    rowIndex: 16,
  }),
  verified({
    id: "OMR-RAW-019",
    name: "عروسة Sweet Baby",
    price: null,
    category: "عرائس وألعاب بنات",
    description:
      "عروسة Sweet Baby للعب التخيلي مع زجاجة رضاعة وفرشاة ومرآة كإكسسوارات ظاهرة بالعبوة، ومذكور عليها عمر 3 سنوات فأكثر.",
    image: "/products/processed/generated/product-omr-raw-019-main.webp",
    imageSource: driveSource("1KD14HNb18lk2vxbhlBNAqmBpvXNozcI_"),
    sortOrder: 20,
    sourceDriveId: "1W4i1VJgAaigHz1ts6pW39X0-YY0Mfmlt",
    processedImage:
      "/products/processed/generated/product-omr-raw-019-main.webp",
    rowIndex: 17,
  }),
  verified({
    id: "OMR-RAW-020",
    name: "سيارة ريموت خضراء",
    price: null,
    category: "سيارات وريموت",
    description:
      "سيارة ريموت خضراء بمقياس 1:16 وتحكم 4 اتجاهات، مع إضاءة LED كما هو موضح على العبوة.",
    image: "/products/processed/generated/product-omr-raw-020-main.webp",
    imageSource: driveSource("1zMv-gcrm6jTytQ3HgcRtME5ZmFDxtAiE"),
    sortOrder: 21,
    sourceDriveId: "1WRIkkQDIYp-UnRLHeW4EO5NuBAm9KosZ",
    processedImage:
      "/products/processed/generated/product-omr-raw-020-main.webp",
    rowIndex: 18,
  }),
  verified({
    id: "OMR-RAW-021",
    name: "سيارة ريموت رمادية",
    price: null,
    category: "سيارات وريموت",
    description:
      "سيارة ريموت رمادية بتصميم شاحنة كهربائية، مع وحدة تحكم لاسلكية وملحق شحن لعب ظاهر على العبوة.",
    image: "/products/processed/generated/product-omr-raw-021-main.webp",
    imageSource: driveSource("1AA8Cb31Hk9sTqNJfNLubRpeSeE41JF_X"),
    sortOrder: 22,
    sourceDriveId: "1Ar1Y8kVUPlgiuRPT7isp7BX3YnIiUZXA",
    processedImage:
      "/products/processed/generated/product-omr-raw-021-main.webp",
    rowIndex: 19,
  }),
  verified({
    id: "OMR-RAW-022",
    name: "Battle Game",
    price: null,
    category: "ألعاب حركة ورياضة",
    description:
      "Battle Game لعبة تحدي لشخصين بمطرقتين نابضتين وشخصيتين متقابلتين؛ الهدف ضرب زر المنافس كما هو موضح على العبوة، ومذكور عمر 3 سنوات فأكثر.",
    image: "/products/processed/generated/product-omr-raw-022-main.webp",
    imageSource: driveSource("1aJHphYdC6kHa0fNaza7_xkJhsc6cJL9Y"),
    sortOrder: 23,
    sourceDriveId: "1UQ3tha_KkkUALRrNCDVSaHEXVQev9iA6",
    processedImage:
      "/products/processed/generated/product-omr-raw-022-main.webp",
    rowIndex: 20,
  }),
  verified({
    id: "OMR-RAW-023",
    name: "طقم سيارتي Bumper Car بالريموت",
    price: null,
    category: "سيارات وريموت",
    description:
      "طقم لعب يضم سيارتي Bumper Car صغيرتين وشخصيتين مع وحدتي تحكم بالريموت كما يظهر بوضوح في العبوة.",
    image: "/products/processed/generated/product-omr-raw-023-main.webp",
    imageSource: driveSource("1m681A4UBUOgLwxg0v7KETKFNa4MYk84y"),
    sortOrder: 24,
    sourceDriveId: "1eFBLucdyaX2xiDCmocP9CRrzzSoCRqXj",
    processedImage:
      "/products/processed/generated/product-omr-raw-023-main.webp",
    rowIndex: 21,
  }),
  verified({
    id: "OMR-RAW-026",
    name: "نظارة سباحة وردية",
    price: null,
    category: "ألعاب مائية",
    description:
      "نظارة سباحة وردية للأطفال داخل علبة حفظ شفافة، بعدسات وردية وحزام قابل للضبط كما يظهر بالصورة.",
    image: "/products/processed/generated/product-omr-raw-026-main.webp",
    imageSource: driveSource("1wxtVINUm3WKUtyu32ophkRZDAttgVGG9"),
    sortOrder: 25,
    sourceDriveId: "1Aoo9ddzxi59ZtSj4dVFTnZLbKdLK68Ob",
    processedImage:
      "/products/processed/generated/product-omr-raw-026-main.webp",
    rowIndex: 22,
  }),
  verified({
    id: "OMR-RAW-027",
    name: "نظارة سباحة صفراء",
    price: null,
    category: "ألعاب مائية",
    description:
      "نظارة سباحة صفراء للأطفال داخل علبة حفظ شفافة، بعدسات صفراء وحزام قابل للضبط كما يظهر بالصورة.",
    image: "/products/processed/generated/product-omr-raw-027-main.webp",
    imageSource: driveSource("1zAnMxXbEEK_b_hSzCIETJKQicdLABvkx"),
    sortOrder: 26,
    sourceDriveId: "1QoikeNacuNrFtYupMIuYUILh7KE3gOqc",
    processedImage:
      "/products/processed/generated/product-omr-raw-027-main.webp",
    rowIndex: 23,
  }),
  verified({
    id: "OMR-RAW-028",
    name: "سكوتر أطفال بثلاث عجلات",
    price: null,
    category: "ألعاب حركة ورياضة",
    description:
      "سكوتر أطفال بثلاث عجلات بتصميم أخضر مع تفاصيل ذهبية ومقود أمامي، مخصص لألعاب الحركة كما يظهر بالصورة.",
    image: "/products/processed/generated/product-omr-raw-028-main.webp",
    imageSource: driveSource("1Nd0r0jFalOQgB412fj3scjOnOIKVws03"),
    sortOrder: 27,
    sourceDriveId: "1w8rLYavx7RrfO1F3_6rvVHNfm3jVKyd1",
    processedImage:
      "/products/processed/generated/product-omr-raw-028-main.webp",
    rowIndex: 24,
  }),
  verified({
    id: "OMR-RAW-029",
    name: "عروسة أطفال بفستان ونظارة وردية",
    price: null,
    category: "عرائس وألعاب بنات",
    description:
      "عروسة أطفال بشعر بني وفستان أزرق مزخرف ونظارة وردية، كما تظهر في الصورة.",
    image: "/products/processed/generated/product-omr-raw-029-main.webp",
    imageSource: driveSource("1dwNerCoxJYqM-JQmOI3dng4IxfnLcmzF"),
    sortOrder: 28,
    sourceDriveId: "1hHRHX50mON92rYjPJ-JX2DpQLC0_WtEW",
    processedImage:
      "/products/processed/generated/product-omr-raw-029-main.webp",
    rowIndex: 25,
  }),
];
