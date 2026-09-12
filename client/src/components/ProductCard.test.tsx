// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Product } from "@/lib/productsClient";
import { ProductCard } from "./ProductCard";

const SPECIFICATIONS: Product["specifications"] = {
  productLengthCm: null, productWidthCm: null, productHeightCm: null,
  packageLengthCm: null, packageWidthCm: null, packageHeightCm: null,
  weightKg: null, material: null, piecesCount: null, powerSource: null,
  assemblyRequired: null, boxContents: null, boxContentsItems: [], playInstructions: null,
};

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "OMR-CARD-1",
    sku: "SKU-C1",
    name: "مطبخ ألعاب للأطفال",
    price: null,
    category: "ألعاب تمثيل أدوار",
    description: "",
    image: "/products/processed/card-main.webp",
    imageSource: "/products/processed/card-main.webp",
    active: true,
    sortOrder: 1,
    productPrompt: "",
    workflowStatus: "PUBLISHED",
    qaStatus: "PASS",
    sourceDriveId: null,
    processedImage: "/products/processed/card-main.webp",
    reviewReason: null,
    rowIndex: 1,
    ageMin: null,
    ageMax: null,
    galleryImages: [],
    videoUrl: null,
    videoPoster: null,
    videoDuration: null,
    options: [],
    brand: null,
    tags: [],
    availability: "unknown",
    specifications: SPECIFICATIONS,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/products");
});

describe("ProductCard — روابط crawlable", () => {
  it("بطاقة المنتج تحتوي رابطًا دلاليًا حقيقيًا لمسار المنتج الثابت", () => {
    render(<ProductCard product={makeProduct()} onOpenDetails={vi.fn()} />);

    const detailsLink = screen.getByRole("link", { name: "عرض تفاصيل مطبخ ألعاب للأطفال" });
    expect(detailsLink.getAttribute("href")).toBe("/products?product=OMR-CARD-1");

    const infoLink = screen.getByRole("link", { name: "التفاصيل" });
    expect(infoLink.getAttribute("href")).toBe("/products?product=OMR-CARD-1");
  });

  it("منتج POP UP يشير إلى /popup ولا يتسرب إلى /products", () => {
    const product = makeProduct({ id: "POP-C1", category: "بالونات", name: "بالونات معدنية" });
    render(<ProductCard product={product} onOpenDetails={vi.fn()} />);

    const detailsLink = screen.getByRole("link", { name: "عرض تفاصيل بالونات معدنية" });
    expect(detailsLink.getAttribute("href")).toBe("/popup?product=POP-C1");
  });

  it("الضغط يفتح التفاصيل برمجياً بدون تنقل كامل (يحافظ على سلوك الـSPA)", () => {
    const onOpenDetails = vi.fn();
    render(<ProductCard product={makeProduct()} onOpenDetails={onOpenDetails} />);

    const before = window.location.href;
    fireEvent.click(screen.getByRole("link", { name: "التفاصيل" }));

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(before);
  });

  it("رابط واتساب يظل يعمل ويشير للرابط الثابت للمنتج", () => {
    vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
    window.history.replaceState({}, "", "/"); // حتى من الرئيسية: الرابط ثابت
    render(<ProductCard product={makeProduct()} onOpenDetails={vi.fn()} />);

    const waLink = screen.getByRole("link", { name: "للاستفسار والكميات" });
    const href = waLink.getAttribute("href") ?? "";
    expect(href).toContain("wa.me/201000000000");
    expect(decodeURIComponent(href)).toContain("/products?product=OMR-CARD-1");
  });
});
