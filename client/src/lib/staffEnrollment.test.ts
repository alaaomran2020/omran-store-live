import { describe, expect, it } from "vitest";
import {
  buildStaffEnrollmentWhatsAppUrl,
  createStaffRequestCode,
  normalizeEgyptianMobile,
} from "./staffEnrollment";

describe("employee WhatsApp enrollment", () => {
  it("normalizes supported Egyptian mobile forms", () => {
    expect(normalizeEgyptianMobile("0155 557 0269")).toBe("+201555570269");
    expect(normalizeEgyptianMobile("+20 155 557 0269")).toBe("+201555570269");
    expect(normalizeEgyptianMobile("123")).toBeNull();
  });

  it("creates an eight-character request challenge", () => {
    expect(createStaffRequestCode(new Uint8Array([1, 2, 175, 255]))).toBe(
      "OVS-0102AFFF"
    );
  });

  it("builds a pending WhatsApp request without granting access", () => {
    const result = buildStaffEnrollmentWhatsAppUrl({
      destination: "201555570269",
      displayName: "موظف تجريبي",
      mobile: "01000000000",
      requestedRole: "BRANCH_STAFF",
      requestCode: "OVS-1234ABCD",
    });
    expect(result?.url).toContain("wa.me/201555570269");
    const message = decodeURIComponent(result!.url.split("text=")[1]);
    expect(message).toContain("OVS-1234ABCD");
    expect(message).toContain("الحالة: PENDING");
    expect(message).toContain("تسجيل الموظف يدويًا");
    expect(result?.message).toBe(message);
  });

  it("rejects invalid name or phone data", () => {
    expect(
      buildStaffEnrollmentWhatsAppUrl({
        destination: "201555570269",
        displayName: "م",
        mobile: "123",
        requestedRole: "SUPPORT",
      })
    ).toBeNull();
  });
});
