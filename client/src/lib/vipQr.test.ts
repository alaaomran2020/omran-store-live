import { describe, expect, it } from "vitest";
import {
  createVipQrMatrix,
  createVipQrSvg,
  normalizeCardSerial,
  VIP_QR_PREFIX,
} from "./vipQr";

describe("experimental local VIP QR", () => {
  it("normalizes supported serials and rejects unsafe input", () => {
    expect(normalizeCardSerial(" omr-vip-0001 ")).toBe("OMR-VIP-0001");
    expect(normalizeCardSerial("bad serial")).toBeNull();
    expect(normalizeCardSerial("123")).toBeNull();
  });

  it("generates a square QR matrix for the namespaced serial", () => {
    const result = createVipQrMatrix("OMR-VIP-0001");
    expect(result?.payload).toBe(`${VIP_QR_PREFIX}OMR-VIP-0001`);
    expect(result!.modules.length).toBeGreaterThanOrEqual(21);
    expect(
      result!.modules.every(row => row.length === result!.modules.length)
    ).toBe(true);
  });

  it("creates a self-contained SVG without a remote request", () => {
    const svg = createVipQrSvg("OMR-VIP-0001");
    expect(svg).toContain("<svg");
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).not.toContain("http://api");
  });
});
