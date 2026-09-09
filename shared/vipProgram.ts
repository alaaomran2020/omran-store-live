export type CardTier = "OMRAN_VIP" | "OMRAN_SILVER";
export type CardStatus = "NEW" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "LOST" | "REPLACED" | "FULLY_USED";
export type OfferStatus = "DRAFT" | "APPROVED" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
export type DiscountFunding = "OMRAN" | "PARTNER" | "SHARED";

export type DiscountRule = {
  id: string;
  status: OfferStatus;
  eligibleTiers: CardTier[];
  discount: { kind: "PERCENT"; basisPoints: number } | { kind: "FIXED"; amountPiasters: number };
  maximumDiscountPiasters: number;
  minimumInvoicePiasters: number;
  usageLimitPerCard: number;
  startsAt: string;
  endsAt: string;
  includedCategoryIds?: string[];
  excludedProductIds?: string[];
  totalBudgetPiasters?: number;
  funding: DiscountFunding;
  stackable: boolean;
};

export type DiscountRequest = {
  now: string;
  tier: CardTier;
  cardStatus: CardStatus;
  invoicePiasters: number;
  categoryId?: string;
  productIds: string[];
  previousUses: number;
  consumedBudgetPiasters?: number;
};

export type DiscountDecision =
  | { approved: true; discountPiasters: number; payablePiasters: number; funding: DiscountFunding }
  | { approved: false; code: string };

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function validateDiscountRule(rule: DiscountRule): string[] {
  const errors: string[] = [];
  if (!rule.id.trim()) errors.push("MISSING_RULE_ID");
  if (!rule.eligibleTiers.length) errors.push("MISSING_ELIGIBLE_TIER");
  if (!isNonNegativeInteger(rule.maximumDiscountPiasters) || rule.maximumDiscountPiasters === 0) errors.push("INVALID_MAXIMUM_DISCOUNT");
  if (!isNonNegativeInteger(rule.minimumInvoicePiasters)) errors.push("INVALID_MINIMUM_INVOICE");
  if (!Number.isSafeInteger(rule.usageLimitPerCard) || rule.usageLimitPerCard < 1) errors.push("INVALID_USAGE_LIMIT");
  if (!Number.isFinite(Date.parse(rule.startsAt)) || !Number.isFinite(Date.parse(rule.endsAt)) || Date.parse(rule.endsAt) <= Date.parse(rule.startsAt)) errors.push("INVALID_OFFER_PERIOD");
  if (rule.discount.kind === "PERCENT" && (!Number.isSafeInteger(rule.discount.basisPoints) || rule.discount.basisPoints < 1 || rule.discount.basisPoints > 10_000)) errors.push("INVALID_PERCENTAGE");
  if (rule.discount.kind === "FIXED" && (!isNonNegativeInteger(rule.discount.amountPiasters) || rule.discount.amountPiasters === 0)) errors.push("INVALID_FIXED_DISCOUNT");
  if (rule.totalBudgetPiasters !== undefined && !isNonNegativeInteger(rule.totalBudgetPiasters)) errors.push("INVALID_TOTAL_BUDGET");
  return errors;
}

export function calculateDiscount(rule: DiscountRule, request: DiscountRequest): DiscountDecision {
  if (validateDiscountRule(rule).length) return { approved: false, code: "INVALID_RULE" };
  if (rule.status !== "ACTIVE") return { approved: false, code: "OFFER_NOT_ACTIVE" };
  if (request.cardStatus !== "ACTIVE") return { approved: false, code: "CARD_NOT_ACTIVE" };
  if (!rule.eligibleTiers.includes(request.tier)) return { approved: false, code: "CARD_NOT_ELIGIBLE" };
  if (!isNonNegativeInteger(request.invoicePiasters)) return { approved: false, code: "INVALID_INVOICE" };
  if (request.invoicePiasters < rule.minimumInvoicePiasters) return { approved: false, code: "MINIMUM_INVOICE_NOT_MET" };
  if (request.previousUses >= rule.usageLimitPerCard) return { approved: false, code: "USAGE_LIMIT_REACHED" };

  const now = Date.parse(request.now);
  if (!Number.isFinite(now) || now < Date.parse(rule.startsAt) || now > Date.parse(rule.endsAt)) return { approved: false, code: "OUTSIDE_OFFER_PERIOD" };
  if (rule.includedCategoryIds?.length && (!request.categoryId || !rule.includedCategoryIds.includes(request.categoryId))) return { approved: false, code: "CATEGORY_NOT_INCLUDED" };
  if (rule.excludedProductIds?.some(productId => request.productIds.includes(productId))) return { approved: false, code: "PRODUCT_EXCLUDED" };

  const rawDiscount = rule.discount.kind === "FIXED"
    ? rule.discount.amountPiasters
    : Math.floor((request.invoicePiasters * rule.discount.basisPoints) / 10_000);
  const discountPiasters = Math.min(rawDiscount, rule.maximumDiscountPiasters, request.invoicePiasters);
  if (discountPiasters <= 0) return { approved: false, code: "ZERO_DISCOUNT" };

  if (rule.totalBudgetPiasters !== undefined) {
    const consumed = request.consumedBudgetPiasters ?? 0;
    if (!isNonNegativeInteger(consumed) || consumed + discountPiasters > rule.totalBudgetPiasters) return { approved: false, code: "OFFER_BUDGET_EXCEEDED" };
  }

  return { approved: true, discountPiasters, payablePiasters: request.invoicePiasters - discountPiasters, funding: rule.funding };
}

