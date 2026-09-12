// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProductDetailsDialog } from "./ProductDetailsDialog";
import type { Product } from "@/lib/productsClient";
import { getFocusableElements } from "@/lib/a11y";

const product: Product = {
  id: "OMR-TEST-1",
  sku: "OT-TEST-1",
  name: "نظارة لعب للأطفال",
  price: 250,
  category: "ألعاب تنكرية",
  description: "نظارة لعب خفيفة مناسبة للحفلات.",
  image: null,
  imageSource: null,
  active: true,
  sortOrder: 1,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
  sourceDriveId: null,
  processedImage: null,
  reviewReason: null,
  rowIndex: 1,
  ageMin: 3,
  ageMax: 8,
  galleryImages: [],
  videoUrl: null,
  videoPoster: null,
  videoDuration: null,
  options: [],
  brand: "Omran Kids",
  tags: ["حفلات", "خفيفة"],
  availability: "available",
  specifications: {
    productLengthCm: null,
    productWidthCm: null,
    productHeightCm: null,
    packageLengthCm: null,
    packageWidthCm: null,
    packageHeightCm: null,
    weightKg: null,
    material: "بلاستيك",
    piecesCount: 1,
    powerSource: null,
    assemblyRequired: false,
    boxContents: "نظارة واحدة",
    boxContentsItems: ["نظارة واحدة"],
    playInstructions: null,
  },
};

