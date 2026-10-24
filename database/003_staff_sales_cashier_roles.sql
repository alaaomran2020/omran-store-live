-- Omran Store / Manual migration for PostgreSQL 14+.
-- Review-only: NEVER executed automatically. Do not apply to D1/SQLite.
-- Existing schema database/001_unified_schema.sql uses employees_role_check.
-- Run only on a verified PostgreSQL employees table, after backup and server-side
-- enforcement of OWNER-only account management has been installed.
BEGIN;
ALTER TABLE employees DROP CONSTRAINT employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (
  role IN (
    'OWNER', 'ADMIN', 'SALES_WAREHOUSE_MANAGER', 'SALES_MANAGER', 'CASHIER',
    'CATALOG_MANAGER', 'INVENTORY_STAFF', 'CONTENT_EDITOR', 'VIEWER'
  )
);
COMMIT;
