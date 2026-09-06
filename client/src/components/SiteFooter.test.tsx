// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SiteFooter, { FOOTER_NAVIGATION } from "./SiteFooter";

afterEach(() => cleanup());

describe("SiteFooter", () => {
  it("يعرض روابط الأقسام المفعلة حاليًا", () => {
    expect(FOOTER_NAVIGATION).toEqual([
      { label: "الرئيسية", href: "/" },
      { label: "لعب الأطفال", href: "/products" },
      { label: "POP UP", href: "/popup" },
    ]);
  });

  it("يفعّل رابط POP UP داخل الفوتر بعد اعتماد الصفحة", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "POP UP" })).toHaveAttribute("href", "/popup");
  });

  it("يعرض السنة الحالية واسم شركة عمران التجارية", () => {
    render(<SiteFooter />);
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} شركة عمران التجارية`))).toBeTruthy();
    expect(screen.getAllByText("شركة عمران التجارية").length).toBeGreaterThan(0);
  });

  it("لا يضيف روابط قانونية غير موجودة", () => {
    render(<SiteFooter />);
    expect(screen.queryByText("سياسة الخصوصية")).toBeNull();
    expect(screen.queryByText("الشروط والأحكام")).toBeNull();
    expect(screen.queryByText("الاستبدال والاسترجاع")).toBeNull();
  });
});
