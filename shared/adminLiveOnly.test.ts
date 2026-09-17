import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relative: string) => readFileSync(`${root}${relative}`, "utf8");

describe("PR 7 live-only Admin contract", () => {
  it("does not use bundled catalog or snapshot fallbacks for Admin", () => {
    const source = read("client/src/lib/admin/adminCatalog.ts");
    expect(source).not.toContain("fetchBundledCsv");
    expect(source).not.toContain("PUBLIC_PRODUCTS_SNAPSHOT");
    expect(source).not.toContain("POPUP_PRODUCTS_SNAPSHOT");
    expect(source).not.toContain('"bundled-csv"');
    expect(source).not.toContain('"bundle-snapshots"');
    expect(source).toContain('source: "unavailable"');
  });

  it("removes operational TSV change packets", () => {
    expect(existsSync(`${root}client/src/lib/admin/changePackets.ts`)).toBe(false);
    for (const file of [
      "client/src/admin/pages/ProductEditorPage.tsx",
      "client/src/admin/pages/InventoryPage.tsx",
      "client/src/admin/pages/CategoriesPage.tsx",
      "client/src/admin/pages/ContentPage.tsx",
      "client/src/admin/pages/UsersPage.tsx",
    ]) {
      const source = read(file);
      expect(source).not.toContain("downloadPacket(");
      expect(source).not.toContain("copyPacket(");
      expect(source).not.toContain("manual_packet");
      expect(source.toLowerCase()).not.toContain(".tsv");
    }
  });

  it("uses the unified gateway as the default Admin write endpoint", () => {
    const source = read("client/src/lib/admin/adminGateway.ts");
    expect(source).toContain("return configured || MAKE_GATEWAY_URL");
    expect(source).toContain('readList<InventoryRecord>("inventory"');
    expect(source).toContain('gatewayGet<AdminContentRecord>("content"');
  });
});
