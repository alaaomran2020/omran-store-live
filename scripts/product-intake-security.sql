-- Dedicated private intake D1 database. No catalog or customer data changes.
CREATE TABLE IF NOT EXISTS product_intake_rate (
  key TEXT PRIMARY KEY, minute INTEGER NOT NULL, hits INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_intake_rate_minute ON product_intake_rate(minute);
CREATE TABLE IF NOT EXISTS product_intake_requests (
  intake_id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PENDING','SENT','UNKNOWN')),
  created_at TEXT NOT NULL,
  receipt_json TEXT
);
