export type RewardsPolicy = {
  enabled: boolean;
  pointsPerEgp: number | null;
  egpPerPoint: number | null;
  minimumRedemptionPoints: number | null;
  expiresAfterDays: number | null;
};

export const REWARDS_POLICY: RewardsPolicy = {
  enabled: false,
  pointsPerEgp: null,
  egpPerPoint: null,
  minimumRedemptionPoints: null,
  expiresAfterDays: null,
};

export type RewardTransaction = { id: string; customerId: string; referenceId: string; points: number; kind: "purchase" | "review" | "review_photo" | "redemption" | "return_reversal"; verified: boolean };

export function rewardBalance(transactions: RewardTransaction[]): number {
  const accepted = new Set<string>();
  return Math.max(0, transactions.reduce((sum, transaction) => {
    if (!transaction.verified || accepted.has(transaction.referenceId)) return sum;
    accepted.add(transaction.referenceId);
    return sum + transaction.points;
  }, 0));
}

export function purchasePoints(amountEgp: number, policy = REWARDS_POLICY): number {
  if (!policy.enabled || policy.pointsPerEgp === null || amountEgp <= 0) return 0;
  return Math.floor(amountEgp * policy.pointsPerEgp);
}
