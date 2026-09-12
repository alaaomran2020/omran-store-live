/**
 * توليد sitemap.xml من الكتالوج المعتمد وقت البناء.
 *
 * المصدر: نفس الـsnapshots المضمّنة في الحزمة (PUBLIC_PRODUCTS_SNAPSHOT +
 * POPUP_PRODUCTS_SNAPSHOT) — نفس البيانات التي تعرضها الواجهة فعليًا عند
 * تعذر المصادر الحية، وكلها اجتازت بوابة النشر (active + PUBLISHED + PASS).
 * لا يعتمد التوليد على أي شبكة أو API؛ esbuild (dependency موجودة) يجمع
 * الوحدة المشتركة `shared/sitemap` مع الـsnapshots في ملف مؤقت يُتخلص منه
 * فورًا.
 */

import esbuild from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

export async function generateSitemapData(root) {
  const virtualEntry = [
    `import { buildSitemap } from ${JSON.stringify(path.join(root, "shared", "sitemap.ts"))};`,
    `import { PUBLIC_PRODUCTS_SNAPSHOT } from ${JSON.stringify(path.join(root, "client", "src", "lib", "publicProductsSnapshot.ts"))};`,
    `import { POPUP_PRODUCTS_SNAPSHOT } from ${JSON.stringify(path.join(root, "client", "src", "lib", "popupProductsSnapshot.ts"))};`,
    "export default buildSitemap([...PUBLIC_PRODUCTS_SNAPSHOT, ...POPUP_PRODUCTS_SNAPSHOT]);",
  ].join("\n");

  const result = await esbuild.build({
    stdin: { contents: virtualEntry, resolveDir: root, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
    alias: { "@shared": path.join(root, "shared") },
  });

  const tmpFile = path.join(
    os.tmpdir(),
    `omran-sitemap-${Date.now()}-${Math.random().toString(36).slice(2)}.cjs`
  );
  fs.writeFileSync(tmpFile, result.outputFiles[0].text, "utf8");
  try {
    const require = createRequire(import.meta.url);
    const mod = require(tmpFile);
    return mod?.default ?? mod;
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}

export async function writeSitemap(root, outDir) {
  const data = await generateSitemapData(root);
  if (!data?.xml || !Array.isArray(data.entries) || data.entries.length === 0) {
    throw new Error("sitemap generation returned no entries");
  }
  const out = path.join(outDir, "sitemap.xml");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data.xml, "utf8");
  return { out, count: data.entries.length, entries: data.entries };
}
