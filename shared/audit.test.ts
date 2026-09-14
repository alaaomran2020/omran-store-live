import { describe, expect, it } from "vitest";
import {
  auditEventsToCsv,
  buildAuditEvent,
  safeCsvCell,
  sanitizeAuditMetadata,
} from "./audit";

describe("sanitizeAuditMetadata", () => {
  it("redacts secret-bearing keys", () => {
    const out = sanitizeAuditMetadata({
      otp: "123456",
      otp_code: "123456",
      token: "abc",
      password: "secret",
      api_key: "k",
      newStatus: "PUBLISHED",
      productId: "OMR-1",
    });
    expect(out.otp).toBe("[REDACTED]");
    expect(out.otp_code).toBe("[REDACTED]");
    expect(out.token).toBe("[REDACTED]");
    expect(out.password).toBe("[REDACTED]");
    expect(out.api_key).toBe("[REDACTED]");
    expect(out.newStatus).toBe("PUBLISHED");
    expect(out.productId).toBe("OMR-1");
  });

  it("redacts values that look like OTPs or JWTs under neutral keys", () => {
    // تُبنى القيمة شبيهة الـJWT وقت التشغيل (بلا قيمة ثابتة شبيهة بسر في المستودع).
    const jwtLike = [
      "eyJhbGci" + "OiJIUzI1NiJ9",
      "eyJzdWIiOiIx" + "MjM0NTY3ODkwIn0",
      "SflKxwRJSMeKKF2" + "QT4fwpMeJf36POk6yJV_adQssw5c",
    ].join(".");
    const out = sanitizeAuditMetadata({
      note: "246810",
      authorization: "Bearer xyz",
      jwt: jwtLike,
      normal: "نشر المنتج",
    });
    expect(out.note).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.jwt).toBe("[REDACTED]");
    expect(out.normal).toBe("نشر المنتج");
  });
});

describe("buildAuditEvent", () => {
  it("never contains OTP or tokens", () => {
    const event = buildAuditEvent({
      actorId: "emp-1",
      actorName: "موظف",
      action: "OTP_REQUESTED",
      targetType: "EMPLOYEE",
      targetId: "+201012345678",
      metadata: { mobile: "+201012345678", otpCode: "000000" },
    });
    const json = JSON.stringify(event);
    expect(json).not.toContain("000000");
    expect(event.metadata?.otpCode).toBe("[REDACTED]");
  });
});

describe("safeCsvCell", () => {
  it("neutralizes spreadsheet formula injection", () => {
    expect(safeCsvCell("=1+1")).toBe("'=1+1");
    expect(safeCsvCell("+CMD()")).toBe("'+CMD()");
    expect(safeCsvCell("@SUM")).toBe("'@SUM");
    expect(safeCsvCell("-1+2")).toBe("'-1+2");
  });

  it("quotes cells containing commas and quotes", () => {
    expect(safeCsvCell('a,b')).toBe('"a,b"');
    expect(safeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("auditEventsToCsv", () => {
  it("exports a header row and safe event rows", () => {
    const csv = auditEventsToCsv([
      buildAuditEvent({
        actorId: "emp-1",
        actorName: "موظف",
        action: "PRODUCT_PUBLISHED",
        targetType: "PRODUCT",
        targetId: "OMR-1",
        targetName: "=اختبار",
        metadata: { newStatus: "PUBLISHED", token: "x" },
      }),
    ]);
    expect(csv.split("\n")[0]).toContain("action");
    expect(csv).toContain("PRODUCT_PUBLISHED");
    expect(csv).toContain("'=اختبار");
    expect(csv).toContain("[REDACTED]");
  });
});
