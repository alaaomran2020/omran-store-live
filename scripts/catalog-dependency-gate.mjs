#!/usr/bin/env node
/**
 * Legacy catalog dependency gate (fail closed).
 *
 * The storefront has exactly ONE catalog source of truth:
 *
 *   public/catalog/products.csv   (repository-controlled)
 *     -> scripts/generate-public-products-snapshot.ts   (build time, no network for data)
 *       -> client/src/lib/publicProductsSnapshot.ts     (bundled, same data the sitemap uses)
 *
 * POP UP products live in client/src/lib/popupProductsSnapshot.ts and stay
 * isolated from the toys catalog.
 *
 * This gate fails the build if an executable production path ever reaches for
 * Google Apps Script, a live Google Sheet, or the Make gateway to obtain
 * catalog data again. Historical/documentation references under docs/ and
 * automation/ are out of scope on purpose: they are not executable storefront
 * code. The VIP subscriber web app (VITE_SUBSCRIBERS_WEB_APP_URL) is a
 * marketing subscriber upsert, not a catalog source, so it is allow-listed.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const selfPath = path.relative(root, new URL(import.meta.url).pathname);

/**
 * Verification code that names the forbidden strings on purpose, in order to
 * assert their absence. Scanning it would make the gate self-triggering.
 */
const ASSERTION_FILES = new Set([selfPath, "scripts/integration-audit.mjs"]);

/** Executable production surfaces. Docs/automation history is intentionally excluded. */
const SCANNED_ROOTS = [
  "client/src",
  "shared",
  "scripts",
  ".github/workflows",
  ".env.production",
  ".env.example",
];

const BINARY_EXTENSIONS = new Set([
  ".webp", ".png", ".jpg", ".jpeg", ".gif", ".avif", ".ico", ".woff", ".woff2",
]);

const FORBIDDEN = [
  { label: "Apps Script endpoint", pattern: /script\.google\.com/ },
  { label: "Apps Script web app path", pattern: /\/macros\/s\// },
  { label: "live catalog action", pattern: /action=catalog/ },
  { label: "Make catalog URL helper", pattern: /makeCatalogUrl/ },
  { label: "legacy catalog sheet variable", pattern: /PRODUCTS_SHEET_URL/ },
  // Only machine-readable Sheet endpoints are forbidden. A human hyperlink to
  // the operations workbook (/edit#gid=...) is not a catalog runtime source.
  { label: "live Google Sheet CSV endpoint", pattern: /docs\.google\.com\/spreadsheets\/[^"'`\s]*(?:output=csv|format=csv|\/pub\b)/ },
];

/** Non-catalog integrations that are allowed to keep their own endpoints. */
const ALLOWED_LINE_MARKERS = ["VITE_SUBSCRIBERS_WEB_APP_URL"];

function collectFiles(relativeRoot) {
  const absolute = path.join(root, relativeRoot);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [relativeRoot];

  const out = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      // Tests legitimately name the forbidden strings to assert their absence.
      if (/\.test\.[cm]?[jt]sx?$/.test(entry.name)) continue;
      out.push(path.relative(root, full));
    }
  };
  walk(absolute);
  return out;
}

const violations = [];
const scanned = new Set();

for (const scanRoot of SCANNED_ROOTS) {
  for (const file of collectFiles(scanRoot)) {
    if (ASSERTION_FILES.has(file) || scanned.has(file)) continue;
    scanned.add(file);

    let text;
    try {
      text = fs.readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }

    text.split(/\r?\n/).forEach((line, index) => {
      if (ALLOWED_LINE_MARKERS.some(marker => line.includes(marker))) return;
      for (const { label, pattern } of FORBIDDEN) {
        if (pattern.test(line)) {
          violations.push(`${file}:${index + 1} ${label}: ${line.trim().slice(0, 160)}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error("::error::Legacy catalog dependency detected in an executable production path");
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(
  `Legacy catalog dependency gate: PASS (${scanned.size} executable files scanned; ` +
    "no Apps Script, live Google Sheet or Make catalog dependency)"
);
