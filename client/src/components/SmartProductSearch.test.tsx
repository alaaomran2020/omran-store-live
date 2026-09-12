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
