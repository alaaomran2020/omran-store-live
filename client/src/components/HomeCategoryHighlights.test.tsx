// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeCategoryHighlights from "./HomeCategoryHighlights";

afterEach(cleanup);

describe("تصنيفات الصفحة الرئيسية — انتقال الجرد", () => {
  it("تعرض فقط فوانيس ومفارش رمضان بدل الأقسام القديمة", () => {
    render(<HomeCategoryHighlights />);
    const links = screen.getAllByRole("link").filter(link => link.getAttribute("href")?.includes("/products?"));
    expect(links).toHaveLength(2);
    expect(links.every(link => link.getAttribute("href")?.endsWith("#feed"))).toBe(true);
    expect(screen.getByRole("link", { name: "تصفح فوانيس رمضان" }).getAttribute("href"))
      .toContain("category=%D9%81%D9%88%D8%A7%D9%86%D9%8A%D8%B3%20%D8%B1%D9%85%D8%B6%D8%A7%D9%86");
    expect(screen.getByRole("link", { name: "تصفح مفارش رمضان" }).getAttribute("href"))
      .toBe("/products?category=ramadan-lanterns#feed");
    for (const removed of ["عربيات", "عرايس", "أطقم المهن والتركيب", "رفايع لعب أطفال", "الكور"]) {
      expect(screen.queryByText(removed)).toBeNull();
    }
  });

  it("تعطي أولوية تحميل فقط لبطاقة أول قسم على الموبايل", () => {
    const { container } = render(<HomeCategoryHighlights compact />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(2);
    expect(images.map(img => img.getAttribute("loading"))).toEqual(["eager", "eager"]);
    expect(images.map(img => img.getAttribute("fetchpriority"))).toEqual(["high", "auto"]);
    expect(images[0].getAttribute("srcset")).toContain("-approved-320.webp");
    expect(images[1].getAttribute("srcset")).toBeNull();
  });

  it("تستخدم الصور المحلية المعتمدة لقسمي رمضان", () => {
    const { container } = render(<HomeCategoryHighlights />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute("src")).toBe("/categories/category-ramadan-approved.webp");
    expect(images[1].getAttribute("src")).toBe("/products/processed/ramadan/ramadan-0065-main.webp");
    expect(images.every(img => img.getAttribute("loading") === "lazy")).toBe(true);
    expect(images.every(img => img.getAttribute("decoding") === "async")).toBe(true);
  });
});
