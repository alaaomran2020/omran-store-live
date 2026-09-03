import type { Product } from "@shared/products";

/**
 * Last-known-good public catalog snapshot.
 *
 * This is deliberately small and fail-closed: only products that were verified
 * as active=true + workflow_status=PUBLISHED + qa_status=PASS are included.
 * The live API / edge mirror / published Google Sheet remain authoritative and
 * are attempted first. This snapshot exists only to prevent the storefront from
 * collapsing to an empty catalog when Cloudflare challenges or upstream network
 * failures temporarily block every live source.
 *
 * Source of truth: automation/db-publication-plan-2026-09-03.csv
 */
export const PUBLIC_PRODUCTS_SNAPSHOT: Product[] = [
  {
    id: "OMR-IG-KIT-46",
    name: "مطبخ ألعاب للأطفال — 46 قطعة",
    price: 850,
    category: "ألعاب مطبخ",
    description:
      "مطبخ أطفال كامل بأدوات وأواني وإكسسوارات كثيرة للعب التخيلي مناسب للبنات والأولاد. تنبيه أمان: يُستخدم تحت إشراف الكبار حسب العمر الموصى به.",
    image: "/products/processed/product-kitchen-46pcs-main.webp",
    imageSource: "/products/processed/product-kitchen-46pcs-main.webp",
    active: true,
    sortOrder: 2,
    productPrompt: "",
    workflowStatus: "PUBLISHED",
    qaStatus: "PASS",
    sourceDriveId: null,
    processedImage: "/products/processed/product-kitchen-46pcs-main.webp",
    reviewReason: null,
    rowIndex: 2,
  },
  {
    id: "OMR-IG-HC-104",
    name: "مطبخ Home Chef للأطفال — 104 قطعة",
    price: 1850,
    category: "ألعاب مطبخ",
    description:
      "مطبخ لعب واقعي جدًا بإضاءة وأصوات وملحقات كثيرة مناسب للأطفال من 3 سنوات. تنبيه أمان: يُستخدم تحت إشراف الكبار حسب العمر الموصى به.",
    image: "/products/processed/product-home-chef-104pcs-main.webp",
    imageSource: "/products/processed/product-home-chef-104pcs-main.webp",
    active: true,
    sortOrder: 3,
    productPrompt: "",
    workflowStatus: "PUBLISHED",
    qaStatus: "PASS",
    sourceDriveId: null,
    processedImage: "/products/processed/product-home-chef-104pcs-main.webp",
    reviewReason: null,
    rowIndex: 3,
  },
  {
    id: "OMR-IG-SQ-01",
    name: "لعبة الاسكوشي بأشكال وألوان متنوعة",
    price: 275,
    category: "فنون وإبداع وصلصال",
    description:
      "لعبة ناعمة ولطيفة للتسلية وتفريغ الطاقة تنفع كهدية حلوة للأطفال والكبار. تنبيه أمان: غير مناسبة للأطفال أقل من 3 سنوات لاحتوائها على أجزاء صغيرة.",
    image: "/products/processed/product-ot-00001-main.webp",
    imageSource: "/products/processed/product-ot-00001-main.webp",
    active: true,
    sortOrder: 4,
    productPrompt: "",
    workflowStatus: "PUBLISHED",
    qaStatus: "PASS",
    sourceDriveId: null,
    processedImage: "/products/processed/product-ot-00001-main.webp",
    reviewReason: null,
    rowIndex: 4,
  },
];
