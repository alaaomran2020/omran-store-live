// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RamadanSeasonBanner, RamadanSeasonRibbon } from "./RamadanSeasonBanner";

afterEach(cleanup);

describe("هوية رمضان الموسمية", () => {
  it("يوصل القسم للكتالوج دون إعلانات أسعار أو أزرار شراء", () => {
    render(<RamadanSeasonBanner />);
    expect(screen.getByRole("heading", { name: "تفاصيل تزيّن البيت" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /اكتشف مجموعة رمضان/ }).getAttribute("href"))
      .toBe("/products?category=ramadan-lanterns#feed");
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByText("السعر والمقاسات عبر واتساب · بدون شراء مباشر")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /اشتري|أضف للسلة/ })).toBeNull();
    expect(document.querySelector("[data-ramadan-season]")).toBeTruthy();
    expect(document.body.textContent).not.toContain("أجواء رمضان");
  });

  it("الشريط الموسمي أنيق ومختصر ورابطه قابل للتركيز", () => {
    render(<RamadanSeasonRibbon />);
    expect(screen.getByRole("link", { name: /عرض المجموعة/ }).getAttribute("href"))
      .toBe("/products?category=ramadan-lanterns#feed");
    expect(screen.getByText("مختارات رمضان")).toBeTruthy();
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });

  it("عنوان قسم رمضان مختلف عن بلوك الصفحة الرئيسية", () => {
    render(<RamadanSeasonBanner compact />);
    expect(screen.getByRole("heading", { name: "مجموعة رمضان" })).toBeTruthy();
  });
});
