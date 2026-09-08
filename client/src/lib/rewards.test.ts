import { describe, expect, it } from "vitest";
import { purchasePoints, rewardBalance } from "./rewards";

describe("rewards fail-closed rules", () => {
  it("لا يمنح نقاطًا قبل اعتماد السياسة", () => expect(purchasePoints(1000)).toBe(0));
  it("يمنع تكرار المرجع ويسوي المرتجع", () => expect(rewardBalance([
    { id: "1", customerId: "c", referenceId: "order-1", points: 100, kind: "purchase", verified: true },
    { id: "2", customerId: "c", referenceId: "order-1", points: 100, kind: "purchase", verified: true },
    { id: "3", customerId: "c", referenceId: "return-1", points: -100, kind: "return_reversal", verified: true },
  ])).toBe(0));
});
