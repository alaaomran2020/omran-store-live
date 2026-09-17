import { describe, expect, it } from "vitest";
import {
  AUTH_SESSION_TTL_MS,
  buildLogoutCookie,
  buildSessionCookie,
  hashSessionToken,
  logoutSessionCore,
  requestOtpCore,
  validateSessionCore,
  verifyOtpCore,
  type AuthRepository,
  type AuthSessionRecord,
} from "./auth";
import type { OtpStoredChallenge, RateBucket } from "./otp";

function cryptoFixture() {
  let id = 0;
  return {
    randomBytes(length: number) {
      return new Uint8Array(Array.from({ length }, (_, index) => (index + 11) % 250));
    },
    randomId() {
      id += 1;
      return `id-${id}`;
    },
  };
}

function repositoryFixture(initialSubject: Awaited<ReturnType<AuthRepository["findSubjectByMobile"]>> = null) {
  const challenges = new Map<string, OtpStoredChallenge>();
  const buckets = new Map<string, RateBucket>();
  const sessions = new Map<string, AuthSessionRecord>();
  let subject = initialSubject;
  const repository: AuthRepository = {
    async findSubjectByMobile() { return subject; },
    async findSubjectById(_domain, subjectId) { return subject?.subjectId === subjectId ? subject : null; },
    async getChallenge(id) { return challenges.get(id) ?? null; },
    async saveChallenge(challenge) { challenges.set(challenge.challengeId, challenge); },
    async getRateBucket(key) { return buckets.get(key) ?? null; },
    async saveRateBucket(key, bucket) { buckets.set(key, bucket); },
    async createCustomerForMobile(mobile) {
      subject = { domain: "CUSTOMER", subjectId: "CUS-1", mobile, fullName: null, status: "PENDING_PROFILE" };
      return subject;
    },
    async markMobileVerified() {},
    async saveSession(session) { sessions.set(session.sessionId, session); },
    async getSession(sessionId) { return sessions.get(sessionId) ?? null; },
    async revokeSession(sessionId, now) {
      const current = sessions.get(sessionId);
      if (current) sessions.set(sessionId, { ...current, revokedAt: now });
    },
  };
  return { repository, challenges, buckets, sessions };
}

describe("mobile OTP auth core", () => {
  it("requests OTP without exposing or storing plaintext in the returned view", async () => {
    const fixture = repositoryFixture();
    let delivered = "";
    const result = await requestOtpCore({
      repository: fixture.repository,
      delivery: { async send({ code }) { delivered = code; } },
      crypto: cryptoFixture(),
      domain: "CUSTOMER",
      mobile: "+201012345678",
      ip: "203.0.113.5",
      now: 1_000_000,
    });
    expect(result.ok).toBe(true);
    expect(delivered).toMatch(/^\d{6}$/);
    expect(JSON.stringify(result)).not.toContain(delivered);
    const stored = fixture.challenges.get("id-1")!;
    expect(stored.codeHash).toHaveLength(64);
    expect(JSON.stringify(stored)).not.toContain(delivered);
  });

  it("fails closed for an unknown employee mobile", async () => {
    const fixture = repositoryFixture();
    const result = await requestOtpCore({
      repository: fixture.repository,
      delivery: { async send() { throw new Error("must not send"); } },
      crypto: cryptoFixture(),
      domain: "EMPLOYEE",
      mobile: "+201012345678",
      ip: "203.0.113.5",
      now: 1_000_000,
    });
    expect(result).toEqual({ ok: false, code: "EMPLOYEE_NOT_INVITED" });
  });

  it("verifies OTP, creates customer identity, and persists only a session token hash", async () => {
    const fixture = repositoryFixture();
    let delivered = "";
    const crypto = cryptoFixture();
    const requested = await requestOtpCore({
      repository: fixture.repository,
      delivery: { async send({ code }) { delivered = code; } },
      crypto,
      domain: "CUSTOMER",
      mobile: "+201012345678",
      ip: "203.0.113.5",
      now: 2_000_000,
    });
    if (!requested.ok) throw new Error(requested.code);
    const verified = await verifyOtpCore({
      repository: fixture.repository,
      crypto,
      domain: "CUSTOMER",
      challengeId: requested.value.challengeId,
      code: delivered,
      now: 2_001_000,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.identity.domain).toBe("CUSTOMER");
    expect(verified.session.expiresAt - verified.session.createdAt).toBe(AUTH_SESSION_TTL_MS);
    expect(verified.session.tokenHash).toHaveLength(64);
    expect(verified.session.tokenHash).not.toBe(verified.sessionToken);
    expect(fixture.sessions.size).toBe(1);
  });


  it("normalizes mobile input again on the trusted auth core", async () => {
    const fixture = repositoryFixture();
    let deliveredMobile = "";
    const result = await requestOtpCore({
      repository: fixture.repository,
      delivery: { async send({ mobile }) { deliveredMobile = mobile; } },
      crypto: cryptoFixture(),
      domain: "CUSTOMER",
      mobile: "01012345678",
      ip: "203.0.113.8",
      now: 3_000_000,
    });
    expect(result.ok).toBe(true);
    expect(deliveredMobile).toBe("+201012345678");
  });

  it("validates and revokes a server-side session from the hardened cookie value", async () => {
    const fixture = repositoryFixture();
    let delivered = "";
    const crypto = cryptoFixture();
    const requested = await requestOtpCore({
      repository: fixture.repository,
      delivery: { async send({ code }) { delivered = code; } },
      crypto,
      domain: "CUSTOMER",
      mobile: "+201012345678",
      ip: "203.0.113.9",
      now: 4_000_000,
    });
    if (!requested.ok) throw new Error(requested.code);
    const verified = await verifyOtpCore({
      repository: fixture.repository,
      crypto,
      domain: "CUSTOMER",
      challengeId: requested.value.challengeId,
      code: delivered,
      now: 4_001_000,
    });
    if (!verified.ok) throw new Error(verified.code);
    const cookieValue = `${verified.session.sessionId}.${verified.sessionToken}`;
    expect(await validateSessionCore({ repository: fixture.repository, domain: "CUSTOMER", cookieValue, now: 4_002_000 })).toMatchObject({ domain: "CUSTOMER", subject: "CUS-1" });
    await logoutSessionCore({ repository: fixture.repository, domain: "CUSTOMER", cookieValue, now: 4_003_000 });
    expect(await validateSessionCore({ repository: fixture.repository, domain: "CUSTOMER", cookieValue, now: 4_004_000 })).toBeNull();
  });

  it("uses hardened HttpOnly Secure SameSite cookies", () => {
    const cookie = buildSessionCookie("CUSTOMER", "s1", "token", 3600);
    expect(cookie).toContain("__Host-omran_customer_session=s1.token");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(buildLogoutCookie("CUSTOMER")).toContain("Max-Age=0");
  });

  it("hashes session tokens bound to their session id", async () => {
    const first = await hashSessionToken("same-token", "session-a");
    const second = await hashSessionToken("same-token", "session-b");
    expect(first).toHaveLength(64);
    expect(first).not.toBe(second);
  });
});
