// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeCategoryHighlights from "./HomeCategoryHighlights";

afterEach(cleanup);

describe("تصنيفات الصفحة الرئيسية", () => {
  it("تعرض الأقسام التجارية المطلوبة فقط وتوصل مباشرة لنتائج الكتالوج", () => {
    render(<HomeCategoryHighlights />);
    const links = screen.getAllByRole("link").filter(link => link.getAttribute("href")?.includes("/products?search="));
    expect(links).toHaveLength(6);
    expect(links.every(link => link.getAttribute("href")?.endsWith("#feed"))).toBe(true);
    expect(screen.getByText("عربيات")).toBeTruthy();
    expect(screen.getByText("عرايس")).toBeTruthy();
    expect(screen.getByText("أطقم المهن والتركيب")).toBeTruthy();
    expect(screen.getByText("رفايع لعب أطفال")).toBeTruthy();
    expect(screen.getByText("الكور")).toBeTruthy();
    expect(screen.getByText("فوانيس رمضان")).toBeTruthy();
    expect(screen.queryByText("مطابخ")).toBeNull();
    expect(screen.queryByText("أدوات دكتور")).toBeNull();
    expect(screen.queryByText("أدوات نجار")).toBeNull();
    expect(screen.queryByText("أدوات تنظيف")).toBeNull();
  });

  it("تعرض صورة WebP في كل كارت قسم دائم", () => {
    const { container } = render(<HomeCategoryHighlights />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(5);
    expect(images.every(image => image.getAttribute("src")?.endsWith(".webp"))).toBe(true);
    expect(images.every(image => image.getAttribute("loading") === "lazy")).toBe(true);
    expect(images.every(image => image.getAttribute("decoding") === "async")).toBe(true);
    expect(container.querySelectorAll('a[aria-label^="تصفح "]')).toHaveLength(5);
  });
});
