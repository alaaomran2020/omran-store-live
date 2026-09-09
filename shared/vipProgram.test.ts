import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  calculatePointsBalance,
  canPerformVipAction,
  canTransitionCardStatus,
  toPublicCardVerification,
  type DiscountRule,
} from "./vipProgram";

const rule: DiscountRule = {
  id: "offer-1",
  status: "ACTIVE",
  eligibleTiers: ["OMRAN_VIP"],
  discount: { kind: "PERCENT", basisPoints: 1_000 },
  maximumDiscountPiasters: 10_000,
  minimumInvoicePiasters: 20_000,
  usageLimitPerCard: 1,
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-12-01T00:00:00.000Z",
  excludedProductIds: ["excluded"],
  totalBudgetPiasters: 50_000,
  funding: "OMRAN",
  stackable: false,
};

const request = {
  now: "2026-09-09T12:00:00.000Z",
  tier: "OMRAN_VIP" as const,
  cardStatus: "ACTIVE" as const,
  invoicePiasters: 200_000,
  productIds: ["toy-1"],
  previousUses: 0,
  consumedBudgetPiasters: 0,
};

describe("Omran VIP discount engine", () => {
  it("applies the percentage and enforces the monetary cap", () => {
    expect(calculateDiscount(rule, request)).toEqual({ approved: true, discountPiasters: 10_000, payablePiasters: 190_000, funding: "OMRAN" });
  });
  it("rejects inactive cards and repeated use", () => {
    expect(calculateDiscount(rule, { ...request, cardStatus: "LOST" })).toEqual({ approved: false, code: "CARD_NOT_ACTIVE" });
    expect(calculateDiscount(rule, { ...request, previousUses: 1 })).toEqual({ approved: false, code: "USAGE_LIMIT_REACHED" });
  });
  it("rejects excluded products and budget overruns", () => {
    expect(calculateDiscount(rule, { ...request, productIds: ["excluded"] })).toEqual({ approved: false, code: "PRODUCT_EXCLUDED" });
    expect(calculateDiscount(rule, { ...request, consumedBudgetPiasters: 45_000 })).toEqual({ approved: false, code: "OFFER_BUDGET_EXCEEDED" });
  });
  it("rejects invoices below the minimum and offers outside their period", () => {
    expect(calculateDiscount(rule, { ...request, invoicePiasters: 10_000 })).toEqual({ approved: false, code: "MINIMUM_INVOICE_NOT_MET" });
    expect(calculateDiscount(rule, { ...request, now: "2027-01-01T00:00:00.000Z" })).toEqual({ approved: false, code: "OUTSIDE_OFFER_PERIOD" });
  });
  it("supports fixed discounts without making the invoice negative", () => {
    const fixed = { ...rule, discount: { kind: "FIXED" as const, amountPiasters: 50_000 }, maximumDiscountPiasters: 30_000, minimumInvoicePiasters: 0 };
    expect(calculateDiscount(fixed, { ...request, invoicePiasters: 20_000 })).toEqual({ approved: true, discountPiasters: 20_000, payablePiasters: 0, funding: "OMRAN" });
  });
});

describe("Omran VIP points ledger", () => {
  it("separates available, pending and expired batches and ignores duplicate references", () => {
    const balance = calculatePointsBalance([
      { id: "1", customerId: "c1", referenceId: "sale-1", points: 100, state: "AVAILABLE", createdAt: "2026-01-01" },
      { id: "2", customerId: "c1", referenceId: "sale-1", points: 100, state: "AVAILABLE", createdAt: "2026-01-01" },
      { id: "3", customerId: "c1", referenceId: "sale-2", points: 50, state: "PENDING", createdAt: "2026-09-01" },
      { id: "4", customerId: "c1", referenceId: "sale-3", points: 25, state: "AVAILABLE", createdAt: "2026-01-01", expiresAt: "2026-08-01" },
    ], "c1", "2026-09-09");
    expect(balance).toEqual({ available: 100, pending: 50, expired: 25 });
  });
  it("never exposes a negative spendable balance", () => {
    const balance = calculatePointsBalance([
      { id: "1", customerId: "c1", referenceId: "redemption-1", points: -100, state: "AVAILABLE", createdAt: "2026-09-01" },
    ], "c1", "2026-09-09");
    expect(balance.available).toBe(0);
  });
});

describe("Omran VIP operational controls", () => {
  it("separates staff duties", () => {
    expect(canPerformVipAction("CARD_ISSUER", "ISSUE_CARD")).toBe(true);
    expect(canPerformVipAction("CARD_ISSUER", "MANAGE_FINANCIAL_RULES")).toBe(false);
    expect(canPerformVipAction("BRANCH_STAFF", "RECORD_REDEMPTION")).toBe(true);
    expect(canPerformVipAction("SUPPORT", "RECORD_REDEMPTION")).toBe(false);
  });

  it("prevents invalid card state transitions", () => {
    expect(canTransitionCardStatus("NEW", "ACTIVE")).toBe(true);
    expect(canTransitionCardStatus("LOST", "REPLACED")).toBe(true);
    expect(canTransitionCardStatus("REPLACED", "ACTIVE")).toBe(false);
    expect(canTransitionCardStatus("EXPIRED", "ACTIVE")).toBe(false);
  });

  it("returns only public-safe verification fields", () => {
    const result = toPublicCardVerification({
      serialNumber: "OV-1234567890AB",
      cardTypeNameAr: "Omran VIP",
      status: "ACTIVE",
      expiresAt: "2026-10-01T00:00:00.000Z",
    }, "2026-09-09T00:00:00.000Z");
    expect(result).toEqual({
      valid: true,
      serialSuffix: "90AB",
      cardTypeNameAr: "Omran VIP",
      status: "ACTIVE",
      expiresAt: "2026-10-01T00:00:00.000Z",
    });
    expect(result).not.toHaveProperty("phone");
    expect(result).not.toHaveProperty("customerId");
  });

  it("marks an active expired card as expired", () => {
    expect(toPublicCardVerification({
      serialNumber: "OV-1234",
      cardTypeNameAr: "Omran Silver",
      status: "ACTIVE",
      expiresAt: "2026-09-01T00:00:00.000Z",
    }, "2026-09-09T00:00:00.000Z")).toMatchObject({ valid: false, status: "EXPIRED" });
  });
});
