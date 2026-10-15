// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductImage, responsiveImageSrcSet } from "./ProductImage";

const baseProduct = {
  id: "OT-IMAGE-1",
  name: "لعبة اختبار الصورة",
  image: null,
  imageSource: null,
  processedImage: null,
};

afterEach(cleanup);

describe("صور المنتجات والدفاع ضد الصور المكسورة", () => {
  it("لا يخفي صورة المنتج انتظارًا لحدث load قد يفوت مع كاش الموبايل", () => {
    render(<ProductImage product={{ ...baseProduct, image: "/products/processed/watch.svg" }} />);
    const image = screen.getByRole("img", { name: "لعبة اختبار الصورة" }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/products/processed/watch.svg");
    expect(image.className).not.toContain("opacity-0");
    expect(image.getAttribute("loading")).toBe("lazy");
    fireEvent.load(image);
    expect(image.className).not.toContain("opacity-0");
  });

  it("عند فشل نسخة الصورة الصغيرة يجرب الملف الأصلي أولًا قبل المصدر الاحتياطي", () => {
    render(<ProductImage product={{
      ...baseProduct,
      image: "/products/processed/example.webp",
      imageSource: "https://example.com/backup.webp",
    }} />);
    let image = screen.getByRole("img", { name: "لعبة اختبار الصورة" }) as HTMLImageElement;
    expect(image.getAttribute("srcset")).toContain("example-320.webp");
    fireEvent.error(image);
    image = screen.getByRole("img", { name: "لعبة اختبار الصورة" }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/products/processed/example.webp");
    expect(image.getAttribute("srcset")).toBeNull();
    fireEvent.error(image);
    image = screen.getByRole("img", { name: "لعبة اختبار الصورة" }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("https://example.com/backup.webp");
  });

  it("يبني srcset فقط للصور المعالجة المحلية", () => {
    expect(responsiveImageSrcSet("/products/processed/generated/product-main.webp"))
      .toBe("/products/processed/generated/product-main-320.webp 320w, /products/processed/generated/product-main-640.webp 640w, /products/processed/generated/product-main-960.webp 960w");
    expect(responsiveImageSrcSet("/products/popup/product-main.webp")).toBeUndefined();
    expect(responsiveImageSrcSet("https://example.com/product.webp")).toBeUndefined();
    expect(responsiveImageSrcSet("/products/processed/product-main.svg")).toBeUndefined();
    expect(responsiveImageSrcSet("/products/processed/product-main-640.webp")).toBeUndefined();
  });

  it("يعرض placeholder مفهومًا عندما لا توجد أي صورة معلنة", () => {
    render(<ProductImage product={baseProduct} />);

    const placeholder = screen.getByRole("img", {
      name: "لا توجد صورة متاحة للمنتج لعبة اختبار الصورة",
    });
    expect(placeholder.tagName).toBe("DIV");
    expect(
      screen.queryByRole("img", { name: "لعبة اختبار الصورة" })
    ).toBeNull();
  });

  it("ينتقل بين المرشحات المعلنة ثم يتوقف عند placeholder بدل إعادة المحاولة بلا نهاية", () => {
    render(
      <ProductImage
        product={{
          ...baseProduct,
          image: "/products/missing.webp",
          imageSource: "https://drive.google.com/file/d/drive-image-1/view",
        }}
      />
    );

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const image = screen.queryByRole("img", { name: "لعبة اختبار الصورة" });
      if (!(image instanceof HTMLImageElement)) break;
      fireEvent.error(image);
    }

    const placeholder = screen.getByRole("img", {
      name: "لا توجد صورة متاحة للمنتج لعبة اختبار الصورة",
    });
    expect(placeholder.tagName).toBe("DIV");
    expect(
      screen.queryByRole("img", { name: "لعبة اختبار الصورة" })
    ).toBeNull();
  });

  it("يعيد محاولة الصورة من البداية عند تغيير المنتج أو الوسائط", () => {
    const { rerender } = render(
      <ProductImage
        product={{ ...baseProduct, image: "/products/first.webp" }}
      />
    );

    const first = screen.getByRole("img", {
      name: "لعبة اختبار الصورة",
    }) as HTMLImageElement;
    expect(first.dataset.imageAttempt).toBe("1");
    fireEvent.error(first);
    expect(
      (
        screen.getByRole("img", {
          name: "لعبة اختبار الصورة",
        }) as HTMLImageElement
      ).dataset.imageAttempt
    ).toBe("2");

    rerender(
      <ProductImage
        product={{
          ...baseProduct,
          id: "OT-IMAGE-2",
          image: "/products/second.webp",
        }}
      />
    );
    expect(
      (
        screen.getByRole("img", {
          name: "لعبة اختبار الصورة",
        }) as HTMLImageElement
      ).dataset.imageAttempt
    ).toBe("1");
  });
});
