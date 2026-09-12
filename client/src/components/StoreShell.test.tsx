// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import AnnouncementBar from "./AnnouncementBar";
import BrandHeader from "./BrandHeader";

afterEach(cleanup);

describe("store shell responsive smoke", () => {
  for (const width of [320, 375, 390, 768, 1280]) {
    it(`keeps the full brand identity and primary navigation at ${width}px`, () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      render(<BrandHeader />);

      expect(screen.getByText("شركة عمران التجارية")).toBeTruthy();
      // Header logo uses the 128px variant (rendered at 48–64px); the 512px
      // source stays on disk for og:image and other consumers.
      expect(screen.getByAltText("لوجو عمران").getAttribute("src")).toBe("/brand/logo-128.png");
      expect(screen.getByRole("navigation", { name: "أقسام المتجر" })).toBeTruthy();
      expect(screen.queryByText("طلبك")).toBeNull();
      expect(screen.queryByText("مقارنة المنتجات")).toBeNull();
    });
  }

  it("keeps the announcement moving without embedded control buttons", () => {
    render(<AnnouncementBar />);
    const bar = screen.getByLabelText("مستجدات المتجر");
    expect(within(bar).queryByRole("button")).toBeNull();
  });

  it("marks the current customer section and keeps toys navigation visible", () => {
    window.history.replaceState({}, "", "/products");
    render(<BrandHeader />);
    const toys = screen.getByRole("link", { name: "لعب الأطفال" });
    expect(toys.getAttribute("aria-current")).toBe("page");
    expect(toys.className).not.toContain("hidden");
  });
});
