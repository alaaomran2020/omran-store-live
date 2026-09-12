// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductImage, imageSourceCandidates } from "./ProductImage";
import type { Product } from "@/lib/productsClient";

const product: Product = {
  id: "IMG-TEST-1",
  sku: "IMG-1",
  name: "منتج صور",
  price: null,
  category: "ألعاب",
  description: "",
  image: "/products/processed/product-test-main.webp",
  imageSource: "https://drive.google.com/file/d/DRIVEID123/view",
  active: true,
  sortOrder: 1,
  productPrompt: "",
  workflowStatus: "PUBLISHED",
  qaStatus: "PASS",
  sourceDriveId: "DRIVEID123",
  processedImage: "/products/processed/product-test-main.webp",
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
  specifications: {
    productLengthCm: null, productWidthCm: null, productHeightCm: null,
    packageLengthCm: null, packageWidthCm: null, packageHeightCm: null,
    weightKg: null, material: null, piecesCount: null, powerSource: null,
    assemblyRequired: null, boxContents: null, boxContentsItems: [], playInstructions: null,
  },
};

afterEach(cleanup);

describe("image loading behavior", () => {
  it("requests the local 480px thumbnail first for cards, then degrades to the full source", () => {
    render(<ProductImage product={product} size="thumb" />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/products/processed/product-test-main-thumb.webp");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");

    // A missing local thumbnail must fall through to the full local file,
    // then to the repo mirror, then to the Drive variants. Each attempt
    // remounts the <img> (keyed by src), so re-query after every error.
    const current = () => screen.getByRole("img") as HTMLImageElement;
    fireEvent.error(current());
    expect(current().getAttribute("src")).toBe("/products/processed/product-test-main.webp");
    fireEvent.error(current());
    expect(current().getAttribute("src")).toContain("raw.githubusercontent.com");
    fireEvent.error(current());
    expect(current().getAttribute("src")).toContain("raw.githubusercontent.com");
    fireEvent.error(current());
    expect(current().getAttribute("src")).toBe("https://drive.google.com/thumbnail?id=DRIVEID123&sz=w480");
  });

  it("keeps the full-size candidate order for the details dialog", () => {
    render(<ProductImage product={product} />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/products/processed/product-test-main.webp");
  });

  it("marks the priority image eager with fetchpriority=high (LCP protection)", () => {
    render(<ProductImage product={product} size="thumb" priority />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("fetchpriority")).toBe("high");
  });

  it("sizes Drive thumbnails by render size instead of always requesting w1000", () => {
    const candidates = imageSourceCandidates("https://drive.google.com/file/d/DRIVEID123/view", "thumb");
    expect(candidates[0]).toBe("https://drive.google.com/thumbnail?id=DRIVEID123&sz=w480");
    const full = imageSourceCandidates("https://drive.google.com/file/d/DRIVEID123/view", "full");
    expect(full[0]).toBe("https://drive.google.com/thumbnail?id=DRIVEID123&sz=w1000");
  });

  it("derives local thumbnails only for repository WebP paths", () => {
    expect(imageSourceCandidates("/products/popup/pop-bal-us-100-catalog-v2.webp", "thumb")[0]).toBe(
      "/products/popup/pop-bal-us-100-catalog-v2-thumb.webp"
    );
    // Non-WebP local files and remote URLs have no local thumbnail variant.
    expect(imageSourceCandidates("/brand/logo.png", "thumb")[0]).toBe("/brand/logo.png");
    expect(imageSourceCandidates("https://cdn.example.com/img.webp", "thumb")[0]).toBe("https://cdn.example.com/img.webp");
  });

  it("renders the accessible fallback when every candidate fails", () => {
    const noImage: Product = { ...product, image: null, imageSource: null, processedImage: null };
    render(<ProductImage product={noImage} />);
    expect(screen.getByRole("img", { name: /لا توجد صورة متاحة/ })).toBeTruthy();
  });
});
