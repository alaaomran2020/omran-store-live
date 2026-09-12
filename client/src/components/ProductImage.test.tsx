// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductImage } from "./ProductImage";

const baseProduct = {
  id: "OT-IMAGE-1",
  name: "لعبة اختبار الصورة",
  image: null,
  imageSource: null,
  processedImage: null,
};

afterEach(cleanup);

describe("صور المنتجات والدفاع ضد الصور المكسورة", () => {
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
