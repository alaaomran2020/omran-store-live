import { describe, expect, it } from "vitest";
import {
  buildManualOperation,
  createManualOperationId,
  egpToPiasters,
} from "./vipManualOperation";

describe("manual VIP operation preparation", () => {
  it("converts EGP to integer piasters", () => {
    expect(egpToPiasters("100")).toBe(10000);
    expect(egpToPiasters("12.50")).toBe(1250);
    expect(egpToPiasters("-1")).toBeNull();
    expect(egpToPiasters("1.999")).toBeNull();
  });

  it("creates a deterministic operation id for tests", () => {
    expect(createManualOperationId(new Uint8Array([1, 2, 3, 4]))).toBe(
      "OP-01020304"
    );
  });

  it("creates the exact 18-column pending Sheet row", () => {
    const result = buildManualOperation({
      operationType: "RECORD_REDEMPTION",
      cardSerial: "omr-vip-0001",
      staffId: "EMP-01",
      staffWhatsApp: "01000000000",
      partnerOrBranchId: "BRANCH-SAYED",
      invoiceReference: "INV-100",
      amountEgp: "500",
      discountEgp: "50",
      operationId: "OP-TEST0001",
      createdAt: "2026-09-09T12:00:00.000Z",
    });
    expect(result?.columns).toHaveLength(18);
    expect(result?.columns[0]).toBe("OP-TEST0001");
    expect(result?.columns[2]).toBe("OMR-VIP-0001");
    expect(result?.columns[8]).toBe("50000");
    expect(result?.columns[9]).toBe("5000");
    expect(result?.columns[12]).toBe("PENDING");
  });

  it("rejects missing evidence and invalid financial values", () => {
    const common = {
      cardSerial: "OMR-VIP-0001",
      staffId: "EMP-01",
      staffWhatsApp: "01000000000",
    };
    expect(
      buildManualOperation({ ...common, operationType: "ACTIVATE_CARD" })
    ).toBeNull();
    expect(
      buildManualOperation({
        ...common,
        operationType: "RECORD_REDEMPTION",
        invoiceReference: "INV-1",
        amountEgp: "50",
        discountEgp: "60",
      })
    ).toBeNull();
  });
});
