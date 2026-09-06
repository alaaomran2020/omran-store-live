import type { Product } from "@shared/products";

const published = (product: Pick<Product, "id" | "name" | "price" | "category" | "description" | "sortOrder" | "rowIndex">): Product => ({
  ...product,
  sku: null,
  image: null,
  imageSource: null,
  active: true,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
  sourceDriveId: null,
  processedImage: null,
  reviewReason: null,
});

export const POPUP_PRODUCTS_SNAPSHOT: Product[] = [
  published({
    id: "POP-BAL-US-100",
    name: "بالون أمريكي 100 بالونة",
    price: 95,
    category: "بالونات",
    description: "بالون لاتكس أمريكي للتزيين والمناسبات — عبوة 100 بالونة. الألوان المتاحة: أسود، رصاصي، أحمر، بيج، بيرجاندي، زيتي، أبيض، بيبي بلو، بني، بينك، أصفر.",
    sortOrder: 1001,
    rowIndex: 1001,
  }),
  published({
    id: "POP-BAL-MET-050",
    name: "بالون ميتالك 50 بالونة",
    price: 40,
    category: "بالونات",
    description: "بالون ميتالك لامع للمناسبات والديكورات — عبوة 50 بالونة. الألوان المتاحة: موڤ، بينك، اورانچ، أسود، رصاصي، جولد.",
    sortOrder: 1002,
    rowIndex: 1002,
  }),
  published({
    id: "POP-BAL-PANDA-100",
    name: "بالون باندا 100 بالونة",
    price: 80,
    category: "بالونات",
    description: "بالون باندا لاتكس للمناسبات والحفلات — عبوة 100 بالونة. الألوان المتاحة: بينك، رصاصي، أزرق غامق، بيبي بلو، أصفر، فوشيا، موف، جولد، أحمر.",
    sortOrder: 1003,
    rowIndex: 1003,
  }),
  published({
    id: "POP-BAL-MET-100",
    name: "بالون ميتالك 100 بالونة",
    price: 55,
    category: "بالونات",
    description: "بالون ميتالك لامع للتزيين والمناسبات — عبوة 100 بالونة. الألوان المتاحة: أحمر، بينك، جولد، بيبي بلو، أزرق، رصاصي، أسود، فوشيا، أصفر.",
    sortOrder: 1004,
    rowIndex: 1004,
  }),
  published({
    id: "POP-BAL-CHR-050",
    name: "بالون كروم 50 بالونة",
    price: 60,
    category: "بالونات",
    description: "بالون كروم لامع بمظهر فاخر للمناسبات والديكورات — عبوة 50 بالونة. الألوان المتاحة: سيلفر، جولد، روز جولد، روز بينك، مينت جرين، بيج، رصاصي غامق، أزرق.",
    sortOrder: 1005,
    rowIndex: 1005,
  }),
];
