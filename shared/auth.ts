import type { CustomerStatus, IdentityDomain, SessionIdentity } from "./identity";
import type { EmployeeRole, EmployeeStatus } from "./rbac";
import { normalizeEgyptianMobile } from "./mobile";
import {
  OTP_MAX_WRONG_ATTEMPTS,
  OTP_RATE_LIMIT_MAX_PER_IP,
  OTP_RATE_LIMIT_MAX_REQUESTS,
  OTP_RATE_LIMIT_WINDOW_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  createOtpChallenge,
  evaluateRateLimit,
  generateOtpCode,
  recordRateHit,
  timingSafeEqualHex,
  verifyOtpChallenge,
  type OtpStoredChallenge,
  type RateBucket,
} from "./otp";

export const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthSubject =
  | { domain: "CUSTOMER"; subjectId: string; mobile: string; fullName: string | null; status: CustomerStatus }
  | { domain: "EMPLOYEE"; subjectId: string; mobile: string; fullName: string; role: EmployeeRole; status: EmployeeStatus };

export type AuthSessionRecord = {
  sessionId: string;
  tokenHash: string;
  domain: IdentityDomain;
  subjectId: string;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

export type OtpDelivery = {
  send(input: { mobile: string; code: string; domain: IdentityDomain }): Promise<void>;
};

export type AuthRepository = {
  findSubjectByMobile(domain: IdentityDomain, mobile: string): Promise<AuthSubject | null>;
  getChallenge(challengeId: string): Promise<OtpStoredChallenge | null>;
  saveChallenge(challenge: OtpStoredChallenge): Promise<void>;
  getRateBucket(key: string): Promise<RateBucket | null>;
  saveRateBucket(key: string, bucket: RateBucket, expiresAt: number): Promise<void>;
  createCustomerForMobile(mobile: string, now: number): Promise<AuthSubject & { domain: "CUSTOMER" }>;
  markMobileVerified(domain: IdentityDomain, subjectId: string, now: number): Promise<void>;
  saveSession(session: AuthSessionRecord): Promise<void>;
  getSession(sessionId: string): Promise<AuthSessionRecord | null>;
  revokeSession(sessionId: string, now: number): Promise<void>;
  findSubjectById(domain: IdentityDomain, subjectId: string): Promise<AuthSubject | null>;
};

export type AuthCrypto = {
  randomBytes(length: number): Uint8Array;
  randomId(): string;
};

export type OtpRequestResult = { challengeId: string; expiresInSeconds: number; resendInSeconds: number };
export type OtpRequestFailure =
  | { ok: false; code: "RATE_LIMITED"; retryAfterSeconds: number }
  | { ok: false; code: "INVALID_MOBILE" | "EMPLOYEE_NOT_INVITED" | "EMPLOYEE_DISABLED" | "DELIVERY_UNAVAILABLE" };
export type OtpVerifyFailure = {
  ok: false;
  code: "INVALID_CODE" | "EXPIRED_CODE" | "TOO_MANY_ATTEMPTS" | "EMPLOYEE_NOT_INVITED" | "EMPLOYEE_DISABLED";
};

function rateKey(kind: "mobile" | "ip", value: string): string {
  return `otp:${kind}:${value}`;
}

export async function requestOtpCore(input: {
  repository: AuthRepository;
  delivery: OtpDelivery;
  crypto: AuthCrypto;
  domain: IdentityDomain;
  mobile: string;
  ip: string;
  now?: number;
}): Promise<{ ok: true; value: OtpRequestResult } | OtpRequestFailure> {
  const now = input.now ?? Date.now();
  const mobile = normalizeEgyptianMobile(input.mobile);
  if (!mobile) return { ok: false, code: "INVALID_MOBILE" };
  const mobileKey = rateKey("mobile", mobile);
  const ipKey = rateKey("ip", input.ip);
  const [mobileBucket, ipBucket] = await Promise.all([
    input.repository.getRateBucket(mobileKey),
    input.repository.getRateBucket(ipKey),
  ]);
  const mobileDecision = evaluateRateLimit(mobileBucket, now, OTP_RATE_LIMIT_MAX_REQUESTS);
  if (!mobileDecision.allowed) return { ok: false, code: "RATE_LIMITED", retryAfterSeconds: mobileDecision.retryAfterSeconds };
  const ipDecision = evaluateRateLimit(ipBucket, now, OTP_RATE_LIMIT_MAX_PER_IP);
  if (!ipDecision.allowed) return { ok: false, code: "RATE_LIMITED", retryAfterSeconds: ipDecision.retryAfterSeconds };

  const existing = await input.repository.findSubjectByMobile(input.domain, mobile);
  if (input.domain === "EMPLOYEE") {
    if (!existing || existing.domain !== "EMPLOYEE") return { ok: false, code: "EMPLOYEE_NOT_INVITED" };
    if (existing.status !== "ACTIVE" && existing.status !== "INVITED") return { ok: false, code: "EMPLOYEE_DISABLED" };
  }

  const code = generateOtpCode(input.crypto.randomBytes);
  const challenge = await createOtpChallenge({
    mobile,
    domain: input.domain,
    code,
    now,
    challengeId: input.crypto.randomId(),
  });
  try {
    await Promise.all([
      input.repository.saveChallenge(challenge),
      input.repository.saveRateBucket(mobileKey, recordRateHit(mobileBucket, now), now + OTP_RATE_LIMIT_WINDOW_MS),
      input.repository.saveRateBucket(ipKey, recordRateHit(ipBucket, now), now + OTP_RATE_LIMIT_WINDOW_MS),
    ]);
    await input.delivery.send({ mobile, code, domain: input.domain });
  } catch {
    await input.repository.saveChallenge({ ...challenge, consumed: true });
    return { ok: false, code: "DELIVERY_UNAVAILABLE" };
  }

  return {
    ok: true,
    value: {
      challengeId: challenge.challengeId,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendInSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    },
  };
}

export async function verifyOtpCore(input: {
  repository: AuthRepository;
  crypto: AuthCrypto;
  domain: IdentityDomain;
  challengeId: string;
  code: string;
  now?: number;
}): Promise<{ ok: true; identity: SessionIdentity; sessionToken: string; session: AuthSessionRecord } | OtpVerifyFailure> {
  const now = input.now ?? Date.now();
  const challenge = await input.repository.getChallenge(input.challengeId);
  if (!challenge || challenge.domain !== input.domain) return { ok: false, code: "INVALID_CODE" };

  const result = await verifyOtpChallenge(challenge, input.code, now);
  await input.repository.saveChallenge(result.challenge);
  if (result.outcome !== "OK") {
    if (result.outcome === "EXPIRED") return { ok: false, code: "EXPIRED_CODE" };
    if (result.outcome === "TOO_MANY_ATTEMPTS") return { ok: false, code: "TOO_MANY_ATTEMPTS" };
    return { ok: false, code: "INVALID_CODE" };
  }

  let subject = await input.repository.findSubjectByMobile(input.domain, challenge.mobile);
  if (input.domain === "CUSTOMER" && !subject) subject = await input.repository.createCustomerForMobile(challenge.mobile, now);
  if (!subject || subject.domain !== input.domain) return { ok: false, code: "EMPLOYEE_NOT_INVITED" };
  if (subject.domain === "EMPLOYEE" && subject.status !== "ACTIVE" && subject.status !== "INVITED") {
    return { ok: false, code: "EMPLOYEE_DISABLED" };
  }

  await input.repository.markMobileVerified(input.domain, subject.subjectId, now);
  const sessionToken = bytesToHex(input.crypto.randomBytes(32));
  const sessionId = input.crypto.randomId();
  const tokenHash = await hashSessionToken(sessionToken, sessionId);
  const session: AuthSessionRecord = {
    sessionId,
    tokenHash,
    domain: input.domain,
    subjectId: subject.subjectId,
    createdAt: now,
    expiresAt: now + AUTH_SESSION_TTL_MS,
    revokedAt: null,
  };
  await input.repository.saveSession(session);

  const identity = identityFromSubject(subject, now, session.expiresAt);
  return { ok: true, identity, sessionToken, session };
}

export function parseSessionCookieValue(value: string | null | undefined): { sessionId: string; token: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length != 2) return null;
  const [sessionId, token] = parts;
  if (!sessionId || !/^[0-9a-f]{64}$/.test(token)) return null;
  return { sessionId, token };
}

