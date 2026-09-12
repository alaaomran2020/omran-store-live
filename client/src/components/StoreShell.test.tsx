// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import AnnouncementBar from "./AnnouncementBar";
import BrandHeader from "./BrandHeader";

afterEach(cleanup);

describe("store shell responsive smoke", () => {
  for (const width of [320, 360, 375, 390, 412, 768, 1280]) {
    it(`keeps the full brand identity and primary navigation at ${width}px`, () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      render(<BrandHeader />);

      expect(screen.getByText("شركة عمران التجارية")).toBeTruthy();
      expect(screen.getByAltText("لوجو عمران").getAttribute("src")).toBe("/brand/logo.png");
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

describe("شريط المستجدات والوصولية", () => {
  it("يحجب النسخة المكررة من الشريط عن قارئ الشاشة وعن الكيبورد", () => {
    render(<AnnouncementBar />);
    const bar = screen.getByLabelText("مستجدات المتجر");

    const links = within(bar).queryAllByRole("link");
    const hiddenLinks = Array.from(bar.querySelectorAll('a[aria-hidden="true"]'));
    for (const link of hiddenLinks) {
      expect(link.getAttribute("tabindex")).toBe("-1");
    }
    // لا يظهر رابط مخفي عن قارئ الشاشة وقابل للوصول بالكيبورد في نفس الوقت
    for (const link of links) {
      expect(link.getAttribute("aria-hidden")).toBeNull();
    }
  });
});
