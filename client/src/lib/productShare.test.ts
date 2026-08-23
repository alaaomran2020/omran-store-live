import { describe, expect, it, vi } from "vitest";
import { shareProductsPage } from "./productShare";

describe("shareProductsPage", () => {
  const url = "https://example.com/products";

  it("يفضّل واجهة المشاركة الأصلية عندما تكون متاحة", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const copyToClipboard = vi.fn();

    await expect(shareProductsPage({ url, nativeShare, copyToClipboard })).resolves.toBe("shared");
    expect(nativeShare).toHaveBeenCalledWith(expect.objectContaining({ url, title: "عمران للألعاب" }));
    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it("ينسخ الرابط عندما لا تدعم البيئة المشاركة الأصلية", async () => {
    const copyToClipboard = vi.fn().mockResolvedValue(undefined);

    await expect(shareProductsPage({ url, copyToClipboard })).resolves.toBe("copied");
    expect(copyToClipboard).toHaveBeenCalledWith(url);
  });

  it("لا ينسخ الرابط عندما يلغي المستخدم ورقة المشاركة", async () => {
    const nativeShare = vi.fn().mockRejectedValue({ name: "AbortError" });
    const copyToClipboard = vi.fn();

    await expect(shareProductsPage({ url, nativeShare, copyToClipboard })).resolves.toBe("dismissed");
    expect(copyToClipboard).not.toHaveBeenCalled();
  });
});
