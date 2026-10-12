// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RamadanSeasonBanner, RamadanSeasonRibbon } from "./RamadanSeasonBanner";

afterEach(cleanup);

describe("الأجواء الرمضانية", () => {
  it("يوصل القسم للكتالوج دون إعلانات أسعار أو أزرار شراء", () => {
    render(<RamadanSeasonBanner />);
    expect(screen.getByRole("heading", { name: "زينة رمضان وتفاصيل تفرّح البيت" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /تصفح مجموعة رمضان/ }).getAttribute("href"))
      .toBe("/products?category=ramadan-lanterns#feed");
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByText("الأسعار بالاستفسار فقط · بدون شراء مباشر")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /اشتري|أضف للسلة/ })).toBeNull();
  });

  it("شريط رمضان رابط قابل للتركيز ولا يحتوي صورًا زائدة", () => {
    render(<RamadanSeasonRibbon />);
    expect(screen.getByRole("link", { name: /شوف مجموعة رمضان/ }).getAttribute("href"))
      .toBe("/products?category=ramadan-lanterns#feed");
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });
});
