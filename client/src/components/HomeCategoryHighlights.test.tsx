// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeCategoryHighlights from "./HomeCategoryHighlights";

afterEach(cleanup);

describe("تصنيفات الصفحة الرئيسية", () => {
  it("تعرض الأقسام التجارية المطلوبة فقط وتوصل مباشرة لنتائج الكتالوج", () => {
    render(<HomeCategoryHighlights />);
    const links = screen.getAllByRole("link").filter(link => link.getAttribute("href")?.includes("/products?"));

    expect(links).toHaveLength(6);
    expect(links.every(link => link.getAttribute("href")?.endsWith("#feed"))).toBe(true);
    expect(screen.getByText("عربيات")).toBeTruthy();
    expect(screen.getByText("عرايس")).toBeTruthy();
    expect(screen.getByText("أطقم المهن والتركيب")).toBeTruthy();
    expect(screen.getByText("رفايع لعب أطفال")).toBeTruthy();
    expect(screen.getByText("الكور")).toBeTruthy();
    expect(screen.getByText("رمضان")).toBeTruthy();
    expect(screen.getByRole("link", { name: "تصفح رمضان" }).getAttribute("href")).toBe("/products?category=ramadan-lanterns#feed");
    expect(screen.queryByText("مطابخ")).toBeNull();
    expect(screen.queryByText("أدوات دكتور")).toBeNull();
    expect(screen.queryByText("أدوات نجار")).toBeNull();
    expect(screen.queryByText("أدوات تنظيف")).toBeNull();
  });

  it("تعطي صف صور الأقسام الأول أولوية مناسبة على الموبايل فقط", () => {
    const { container } = render(<HomeCategoryHighlights compact />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(6);
    expect(images.slice(0, 3).map(image => image.getAttribute("loading"))).toEqual(["eager", "eager", "eager"]);
    expect(images.slice(3).every(image => image.getAttribute("loading") === "lazy")).toBe(true);
    expect(images.map(image => image.getAttribute("fetchpriority"))).toEqual([
      "high", "auto", "auto", "auto", "auto", "auto",
    ]);
    expect(images.every(image => image.getAttribute("srcset")?.includes("-approved-320.webp 320w"))).toBe(true);
  });

  it("تعرض الصورة المعتمدة في كل كارت قسم", () => {
    const { container } = render(<HomeCategoryHighlights />);
    const images = Array.from(container.querySelectorAll("img"));

    expect(images).toHaveLength(6);
    expect(images.every(image => image.getAttribute("src")?.endsWith("-approved.webp"))).toBe(true);
    expect(images.every(image => image.getAttribute("srcset")?.includes("-approved-320.webp 320w"))).toBe(true);
    expect(images.every(image => image.getAttribute("loading") === "lazy")).toBe(true);
    expect(images.every(image => image.getAttribute("fetchpriority") !== "high")).toBe(true);
    expect(images.every(image => image.getAttribute("decoding") === "async")).toBe(true);
    expect(container.querySelectorAll('a[aria-label^="تصفح "]')).toHaveLength(6);
    expect(screen.getByRole("link", { name: "تصفح رمضان" })).toBeTruthy();
  });
});