export type PointsEntry = {
  id: string;
  customerId: string;
  referenceId: string;
  points: number;
  state: "PENDING" | "AVAILABLE" | "REVERSED";
  createdAt: string;
  expiresAt?: string;
};

export type PointsBalance = { pending: number; available: number; expired: number };

export type StaffRole = "ADMIN" | "CARD_ISSUER" | "BRANCH_STAFF" | "PARTNER_MANAGER" | "SUPPORT" | "REVIEWER";
export type VipAction = "ISSUE_CARD" | "ACTIVATE_CARD" | "RECORD_REDEMPTION" | "SUSPEND_CARD" | "REPLACE_CARD" | "MANAGE_FINANCIAL_RULES";

const allowedRoleActions: Record<StaffRole, readonly VipAction[]> = {
  ADMIN: ["ISSUE_CARD", "ACTIVATE_CARD", "RECORD_REDEMPTION", "SUSPEND_CARD", "REPLACE_CARD", "MANAGE_FINANCIAL_RULES"],
  CARD_ISSUER: ["ISSUE_CARD", "ACTIVATE_CARD", "REPLACE_CARD"],
  BRANCH_STAFF: ["RECORD_REDEMPTION"],
  PARTNER_MANAGER: [],
  SUPPORT: ["SUSPEND_CARD"],
  REVIEWER: [],
};

export function canPerformVipAction(role: StaffRole, action: VipAction): boolean {
  return allowedRoleActions[role].includes(action);
}

const cardTransitions: Record<CardStatus, readonly CardStatus[]> = {
  NEW: ["ACTIVE", "SUSPENDED"],
  ACTIVE: ["SUSPENDED", "EXPIRED", "LOST", "FULLY_USED"],
  SUSPENDED: ["ACTIVE", "EXPIRED", "LOST"],
  EXPIRED: [],
  LOST: ["REPLACED"],
  REPLACED: [],
  FULLY_USED: [],
};

export function canTransitionCardStatus(from: CardStatus, to: CardStatus): boolean {
  return cardTransitions[from].includes(to);
}

export type PublicCardRecord = {
  serialNumber: string;
  cardTypeNameAr: string;
  status: CardStatus;
  expiresAt?: string;
};

export type PublicCardVerification = {
  valid: boolean;
  serialSuffix: string;
  cardTypeNameAr: string;
  status: CardStatus;
  expiresAt?: string;
};

export function toPublicCardVerification(card: PublicCardRecord, now: string): PublicCardVerification {
  const expires = card.expiresAt ? Date.parse(card.expiresAt) : Number.POSITIVE_INFINITY;
  const checkedAt = Date.parse(now);
  const expired = Number.isFinite(checkedAt) && expires <= checkedAt;
  const status: CardStatus = card.status === "ACTIVE" && expired ? "EXPIRED" : card.status;
  return {
    valid: status === "ACTIVE",
    serialSuffix: card.serialNumber.slice(-4),
    cardTypeNameAr: card.cardTypeNameAr,
    status,
    ...(card.expiresAt ? { expiresAt: card.expiresAt } : {}),
  };
}

export function calculatePointsBalance(entries: PointsEntry[], customerId: string, asOf: string): PointsBalance {
  const seen = new Set<string>();
  const result: PointsBalance = { pending: 0, available: 0, expired: 0 };
  const timestamp = Date.parse(asOf);
  if (!Number.isFinite(timestamp)) return result;

  for (const entry of entries) {
    if (entry.customerId !== customerId || seen.has(entry.referenceId) || !Number.isSafeInteger(entry.points)) continue;
    seen.add(entry.referenceId);
    if (entry.state === "REVERSED") continue;
    if (entry.expiresAt && Date.parse(entry.expiresAt) <= timestamp && entry.points > 0) {
      result.expired += entry.points;
    } else if (entry.state === "PENDING") {
      result.pending += entry.points;
    } else {
      result.available += entry.points;
    }
  }

  result.pending = Math.max(0, result.pending);
  result.available = Math.max(0, result.available);
  result.expired = Math.max(0, result.expired);
  return result;
}
