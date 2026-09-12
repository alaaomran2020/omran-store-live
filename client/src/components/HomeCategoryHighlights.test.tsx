// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeCategoryHighlights from "./HomeCategoryHighlights";

afterEach(cleanup);

describe("تصنيفات الصفحة الرئيسية", () => {
  it("تعرض روابط التصنيفات المعتمدة فقط وتوصل مباشرة للكتالوج", () => {
    render(<HomeCategoryHighlights />);
    const links = screen
      .getAllByRole("link")
      .filter(link => link.getAttribute("href")?.includes("category="));

    expect(links).toHaveLength(6);
    expect(
      links.every(link => link.getAttribute("href")?.endsWith("#feed"))
    ).toBe(true);
    expect(screen.queryByText("المنتجات الموسمية")).toBeNull();
  });

  it("تعرض صورة محسنة ومعبرة داخل كل كارت قسم", () => {
    const { container } = render(<HomeCategoryHighlights />);
    const images = Array.from(container.querySelectorAll("img"));

    expect(images).toHaveLength(6);
    expect(images.every(image => image.getAttribute("src")?.endsWith(".webp"))).toBe(
      true
    );
    expect(images.every(image => image.getAttribute("loading") === "lazy")).toBe(
      true
    );
    expect(images.every(image => image.getAttribute("decoding") === "async")).toBe(
      true
    );
  });
});