export async function validateSessionCore(input: {
  repository: AuthRepository;
  domain: IdentityDomain;
  cookieValue: string | null | undefined;
  now?: number;
}): Promise<SessionIdentity | null> {
  const parsed = parseSessionCookieValue(input.cookieValue);
  if (!parsed) return null;
  const now = input.now ?? Date.now();
  const session = await input.repository.getSession(parsed.sessionId);
  if (!session || session.domain !== input.domain || session.revokedAt !== null || session.expiresAt <= now) return null;
  const candidateHash = await hashSessionToken(parsed.token, session.sessionId);
  if (!timingSafeEqualHex(candidateHash, session.tokenHash)) return null;
  const subject = await input.repository.findSubjectById(session.domain, session.subjectId);
  if (!subject || subject.domain !== session.domain) return null;
  if (subject.domain === "EMPLOYEE" && subject.status !== "ACTIVE") return null;
  if (subject.domain === "CUSTOMER" && subject.status === "SUSPENDED") return null;
  return identityFromSubject(subject, session.createdAt, session.expiresAt);
}

export async function logoutSessionCore(input: {
  repository: AuthRepository;
  domain: IdentityDomain;
  cookieValue: string | null | undefined;
  now?: number;
}): Promise<void> {
  const parsed = parseSessionCookieValue(input.cookieValue);
  if (!parsed) return;
  const session = await input.repository.getSession(parsed.sessionId);
  if (!session || session.domain !== input.domain) return;
  await input.repository.revokeSession(session.sessionId, input.now ?? Date.now());
}

