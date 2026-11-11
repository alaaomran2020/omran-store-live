#!/usr/bin/env node
/**
 * Offline, read-only Egypt System export consumer. It never connects to SQL,
 * edits the public catalog, or publishes. Every new item remains in REVIEW.
 *
 * stage --source <export-root> [--out <private-dir>]
 * approve --queue <review-queue.json> --decisions <decisions.json> [--out <private-dir>]
 */
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { resolve, join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const defaultOut = join(repo, "automation", "egypt-system", "private-review");
const sha256 = data => createHash("sha256").update(data).digest("hex");
const id = value => String(value ?? "").trim();
const validId = value => /^[0-9]+$/.test(id(value));

/** Strict RFC4180-style CSV reader, including Arabic text, quotes and CRLF. */
export function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let fields = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ",") { fields.push(field); field = ""; }
    else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      if (fields.length || field) rows.push([...fields, field]);
      fields = []; field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field");
  if (fields.length || field) rows.push([...fields, field]);
  if (!rows.length) throw new Error("CSV is empty");
  const headers = rows.shift().map(v => v.trim());
  if (headers.some(v => !v) || new Set(headers).size !== headers.length) throw new Error("Invalid or duplicate CSV headers");
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`Invalid CSV column count on row ${i + 2}`);
    return Object.fromEntries(headers.map((name, j) => [name, values[j].trim()]));
  });
}

function requireColumns(rows, names, label) {
  // The header check is intentionally also enforced for zero-row files.
  const first = rows[0];
  for (const name of names) if (first && !(name in first)) throw new Error(`${label} missing ${name}`);
}

