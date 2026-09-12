// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SmartProductSearch } from "./SmartProductSearch";

afterEach(cleanup);

const result = {
  products: [],
  suggestion: "نظارة أطفال",
  suggestions: [
    { label: "نظارة أطفال", value: "نظارة أطفال", kind: "product" as const },
    { label: "ألعاب تنكرية", value: "ألعاب تنكرية", kind: "category" as const },
  ],
};

describe("واجهة البحث الذكي", () => {
  it("تدعم اقتراحات لوحة المفاتيح وزر مسح البحث", () => {
    const onChange = vi.fn();
    render(<SmartProductSearch value="نضاره" onChange={onChange} result={result} isPopup={false} />);

    const input = screen.getByRole("combobox", { name: "ابحث في المنتجات" });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "End" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("ألعاب تنكرية");

    fireEvent.click(screen.getByRole("button", { name: "مسح البحث" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("تعرض هل تقصد وتطبق الاقتراح", () => {
    const onChange = vi.fn();
    render(<SmartProductSearch value="نظارهه" onChange={onChange} result={result} isPopup={false} />);
    fireEvent.click(screen.getByRole("button", { name: "نظارة أطفال" }));
    expect(onChange).toHaveBeenCalledWith("نظارة أطفال");
  });
});

describe("واجهة البحث الذكي — الوصولية", () => {
  it("يملك label حقيقيًا بدل الاعتماد على placeholder فقط", () => {
    render(<SmartProductSearch value="" onChange={vi.fn()} result={result} isPopup={false} />);
    const input = screen.getByLabelText("ابحث في المنتجات") as HTMLInputElement;
    expect(input.getAttribute("placeholder")).toBeTruthy();
    expect(input.getAttribute("role")).toBe("combobox");
  });

  it("لا يضيف نقاط توقف داخل قائمة الاقتراحات", () => {
    render(<SmartProductSearch value="نظارة" onChange={vi.fn()} result={result} isPopup={false} />);
    fireEvent.focus(screen.getByRole("combobox", { name: "ابحث في المنتجات" }));

    const options = screen.getAllByRole("option");
    expect(options.length).toBe(2);
    for (const option of options) {
      expect(option.getAttribute("tabindex")).toBe("-1");
    }
  });

  it("يربط القائمة بالحقل عبر aria-controls وaria-activedescendant", () => {
    render(<SmartProductSearch value="نظارة" onChange={vi.fn()} result={result} isPopup={false} />);
    const input = screen.getByRole("combobox", { name: "ابحث في المنتجات" });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });

    const listboxId = input.getAttribute("aria-controls");
    expect(listboxId).toBeTruthy();
    expect(screen.getByRole("listbox").getAttribute("id")).toBe(listboxId);
    expect(input.getAttribute("aria-activedescendant")).toBe(`${listboxId}-0`);
  });
});
