import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const path = fileURLToPath(new URL("../database/002_mobile_otp_auth.sql", import.meta.url));
const sql = readFileSync(path, "utf8");

describe("PR 5 auth SQL contract", () => {
  it("defines OTP, session and rate-limit persistence", () => {
    expect(sql).toContain("CREATE TABLE otp_challenges");
    expect(sql).toContain("CREATE TABLE auth_sessions");
    expect(sql).toContain("CREATE TABLE auth_rate_limits");
  });

  it("stores hashes rather than plaintext codes or session tokens", () => {
    expect(sql).toContain("code_hash char(64) NOT NULL");
    expect(sql).toContain("token_hash char(64) NOT NULL UNIQUE");
    expect(sql).not.toMatch(/\botp_code\b|\bplain(?:text)?_code\b|\bsession_token\b/i);
  });

  it("keeps customer and employee domains separated", () => {
    expect(sql).toContain("domain IN ('CUSTOMER','EMPLOYEE')");
  });

  it("binds sessions to the existing customer or employee tables", () => {
    expect(sql).toContain("customer_id text REFERENCES customers(customer_id)");
    expect(sql).toContain("employee_id text REFERENCES employees(employee_id)");
    expect(sql).toContain("auth_sessions_subject_check");
  });
});
