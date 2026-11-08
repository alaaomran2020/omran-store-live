import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

let fixture: string;

beforeEach(() => {
  // Spaces exercise file-URL decoding as well as native path separators.
  fixture = mkdtempSync(path.join(tmpdir(), "omran catalog gate "));
  mkdirSync(path.join(fixture, "scripts"));
  mkdirSync(path.join(fixture, "client", "src"), { recursive: true });
  copyFileSync(
    new URL("../scripts/catalog-dependency-gate.mjs", import.meta.url),
    path.join(fixture, "scripts", "catalog-dependency-gate.mjs")
  );
  writeFileSync(
    path.join(fixture, "scripts", "integration-audit.mjs"),
    'const forbiddenEndpoint = "script.google.com";\n'
  );
});

afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
});

function runGate() {
  return spawnSync(process.execPath, ["scripts/catalog-dependency-gate.mjs"], {
    cwd: fixture,
    encoding: "utf8",
    timeout: 10000,
  });
}

describe("catalog dependency gate", () => {
  it("ignores its own assertions and the integration audit on native paths", () => {
    const result = runGate();
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Legacy catalog dependency gate: PASS");
  });

  it("still rejects a forbidden dependency in executable storefront code", () => {
    writeFileSync(
      path.join(fixture, "client", "src", "catalog.js"),
      'const endpoint = "https://script.google.com/macros/s/example";\n'
    );
    const result = runGate();
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("client/src/catalog.js:1 Apps Script endpoint");
  });
});
