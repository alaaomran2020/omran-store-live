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
    category: "ألعاب مطبخ",
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
    category: "ألعاب مطبخ",
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
    category: "فنون وإبداع وصلصال",
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
    category: "ألعاب خارجية وفقاعات",
    description:
      "محلول فقاعات صابون للأطفال بعبوة 250 مل كما هو ظاهر على العبوة، مناسب لألعاب الفقاعات والأنشطة الخارجية.",
    image: "/products/processed/generated/product-omr-raw-001-main.webp",
    imageSource: driveSource("1dtiEbbptINTXxtQAwpkKpI2fxBAxYbLm"),
    sortOrder: 5,
    sourceDriveId: "1I_QGGoYTxq7zdfd5UgWFReB7MS9Tg36U",
    processedImage: "/products/processed/generated/product-omr-raw-001-main.webp",
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
    processedImage: "/products/processed/generated/product-omr-raw-002-main.webp",
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
    processedImage: "/products/processed/generated/product-omr-raw-003-main.webp",
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
    processedImage: "/products/processed/generated/product-omr-raw-004-main.webp",
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
    processedImage: "/products/processed/generated/product-omr-raw-005-main.webp",
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
    processedImage: "/products/processed/generated/product-omr-raw-006-main.webp",
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
    processedImage: "/products/processed/generated/product-omr-raw-007-main.webp",
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
    processedImage: "/products/processed/generated/product-omr-raw-008-main.webp",
    rowIndex: 11,
  }),
  verified({
    id: "OMR-RAW-010",
    name: "Magnetic Force Chess",
    price: null,
    category: "ألعاب تعليمية وذهنية",
    description:
      "Magnetic Force Chess لعبة تحدي مغناطيسية بلوحة وكرات معدنية كما يظهر على العبوة، مناسبة للعب الذهني والتحدي.",
    image: "/products/processed/generated/product-omr-raw-010-main.webp",
    imageSource: driveSource("1kR-HMHQp0JltOSmVtolsd073JqesLngW"),
    sortOrder: 13,
    sourceDriveId: "14-0b1Xsqvpi--nu8MIrZkQQBjpB7zAIZ",
    processedImage: "/products/processed/generated/product-omr-raw-010-main.webp",
    rowIndex: 12,
  }),
  verified({
    id: "OMR-RAW-011",
    name: "طائرة مقاتلة بالريموت",
    price: null,
    category: "سيارات وطائرات ريموت",
    description:
      "طائرة لعبة بالريموت بتصميم مقاتلة مع مراوح مدمجة ووحدة تحكم لاسلكية، كما يظهر على العبوة والصورة.",
    image: "/products/processed/generated/product-omr-raw-011-main.webp",
    imageSource: driveSource("1v2V_v6GidoqTbwEbPh9tv4xd3stiDz4R"),
    sortOrder: 14,
    sourceDriveId: "1GppbeR4M1VDBw6OVUmv9hkLJcDF0NnzF",
    processedImage: "/products/processed/generated/product-omr-raw-011-main.webp",
    rowIndex: 13,
  }),
];