beforeEach(() => {
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "201000000000");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("تفاصيل المنتج", () => {
  it("تعرض البيانات الموثقة فقط وتحافظ على CTA واتساب المعتمد", () => {
    render(<ProductDetailsDialog product={product} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: product.name });
    expect(within(dialog).getByText("OT-TEST-1")).toBeTruthy();
    expect(within(dialog).getByText("متاح للاستفسار")).toBeTruthy();
    expect(within(dialog).getByText("Omran Kids")).toBeTruthy();
    expect(within(dialog).getByText("3–8 سنة")).toBeTruthy();
    expect(within(dialog).getByText("حفلات")).toBeTruthy();
    expect(within(dialog).getByText("بلاستيك")).toBeTruthy();

    const ctas = within(dialog).getAllByRole("link", { name: "للاستفسار والكميات" }) as HTMLAnchorElement[];
    expect(ctas.length).toBeGreaterThan(0);
    expect(decodeURIComponent(ctas[0].href)).toContain("الكود: OT-TEST-1");
    expect(decodeURIComponent(ctas[0].href)).toContain("التصنيف: ألعاب تنكرية");
    expect(within(dialog).queryByText(/250|ج\.م|إضافة للسلة|مقارنة/)).toBeNull();
  });

  it("ينقل التركيز لزر الإغلاق ثم يعيده للعنصر السابق", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "فتح المنتج";
    document.body.appendChild(trigger);
    trigger.focus();

    const view = render(<ProductDetailsDialog product={product} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "إغلاق" })).toBe(document.activeElement));

    view.unmount();
    expect(trigger).toBe(document.activeElement);
    trigger.remove();
  });

  it("يدعم السحب بين صور المنتج من المعرض الأساسي على الموبايل", () => {
    const productWithGallery: Product = {
      ...product,
      image: "/products/main.webp",
      processedImage: "/products/main.webp",
      galleryImages: ["/products/second.webp"],
    };
    render(<ProductDetailsDialog product={productWithGallery} onClose={vi.fn()} />);

    expect(screen.getByText("1 / 2")).toBeTruthy();
    const stage = screen.getByTestId("product-gallery-stage");
    fireEvent.touchStart(stage, { changedTouches: [{ clientX: 240 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 120 }] });
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("يغلق الـLightbox بمفتاح Escape دون إغلاق تفاصيل المنتج", () => {
    const productWithGallery: Product = {
      ...product,
      image: "/products/main.webp",
      processedImage: "/products/main.webp",
      galleryImages: ["/products/second.webp"],
    };
    render(<ProductDetailsDialog product={productWithGallery} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: `فتح صورة ${product.name} بالحجم الكامل` }));
    expect(screen.getByRole("dialog", { name: `معرض صور ${product.name}` })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: `معرض صور ${product.name}` })).toBeNull();
    expect(screen.getByTestId("product-details")).toBeTruthy();
  });

  it("يدور بين الصور دون تكرار ويدعم الأسهم داخل الـLightbox", () => {
    const productWithGallery: Product = {
      ...product,
      image: "/products/main.webp",
      processedImage: "/products/main.webp",
      galleryImages: ["/products/main.webp", "/products/second.webp"],
    };
    render(<ProductDetailsDialog product={productWithGallery} onClose={vi.fn()} />);

    expect(screen.getByText("1 / 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "الصورة التالية" }));
    expect(screen.getByText("2 / 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "الصورة التالية" }));
    expect(screen.getByText("1 / 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: `فتح صورة ${product.name} بالحجم الكامل` }));
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    const lightbox = screen.getByRole("dialog", { name: `معرض صور ${product.name}` });
    expect(lightbox).toBeTruthy();
    expect(within(lightbox).getByText("2 / 2")).toBeTruthy();
  });

  it("يعيد التركيز إلى زر فتح الصورة بعد إغلاق الـLightbox", async () => {
    const productWithGallery: Product = {
      ...product,
      image: "/products/main.webp",
      processedImage: "/products/main.webp",
      galleryImages: ["/products/second.webp"],
    };
    render(<ProductDetailsDialog product={productWithGallery} onClose={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: `فتح صورة ${product.name} بالحجم الكامل` });
    trigger.focus();
    fireEvent.click(trigger);
    const closeLightbox = screen.getByRole("button", { name: "إغلاق عرض الصورة" });
    expect(document.activeElement).toBe(closeLightbox);

    fireEvent.click(closeLightbox);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("تفاصيل المنتج — سلوك التركيز داخل النوافذ", () => {
  const productWithGallery: Product = {
    ...product,
    image: "/products/main.webp",
    processedImage: "/products/main.webp",
    galleryImages: ["/products/second.webp"],
  };

  it("لا يغلق تفاصيل المنتج عند Escape داخل الـLightbox", () => {
    const onClose = vi.fn();
    render(<ProductDetailsDialog product={productWithGallery} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: `فتح صورة ${product.name} بالحجم الكامل` }));
    expect(screen.getByRole("dialog", { name: `معرض صور ${product.name}` })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: `معرض صور ${product.name}` })).toBeNull();
    expect(screen.getByTestId("product-details")).toBeTruthy();
  });

  it("يحبس التركيز داخل الـDialog عند Tab وShift+Tab", async () => {
    render(<ProductDetailsDialog product={product} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "إغلاق" })).toBe(document.activeElement));

    const dialog = screen.getByTestId("product-details");
    const focusable = getFocusableElements(dialog);
    expect(focusable.length).toBeGreaterThan(1);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("يعيد التركيز إلى كارت المنتج عندما يختفي العنصر الذي فتح التفاصيل", async () => {
    const card = document.createElement("article");
    card.setAttribute("data-product-id", product.id);
    const imageTrigger = document.createElement("button");
    imageTrigger.textContent = "صورة المنتج";
    const detailsTrigger = document.createElement("button");
    detailsTrigger.textContent = "التفاصيل";
    card.append(imageTrigger, detailsTrigger);
    document.body.appendChild(card);
    imageTrigger.focus();

    const view = render(<ProductDetailsDialog product={product} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "إغلاق" })).toBe(document.activeElement));

    // Back/Forward أو إعادة الفلترة قد تحذف العنصر الأصلي من الصفحة
    imageTrigger.remove();
    view.unmount();

    expect(document.activeElement).toBe(detailsTrigger);
    card.remove();
  });

  it("يعرض مجموعات الخيارات كمجموعات مسماة بدل قائمة غير صحيحة", () => {
    const productWithOptions: Product = {
      ...product,
      options: [{ name: "المقاس", values: ["صغير", "كبير"] }],
    };
    render(<ProductDetailsDialog product={productWithOptions} onClose={vi.fn()} />);

    const group = screen.getByRole("group", { name: "اختار المقاس" });
    expect(group).toBeTruthy();
    // أول قيمة تُختار تلقائيًا وتُعلن عبر aria-pressed بدل الاعتماد على اللون فقط
    expect(within(group).getByRole("button", { name: "صغير" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "كبير" }).getAttribute("aria-pressed")).toBe("false");
  });
});
