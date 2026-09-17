-- Omran Trading Company - Mobile OTP auth persistence for PR 5.
-- PostgreSQL 14+. Stores hashes only; plaintext OTP/session tokens are never persisted.

BEGIN;

CREATE TABLE otp_challenges (
  challenge_id text PRIMARY KEY,
  code_hash char(64) NOT NULL,
  mobile text NOT NULL,
  domain text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  resend_available_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  version smallint NOT NULL DEFAULT 1,
  CONSTRAINT otp_challenges_domain_check CHECK (domain IN ('CUSTOMER','EMPLOYEE')),
  CONSTRAINT otp_challenges_attempts_check CHECK (attempts >= 0 AND attempts <= 5),
  CONSTRAINT otp_challenges_hash_check CHECK (code_hash ~ '^[0-9a-f]{64}$')
);

CREATE TABLE auth_sessions (
  session_id text PRIMARY KEY,
  token_hash char(64) NOT NULL UNIQUE,
  domain text NOT NULL,
  customer_id text REFERENCES customers(customer_id) ON DELETE CASCADE,
  employee_id text REFERENCES employees(employee_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  CONSTRAINT auth_sessions_domain_check CHECK (domain IN ('CUSTOMER','EMPLOYEE')),
  CONSTRAINT auth_sessions_subject_check CHECK (
    (domain = 'CUSTOMER' AND customer_id IS NOT NULL AND employee_id IS NULL)
    OR (domain = 'EMPLOYEE' AND employee_id IS NOT NULL AND customer_id IS NULL)
  ),
  CONSTRAINT auth_sessions_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT auth_sessions_expiry_check CHECK (expires_at > created_at)
);

CREATE TABLE auth_rate_limits (
  bucket_key text PRIMARY KEY,
  request_count integer NOT NULL,
  window_started_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CONSTRAINT auth_rate_limits_count_check CHECK (request_count >= 0)
);

CREATE INDEX otp_challenges_mobile_time_idx ON otp_challenges(mobile, created_at DESC);
CREATE INDEX otp_challenges_expiry_idx ON otp_challenges(expires_at) WHERE consumed = false;
CREATE INDEX auth_sessions_customer_idx ON auth_sessions(customer_id, expires_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX auth_sessions_employee_idx ON auth_sessions(employee_id, expires_at DESC) WHERE employee_id IS NOT NULL;
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX auth_rate_limits_expiry_idx ON auth_rate_limits(expires_at);

COMMIT;
