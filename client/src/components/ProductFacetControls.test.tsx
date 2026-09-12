// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductFacetControls } from "./ProductFacetControls";

afterEach(cleanup);

function renderFilters() {
  const onClearBrand = vi.fn();
  render(
    <ProductFacetControls
      isPopup={false}
      brands={["Omran Kids"]}
      tags={["تعليمي"]}
      availabilityValues={["available", "unknown"]}
      brand="Omran Kids"
      tag="__all__"
      availability="__all__"
      sort="catalog"
      activeFilters={[{ key: "brand", label: "الماركة: Omran Kids", onClear: onClearBrand }]}
      resultCount={12}
      totalCount={30}
      onBrandChange={vi.fn()}
      onTagChange={vi.fn()}
      onAvailabilityChange={vi.fn()}
      onSortChange={vi.fn()}
      onClearAll={vi.fn()}
    />
  );
  return { onClearBrand };
}

describe("فلاتر المنتجات", () => {
  it("تفتح Drawer الموبايل وتغلقه بزر Escape", () => {
    renderFilters();
    const openButton = screen.getByRole("button", { name: "فتح الفلاتر الإضافية" });
    expect(openButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(openButton);
    expect(openButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "فلترة المنتجات" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(openButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("تعرض الفلاتر النشطة وتسمح بإلغاء كل فلتر مباشرة", () => {
    const { onClearBrand } = renderFilters();
    fireEvent.click(screen.getByRole("button", { name: "إلغاء فلتر الماركة: Omran Kids" }));
    expect(onClearBrand).toHaveBeenCalledOnce();
  });
});
