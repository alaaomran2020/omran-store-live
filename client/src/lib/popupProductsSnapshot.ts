import type { Product } from "@shared/products";

type PopupProductInput = Pick<
  Product,
  "id" | "name" | "price" | "category" | "description" | "sortOrder" | "rowIndex"
> & {
  sourceDriveId: string;
};

const driveViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;
const driveThumbnailUrl = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;

const published = (product: PopupProductInput): Product => ({
  ...product,
  sku: null,
  image: driveThumbnailUrl(product.sourceDriveId),
  imageSource: driveViewUrl(product.sourceDriveId),
  active: true,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
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
    sourceDriveId: "1Ul01Csoddfkf6BzbHZh3Ghnp-CvkxQ_2",
    sortOrder: 1001,
    rowIndex: 1001,
  }),
  published({
    id: "POP-BAL-MET-050",
    name: "بالون ميتالك 50 بالونة",
    price: 40,
    category: "بالونات",
    description: "بالون ميتالك لامع للمناسبات والديكورات — عبوة 50 بالونة. الألوان المتاحة: موڤ، بينك، اورانچ، أسود، رصاصي، جولد.",
    sourceDriveId: "16TVLYNHLZHBs-rf9x_RHfwos0rrgHefW",
    sortOrder: 1002,
    rowIndex: 1002,
  }),
  published({
    id: "POP-BAL-PANDA-100",
    name: "بالون باندا 100 بالونة",
    price: 80,
    category: "بالونات",
    description: "بالون باندا لاتكس للمناسبات والحفلات — عبوة 100 بالونة. الألوان المتاحة: بينك، رصاصي، أزرق غامق، بيبي بلو، أصفر، فوشيا، موف، جولد، أحمر.",
    sourceDriveId: "1PgnWaXe4w8CEB_ujK-hpVxW8Too_HT1v",
    sortOrder: 1003,
    rowIndex: 1003,
  }),
  published({
    id: "POP-BAL-MET-100",
    name: "بالون ميتالك 100 بالونة",
    price: 55,
    category: "بالونات",
    description: "بالون ميتالك لامع للتزيين والمناسبات — عبوة 100 بالونة. الألوان المتاحة: أحمر، بينك، جولد، بيبي بلو، أزرق، رصاصي، أسود، فوشيا، أصفر.",
    sourceDriveId: "1hBc4tZPgiD7GzN5WEMaynBb7ywc4jLDb",
    sortOrder: 1004,
    rowIndex: 1004,
  }),
  published({
    id: "POP-BAL-CHR-050",
    name: "بالون كروم 50 بالونة",
    price: 60,
    category: "بالونات",
    description: "بالون كروم لامع بمظهر فاخر للمناسبات والديكورات — عبوة 50 بالونة. الألوان المتاحة: سيلفر، جولد، روز جولد، روز بينك، مينت جرين، بيج، رصاصي غامق، أزرق.",
    sourceDriveId: "1u6dYKkfhaoR3dNermWKdQt21Yj3E-I14",
    sortOrder: 1005,
    rowIndex: 1005,
  }),
];
