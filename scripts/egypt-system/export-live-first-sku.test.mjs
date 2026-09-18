import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ps = fs.readFileSync(new URL("./export-live-first-sku.ps1", import.meta.url), "utf8");
const sql = fs.readFileSync(new URL("../../database/egypt-system-readonly/verify-first-sku.sql", import.meta.url), "utf8");

test("live exporter uses Windows authentication and read-only query input", () => {
  assert.match(ps, /"-E"/);
  assert.match(ps, /verify-first-sku\.sql/);
  assert.doesNotMatch(ps, /-P\b|-U\b/);
});

test("verification SQL contains no write/admin verbs", () => {
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|TRUNCATE|CREATE|EXEC(?:UTE)?|DBCC|BACKUP|RESTORE)\b/i);
  assert.match(sql, /FROM ESStoreDbo\.RptTransactions/i);
});

test("exporter produces CSV and rejects empty output", () => {
  assert.match(ps, /Export-Csv/);
  assert.match(ps, /SQL_EXPORT_EMPTY/);
});