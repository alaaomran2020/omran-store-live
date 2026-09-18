import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const queryPath = fileURLToPath(new URL("../database/egypt-system-readonly/verify-first-sku.sql", import.meta.url));
const query = readFileSync(queryPath, "utf8");
const candidatePath = fileURLToPath(new URL("../database/egypt-system-readonly/first-sku-candidate.json", import.meta.url));
const candidate = JSON.parse(readFileSync(candidatePath, "utf8"));

describe("Egypt System first SKU verification query", () => {
  it("is strictly read-only", () => {
    expect(query).toMatch(/SELECT TOP 20/i);
    expect(query).not.toMatch(/\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|TRUNCATE|CREATE|EXEC(?:UTE)?)\b/i);
  });

  it("returns every identifier required by the verified inventory gate", () => {
    for (const field of ["Header_Id", "Detail_Id", "Item_Id", "Item_Package_Id", "Store_Id", "Color_Id", "Qty", "CalcQty", "Content"]) {
      expect(query).toContain(field);
    }
    expect(query).toContain("سبورة بروجيكتور");
    expect(query).toContain("20260514");
  });

  it("keeps the first real product candidate unverified until live operational ids exist", () => {
    expect(candidate.canonical_product_id).toBe("POP-PDF-0316098ECE");
    expect(candidate.product_name_ar).toBe("سبورة بروجيكتور");
    expect(candidate.reported_qty).toBe(2);
    expect(candidate.reported_unit_cost_egp).toBe(310);
    expect(candidate.lineage_status).toBe("UNVERIFIED");
    expect(candidate.source_transaction_id).toBeNull();
    expect(candidate.source_detail_id).toBeNull();
    expect(candidate.store_id).toBeNull();
  });
});