function identityFromSubject(subject: AuthSubject, issuedAtMs: number, expiresAtMs: number): SessionIdentity {
  const issuedAt = new Date(issuedAtMs).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();
  return subject.domain === "EMPLOYEE"
    ? { domain: "EMPLOYEE", subject: subject.subjectId, role: subject.role, status: subject.status, fullName: subject.fullName, mobile: subject.mobile, issuedAt, expiresAt }
    : { domain: "CUSTOMER", subject: subject.subjectId, status: subject.status, fullName: subject.fullName, maskedMobile: maskSessionMobile(subject.mobile), issuedAt, expiresAt };
}

export function sessionCookieName(domain: IdentityDomain): string {
  return domain === "EMPLOYEE" ? "__Host-omran_employee_session" : "__Host-omran_customer_session";
}

export function buildSessionCookie(domain: IdentityDomain, sessionId: string, sessionToken: string, maxAgeSeconds: number): string {
  const value = `${sessionId}.${sessionToken}`;
  return `${sessionCookieName(domain)}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`;
}

export function buildLogoutCookie(domain: IdentityDomain): string {
  return `${sessionCookieName(domain)}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function hashSessionToken(token: string, sessionId: string): Promise<string> {
  const payload = new TextEncoder().encode(`${token}:${sessionId}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function maskSessionMobile(mobile: string): string {
  if (mobile.length < 7) return "***";
  return `${mobile.slice(0, 5)}****${mobile.slice(-3)}`;
}

export const AUTH_POLICY = {
  otpMaxWrongAttempts: OTP_MAX_WRONG_ATTEMPTS,
  otpTtlMs: OTP_TTL_MS,
  sessionTtlMs: AUTH_SESSION_TTL_MS,
} as const;
