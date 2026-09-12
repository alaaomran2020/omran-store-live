// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CatalogBreadcrumbs } from "./CatalogBreadcrumbs";

afterEach(cleanup);

describe("مسار صفحات الكتالوج", () => {
  it("يبني مسار لعب الأطفال والتصنيف والمنتج بروابط صحيحة", () => {
    render(<CatalogBreadcrumbs catalog="toys" category="عرايس وشخصيات أبطال" productName="عروسة أطفال" />);
    expect(screen.getByRole("navigation", { name: "مسار الصفحة" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "لعب الأطفال" }).getAttribute("href")).toBe("/products");
    expect(screen.getByRole("link", { name: "عرايس وشخصيات أبطال" }).getAttribute("href")).toContain("/products?category=");
    expect(screen.getByText("عروسة أطفال").getAttribute("aria-current")).toBe("page");
  });

  it("يحافظ على مسار POP UP مستقلًا", () => {
    render(<CatalogBreadcrumbs catalog="popup" category="بالونات" />);
    expect(screen.getByRole("link", { name: "POP UP" }).getAttribute("href")).toBe("/popup");
    expect(screen.getByText("بالونات").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByText("لعب الأطفال")).toBeNull();
  });
});
