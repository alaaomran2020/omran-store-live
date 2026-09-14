import { describe, expect, it } from "vitest";
import {
  formatMobile,
  isEgyptianE164,
  maskMobile,
  mobileDigits,
  normalizeEgyptianMobile,
  normalizeEgyptianMobileResult,
} from "./mobile";

describe("normalizeEgyptianMobile", () => {
  it.each([
    ["01012345678", "+201012345678"],
    ["01112345678", "+201112345678"],
    ["01212345678", "+201212345678"],
    ["01512345678", "+201512345678"],
    ["+201012345678", "+201012345678"],
    ["201012345678", "+201012345678"],
    ["00201012345678", "+201012345678"],
    [" 010 1234 5678 ", "+201012345678"],
    ["٠١٠١٢٣٤٥٦٧٨", "+201012345678"],
    ["۰۱۰۱۲۳۴۵۶۷۸", "+201012345678"],
  ])("normalizes %s → %s", (input, expected) => {
    expect(normalizeEgyptianMobile(input)).toBe(expected);
  });

  it("rejects malformed numbers", () => {
    expect(normalizeEgyptianMobileResult("").ok).toBe(false);
    expect(normalizeEgyptianMobile("12345")).toBeNull();
    expect(normalizeEgyptianMobile("01912345678")).toBeNull(); // شبكة غير معتمدة
    expect(normalizeEgyptianMobile("00966512345678")).toBeNull(); // سعودي
    const result = normalizeEgyptianMobileResult("00966512345678");
    expect(result.ok === false ? result.reason : null).toBe("UNSUPPORTED_COUNTRY");
  });

  it("prevents duplicate accounts from formatting differences", () => {
    const variants = ["01012345678", "+201012345678", "201012345678", "010-1234-5678"];
    const set = new Set(variants.map(normalizeEgyptianMobile));
    expect(set.size).toBe(1);
  });

  it("validates E.164 and masks middle digits for PII display", () => {
    expect(isEgyptianE164("+201555570269")).toBe(true);
    expect(maskMobile("01555570269")).toMatch(/^\+2015/);
    expect(maskMobile("01555570269")).toContain("269");
    expect(maskMobile("01555570269")).not.toContain("5570");
    expect(formatMobile("201555570269")).toBe("+20 15 5557 0269");
  });

  it("converts arabic-indic digits", () => {
    expect(mobileDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });
});
