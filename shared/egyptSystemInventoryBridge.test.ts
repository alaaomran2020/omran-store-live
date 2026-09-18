import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const path = fileURLToPath(new URL("../database/003_egypt_system_inventory_bridge.sql", import.meta.url));
const sql = readFileSync(path, "utf8");

describe("Egypt System inventory bridge", () => {
  it("is fail-closed until quantity lineage and operational identifiers are verified", () => {
    expect(sql).toContain("DEFAULT 'UNVERIFIED'");
    expect(sql).toContain("WHERE s.lineage_status='VERIFIED'");
    expect(sql).toContain("s.product_id IS NOT NULL");
    expect(sql).toContain("qty_source = 'TRANS_DETAILS_QTY'");
    expect(sql).toContain("source_transaction_id IS NOT NULL");
    expect(sql).toContain("source_detail_id IS NOT NULL");
    expect(sql).toContain("source_item_package_id IS NOT NULL");
  });

  it("preserves the evidenced RptItemCard direction map", () => {
    for (const type of [1, 3, 23, 31]) expect(sql).toContain(`(${type},'IN'`);
    for (const type of [2, 4, 22, 32]) expect(sql).toContain(`(${type},'OUT'`);
    for (const type of [5, 6, 101]) expect(sql).toContain(`(${type},'SIGNED'`);
  });
});