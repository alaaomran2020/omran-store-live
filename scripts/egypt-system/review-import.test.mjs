import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stageExport, approveQueue, parseCsv } from "./review-import.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");

async function sampleExport(items = [
  { Item_Id: "370", Item_Package_Id: "91", Item_Name_AR: "فانوس رمضان", Barcode: "6221000000111", Category_AR: "فوانيس رمضان", PurchasePrice: "500", WholesalePrice: "850" },
]) {
  const root = await mkdtemp(join(tmpdir(), "omran-es-test-"));
  const current = join(root, "current");
  await mkdir(current);
  const headers = ["Item_Id", "Item_Package_Id", "Item_Name_AR", "Barcode", "Category_AR", "PurchasePrice", "WholesalePrice"];
  const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const itemCsv = Buffer.from([headers.join(","), ...items.map(row => headers.map(key => escape(row[key])).join(","))].join("\r\n") + "\r\n", "utf8");
  const stockCsv = Buffer.from("Item_Package_Id,Store_Id,OnHandQty\r\n91,2,3\r\n", "utf8");
  await writeFile(join(current, "items.csv"), itemCsv);
  await writeFile(join(current, "stock_by_branch.csv"), stockCsv);
  const exportId = `qa_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  const manifest = {
    schema_version: 1, export_id: exportId, source_database: "ESStores", status: "COMPLETE",
    snapshot_timestamp_utc: new Date().toISOString(),
    checksums: { "items.csv": sha(itemCsv), "stock_by_branch.csv": sha(stockCsv) },
    counts: { items: items.length, stock_by_branch: 1 },
  };
  await writeFile(join(current, "manifest.json"), JSON.stringify(manifest));
  return { root, current, manifest };
}

test("CSV reader preserves Arabic commas and escaped quotes", () => {
  assert.deepEqual(parseCsv('name,note\r\n"مطبخ, ألعاب","قال ""أيوه"""\r\n'), [
    { name: "مطبخ, ألعاب", note: 'قال "أيوه"' },
  ]);
});

test("staging is private, always needs review, and drops prices", async () => {
  const { root } = await sampleExport();
  const { path } = await stageExport(root, join(root, "private"));
  const queue = JSON.parse(await readFile(path, "utf8"));
  assert.equal(queue.status, "REVIEW_REQUIRED");
  assert.equal(queue.records[0].state, "NEEDS_REVIEW");
  assert.deepEqual(queue.records[0].issues, ["PHOTO_QA_REQUIRED"]);
  assert.equal(queue.records[0].proposed_public_id, "ES-370-91");
  assert.doesNotMatch(JSON.stringify(queue.records), /(?:PurchasePrice|WholesalePrice|"price"|"stock_quantity")/i);
});

test("checksum mismatch and reused barcodes fail closed", async () => {
  const original = await sampleExport();
  await writeFile(join(original.current, "items.csv"), "modified,after,manifest\n");
  await assert.rejects(stageExport(original.root, join(original.root, "private")), /Checksum mismatch/);
  const duplicated = await sampleExport([
    { Item_Id: "370", Item_Package_Id: "91", Item_Name_AR: "مطبخ", Barcode: "111", Category_AR: "ألعاب" },
    { Item_Id: "371", Item_Package_Id: "92", Item_Name_AR: "لعبة", Barcode: "111", Category_AR: "ألعاب" },
  ]);
  await assert.rejects(stageExport(duplicated.root, join(duplicated.root, "private")), /Duplicate barcode/);
});

test("approval requires exact queue, explicit QA and existing approved public image; still cannot publish", async () => {
  const { root, manifest } = await sampleExport();
  const { path, queue_digest } = await stageExport(root, join(root, "private"));
  const approvals = join(root, "approvals.json");
  const decisions = {
    export_id: manifest.export_id, queue_digest,
    decisions: [{
      key: "370:91", decision: "APPROVE", barcode_verified: true,
      package_verified: true, photo_verified: true, category_verified: true,
      approved_by: "QA owner", approved_at: new Date().toISOString(),
      public_image: "/products/processed/ramadan/ramadan-fanous-001.jpg",
    }],
  };
  await writeFile(approvals, JSON.stringify({ ...decisions, queue_digest: "bad" }));
  await assert.rejects(approveQueue(path, approvals, join(root, "approved")), /exact export and queue digest/);
  await writeFile(approvals, JSON.stringify(decisions));
  const result = await approveQueue(path, approvals, join(root, "approved"));
  assert.equal(result.approved_count, 1);
  const proposal = JSON.parse(await readFile(result.path, "utf8"));
  assert.equal(proposal.status, "PRIVATE_PROPOSAL_NOT_PUBLISHED");
  assert.equal(proposal.products[0].approval, "APPROVED_FOR_MANUAL_PR_ONLY");
  assert.equal(proposal.products[0].name, "فانوس رمضان");
  assert.doesNotMatch(JSON.stringify(proposal.products), /(?:PurchasePrice|WholesalePrice|"price"|"stock_quantity")/i);
});
