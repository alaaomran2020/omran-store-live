// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeAgeBrowse from "./HomeAgeBrowse";
import type { Product } from "@/lib/productsClient";

afterEach(cleanup);

describe("التسوق حسب العمر", () => {
  it("لا يعرض روابط فارغة عندما لم تُوثق أعمار المنتجات", () => {
    render(<HomeAgeBrowse />);
    expect(screen.queryByRole("heading", { name: "تسوق حسب العمر" })).toBeNull();
  });

  it("يعرض روابط العمر الموثقة فقط", () => {
    render(<HomeAgeBrowse products={[{ ageMin: 3, ageMax: 5 } as Product]} />);

    expect(screen.getByRole("heading", { name: "تسوق حسب العمر" })).toBeTruthy();
    const ageLinks = screen
      .getAllByRole("link")
      .filter(link => link.getAttribute("href")?.includes("/products?age="));

    expect(ageLinks).toHaveLength(1);
    expect(ageLinks[0].getAttribute("href")).toBe("/products?age=3-5#feed");
  });
});