function inside(path, parent) {
  const rel = relative(parent, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

async function privateWrite(out, filename, content) {
  const target = resolve(out);
  if (inside(target, repo) && !inside(target, defaultOut)) {
    throw new Error("In-repository output must stay in the gitignored private-review folder");
  }
  for (const forbidden of [join(repo, "public"), join(repo, "client"), join(repo, "dist"), join(repo, ".github")]) {
    if (inside(target, forbidden)) throw new Error("Output cannot be inside public, client, dist or workflows");
  }
  await mkdir(target, { recursive: true });
  const filenamePath = join(target, filename);
  // No overwrites: each export/approval run is independently auditable.
  await writeFile(filenamePath, JSON.stringify(content, null, 2) + "\n", { flag: "wx" });
  return filenamePath;
}

function manifestKey(file) { return file.replace(/\.csv$/, ""); }

export async function stageExport(source, out = defaultOut) {
  const current = resolve(source, "current");
  const manifest = JSON.parse(await readFile(join(current, "manifest.json"), "utf8"));
  if (manifest.schema_version !== 1 || manifest.source_database !== "ESStores" || manifest.status !== "COMPLETE" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(manifest.export_id ?? "")) {
    throw new Error("Incomplete/unsupported ESStores manifest");
  }
  const exportedAt = Date.parse(manifest.snapshot_timestamp_utc ?? "");
  if (!Number.isFinite(exportedAt) || exportedAt > Date.now() + 5 * 60_000 || Date.now() - exportedAt > 24 * 3600_000) {
    throw new Error("Export timestamp is missing, future or older than 24 hours");
  }
  const files = ["items.csv", "stock_by_branch.csv"];
  const decoded = {};
  for (const filename of files) {
    const bytes = await readFile(join(current, filename));
    const actual = sha256(bytes);
    if (!/^[a-f0-9]{64}$/i.test(manifest.checksums?.[filename] ?? "") || actual !== manifest.checksums[filename].toLowerCase()) {
      throw new Error(`Checksum mismatch: ${filename}`);
    }
    decoded[filename] = parseCsv(bytes.toString("utf8"));
    const count = manifest.counts?.[manifestKey(filename)];
    if (count !== decoded[filename].length) throw new Error(`Row count mismatch: ${filename}`);
  }
  const items = decoded["items.csv"], stock = decoded["stock_by_branch.csv"];
  // Header presence is mandatory even for empty exports.
  for (const name of ["Item_Id", "Item_Package_Id", "Item_Name_AR", "Barcode", "Category_AR"]) {
    if (!items.length) throw new Error("Empty items export; no product review can be staged");
    requireColumns(items, [name], "items.csv");
  }
  requireColumns(stock, ["Item_Package_Id", "Store_Id", "OnHandQty"], "stock_by_branch.csv");

  const byKey = new Map(), barcodes = new Map(), packageOwners = new Map();
  const positiveStocks = new Set(), stockKeys = new Set();
  for (const row of stock) {
    if (!validId(row.Item_Package_Id) || !validId(row.Store_Id) ||
        !Number.isFinite(Number(row.OnHandQty)) || Number(row.OnHandQty) < 0) {
      throw new Error("Invalid stock identifier or quantity; review the office export");
    }
    const key = `${row.Item_Package_Id}:${row.Store_Id}`;
    if (stockKeys.has(key)) throw new Error("Duplicate package/store stock key");
    stockKeys.add(key);
    if (Number(row.OnHandQty) > 0) positiveStocks.add(row.Item_Package_Id);
  }

  for (const row of items) {
    if (!validId(row.Item_Id) || !validId(row.Item_Package_Id)) throw new Error("Invalid Egypt item/package identifier");
    const key = `${row.Item_Id}:${row.Item_Package_Id}`;
    if (byKey.has(key)) throw new Error(`Duplicate item/package identity: ${key}`);
    byKey.set(key, row);
    const pkgOwner = packageOwners.get(row.Item_Package_Id);
    if (pkgOwner && pkgOwner !== row.Item_Id) throw new Error("Package ID belongs to multiple items");
    packageOwners.set(row.Item_Package_Id, row.Item_Id);
    if (row.Barcode) {
      const previous = barcodes.get(row.Barcode);
      if (previous && previous !== key) throw new Error("Duplicate barcode maps to different packages");
      barcodes.set(row.Barcode, key);
    }
  }

  // A verified product photo must be mapped and QA-approved separately. This
  // importer NEVER infers or downloads pictures from a product name.
  const records = items.map(row => {
    const issues = [];
    if (!row.Item_Name_AR) issues.push("MISSING_ARABIC_NAME");
    if (!row.Barcode) issues.push("BARCODE_NOT_VERIFIED");
    if (!row.Category_AR) issues.push("CATEGORY_NOT_VERIFIED");
    if (!positiveStocks.has(row.Item_Package_Id)) issues.push("NO_VERIFIED_POSITIVE_STOCK");
    issues.push("PHOTO_QA_REQUIRED");
    return {
      key: `${row.Item_Id}:${row.Item_Package_Id}`,
      item_id: row.Item_Id,
      item_package_id: row.Item_Package_Id,
      arabic_name: row.Item_Name_AR,
      barcode: row.Barcode,
      category: row.Category_AR,
      proposed_public_id: `ES-${row.Item_Id}-${row.Item_Package_Id}`,
      state: "NEEDS_REVIEW",
      issues,
    };
  });
  const queue = {
    schema_version: 1, source: "EGYPT_SYSTEM_READ_ONLY_EXPORT",
    export_id: manifest.export_id, snapshot_timestamp_utc: manifest.snapshot_timestamp_utc,
    status: "REVIEW_REQUIRED", records,
  };
  const queueDigest = sha256(JSON.stringify(queue));
  const path = await privateWrite(out, `review-${manifest.export_id}.json`, { ...queue, queue_digest: queueDigest });
  return { path, item_count: records.length, review_count: records.length, queue_digest: queueDigest };
}

export async function approveQueue(queuePath, decisionPath, out = defaultOut) {
  const queue = JSON.parse(await readFile(resolve(queuePath), "utf8"));
  const decisions = JSON.parse(await readFile(resolve(decisionPath), "utf8"));
  const { queue_digest, ...body } = queue;
  if (queue.status !== "REVIEW_REQUIRED" || queue.source !== "EGYPT_SYSTEM_READ_ONLY_EXPORT" ||
      !Array.isArray(queue.records) || sha256(JSON.stringify(body)) !== queue_digest) throw new Error("Review queue integrity failed");
  const snapshotTime = Date.parse(queue.snapshot_timestamp_utc ?? "");
  if (!Number.isFinite(snapshotTime) || snapshotTime > Date.now() + 5 * 60_000 || Date.now() - snapshotTime > 24 * 3600_000) {
    throw new Error("Approval requires a fresh Egypt System export");
  }
  if (decisions.export_id !== queue.export_id || decisions.queue_digest !== queue_digest ||
      !Array.isArray(decisions.decisions)) throw new Error("Approvals must match the exact export and queue digest");
  const available = new Map(queue.records.map(record => [record.key, record]));
  const unique = new Set(), approved = [];
  for (const decision of decisions.decisions) {
    if (!available.has(decision.key) || unique.has(decision.key)) throw new Error("Unknown/duplicate approval key");
    unique.add(decision.key);
    if (!["APPROVE", "HOLD", "REJECT"].includes(decision.decision)) throw new Error("Unknown review decision");
    if (decision.decision !== "APPROVE") continue; // HOLD/REJECT never emits a product.
    const record = available.get(decision.key);
    const pending = record.issues.filter(issue => issue !== "PHOTO_QA_REQUIRED");
    if (pending.length || !decision.barcode_verified || !decision.package_verified || !decision.photo_verified ||
        !decision.category_verified || !id(decision.approved_by) || !Number.isFinite(Date.parse(decision.approved_at ?? ""))) {
      throw new Error(`Review evidence incomplete for ${decision.key}`);
    }
    // Require a pre-existing, explicit, same-origin product image. Public media
    // is reviewed separately; no image upload is performed here.
    const image = id(decision.public_image).replaceAll("\\", "/");
    if (!/^\/products\/processed\/[A-Za-z0-9/_-]+\.(?:webp|jpe?g|png)$/i.test(image) || image.includes("..")) {
      throw new Error(`Unapproved product image path for ${decision.key}`);
    }
    const imageFile = resolve(repo, "public", image.slice(1));
    if (!inside(imageFile, join(repo, "public", "products", "processed")) || !(await stat(imageFile).catch(() => null))?.isFile()) {
      throw new Error(`Approved image is not present locally for ${decision.key}`);
    }
    approved.push({
      proposed_public_id: record.proposed_public_id,
      name: record.arabic_name,
      category: record.category,
      barcode: record.barcode,
      image,
      approval: "APPROVED_FOR_MANUAL_PR_ONLY",
      approved_by: decision.approved_by,
      approved_at: decision.approved_at,
    });
  }
  const result = {
    schema_version: 1, export_id: queue.export_id, queue_digest,
    status: "PRIVATE_PROPOSAL_NOT_PUBLISHED", products: approved,
  };
  const path = await privateWrite(out, `approved-preview-${queue.export_id}.json`, result);
  return { path, approved_count: approved.length };
}

function getFlag(args, key) {
  const at = args.indexOf(key);
  if (at < 0 || !args[at + 1] || args[at + 1].startsWith("--")) throw new Error(`Missing ${key}`);
  return args[at + 1];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, ...args] = process.argv.slice(2);
    const outAt = args.indexOf("--out");
    const out = outAt < 0 ? defaultOut : getFlag(args, "--out");
    const result = mode === "stage"
      ? await stageExport(getFlag(args, "--source"), out)
      : mode === "approve"
        ? await approveQueue(getFlag(args, "--queue"), getFlag(args, "--decisions"), out)
        : (() => { throw new Error("Use stage or approve; see docs/EGYPT-SYSTEM-READ-ONLY-REVIEW.md"); })();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Egypt System review stopped safely: ${error.message}`);
    process.exitCode = 1;
  }
}
