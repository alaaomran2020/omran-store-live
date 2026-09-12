// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import StoreTrustFeatures from "./StoreTrustFeatures";

afterEach(cleanup);

describe("عناصر الثقة", () => {
  it("تعرض مزايا موثقة بدون تقييمات أو وعود بيع غير معتمدة", () => {
    render(<StoreTrustFeatures />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText(/المنتج وكوده بيتضافوا تلقائيًا/)).toBeTruthy();
    expect(screen.queryByText(/نجوم|تقييم|ضمان|شحن مجاني/)).toBeNull();
  });
});
