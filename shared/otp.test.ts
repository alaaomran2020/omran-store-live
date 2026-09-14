import { describe, expect, it } from "vitest";
import {
  canResendChallenge,
  createOtpChallenge,
  evaluateRateLimit,
  generateOtpCode,
  isOtpCodeShape,
  OTP_CODE_LENGTH,
  OTP_MAX_WRONG_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  recordRateHit,
  resendCooldownSeconds,
  verifyOtpChallenge,
  type OtpStoredChallenge,
} from "./otp";

function fakeRandom(values: number[]) {
  let i = 0;
  return (length: number) => {
    const out = new Uint8Array(length);
    for (let n = 0; n < length; n += 1) out[n] = values[i++ % values.length]!;
    return out;
  };
}

describe("OTP generation", () => {
  it("produces exactly 6 digits", () => {
    const code = generateOtpCode(fakeRandom([0, 25, 99, 125, 250, 255]));
    expect(code).toHaveLength(OTP_CODE_LENGTH);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("rejects biased bytes above the rejection ceiling", () => {
    // 250..255 are rejected; next accepted sequence yields deterministic digits
    const code = generateOtpCode(fakeRandom([255, 254, 253, 252, 251, 250, 22, 20, 30, 40, 50, 60]));
    expect(code).toBe("200000");
  });

  it("validates code shape", () => {
    expect(isOtpCodeShape("123456")).toBe(true);
    expect(isOtpCodeShape("12345")).toBe(false);
    expect(isOtpCodeShape("12345a")).toBe(false);
  });
});

describe("OTP challenge lifecycle", () => {
  const t0 = 1_000_000;

  async function challengeWith(code = "482913"): Promise<OtpStoredChallenge> {
    return createOtpChallenge({ mobile: "+201012345678", domain: "CUSTOMER", code, now: t0 });
  }

  it("does not store the plaintext code", async () => {
    const challenge = await challengeWith("482913");
    expect(JSON.stringify(challenge)).not.toContain("482913");
    expect(challenge.codeHash).toHaveLength(64);
    expect(challenge.expiresAt - challenge.createdAt).toBe(OTP_TTL_MS);
  });

  it("accepts the correct code exactly once (replay blocked)", async () => {
    const challenge = await challengeWith();
    const first = await verifyOtpChallenge(challenge, "482913", t0 + 1000);
    expect(first.outcome).toBe("OK");
    expect(first.challenge.consumed).toBe(true);
    const replay = await verifyOtpChallenge(first.challenge, "482913", t0 + 2000);
    expect(replay.outcome).toBe("ALREADY_USED");
  });

  it("rejects wrong codes and burns the challenge after the attempt limit", async () => {
    let challenge = await challengeWith();
    for (let i = 1; i < OTP_MAX_WRONG_ATTEMPTS; i += 1) {
      const result = await verifyOtpChallenge(challenge, "000000", t0 + 1000 * i);
      expect(result.outcome).toBe("INVALID");
      expect(result.challenge.attempts).toBe(i);
      challenge = result.challenge;
    }
    const final = await verifyOtpChallenge(challenge, "000000", t0 + 10_000);
    expect(final.outcome).toBe("TOO_MANY_ATTEMPTS");
    expect(final.challenge.consumed).toBe(true);
    // حتى الرمز الصحيح بعد استنزاف المحاولات مرفوض
    const afterBurn = await verifyOtpChallenge(final.challenge, "482913", t0 + 11_000);
    expect(afterBurn.outcome).toBe("ALREADY_USED");
  });

  it("expires codes after the TTL", async () => {
    const challenge = await challengeWith();
    const expired = await verifyOtpChallenge(challenge, "482913", t0 + OTP_TTL_MS + 1);
    expect(expired.outcome).toBe("EXPIRED");
    expect(expired.challenge.consumed).toBe(true);
  });

  it("handles missing challenges as fail-closed", async () => {
    const result = await verifyOtpChallenge(null, "482913", t0);
    expect(result.outcome).toBe("CHALLENGE_NOT_FOUND");
  });

  it("rejects malformed codes without leaking", async () => {
    const challenge = await challengeWith();
    const result = await verifyOtpChallenge(challenge, "abc", t0);
    expect(result.outcome).toBe("INVALID");
  });

  it("enforces resend cooldown", async () => {
    const challenge = await challengeWith();
    expect(canResendChallenge(challenge, t0)).toBe(false);
    expect(canResendChallenge(challenge, t0 + OTP_RESEND_COOLDOWN_MS)).toBe(true);
    expect(resendCooldownSeconds(challenge, t0)).toBe(45);
    expect(canResendChallenge({ ...challenge, consumed: true }, t0)).toBe(true);
  });
});

describe("OTP rate limiting", () => {
  it("allows up to the maximum and then blocks with retry time", () => {
    const t0 = 5_000_000;
    let bucket = null;
    for (let i = 0; i < 5; i += 1) {
      const decision = evaluateRateLimit(bucket, t0, 5, 900_000);
      expect(decision.allowed).toBe(true);
      bucket = recordRateHit(bucket, t0, 900_000);
    }
    const blocked = evaluateRateLimit(bucket, t0 + 100_000, 5, 900_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // بعد انتهاء النافذة يُسمح من جديد
    const reset = evaluateRateLimit(bucket, t0 + 900_001, 5, 900_000);
    expect(reset.allowed).toBe(true);
  });
});
