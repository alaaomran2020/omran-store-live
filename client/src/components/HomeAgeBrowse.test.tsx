// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeAgeBrowse from "./HomeAgeBrowse";

afterEach(cleanup);

describe("التسوق حسب العمر", () => {
  it("يربط كل فئة عمرية بفلتر الكتالوج الصحيح", () => {
    render(<HomeAgeBrowse />);

    expect(screen.getByRole("heading", { name: "تسوق حسب العمر" })).toBeTruthy();
    const ageLinks = screen
      .getAllByRole("link")
      .filter(link => link.getAttribute("href")?.includes("/products?age="));

    expect(ageLinks).toHaveLength(5);
    expect(ageLinks.map(link => link.getAttribute("href"))).toEqual([
      "/products?age=0-2#feed",
      "/products?age=3-5#feed",
      "/products?age=6-8#feed",
      "/products?age=9-12#feed",
      "/products?age=13%2B#feed",
    ]);
  });
});