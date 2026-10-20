import { afterEach, describe, expect, it, vi } from "vitest";
import { submitProductIntake, type ProductIntakeSubmission } from "./productIntakeClient";

afterEach(() => vi.unstubAllGlobals());

function sampleIntake(photo: File): ProductIntakeSubmission {
  return {
    employeeName: "Tester", productNameAr: "اختبار", sku: "", barcode: "",
    category: "ألعاب", subcategory: "", brand: "", supplier: "Private supplier",
    purchasePriceEgp: "10", retailPriceEgp: "", wholesalePriceEgp: "",
    source: "Upload", sourceReference: "", intakeNotes: "", photo,
  };
}

describe("product intake private uploads", () => {
  it("uploads only to the same-origin admin endpoint and refuses an unconfigured API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const photo = new File(["safe"], "photo.png", { type: "image/png" });
    await expect(submitProductIntake(sampleIntake(photo))).rejects.toThrow("بوابة الاستلام الآمنة غير مفعلة");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/product-intake");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", credentials: "same-origin", cache: "no-store" });
  });

  it("blocks SVG uploads before any network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const photo = new File(["<svg/>"], "photo.svg", { type: "image/svg+xml" });
    await expect(submitProductIntake(sampleIntake(photo))).rejects.toThrow("اختر صورة صالحة");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
