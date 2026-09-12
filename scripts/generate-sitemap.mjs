#!/usr/bin/env node
/**
 * يجدد `public/sitemap.xml` من الكتالوج المعتمد الحالي (يُشغَّل يدويًا أو
 * عند تغيير قاعدة النشر). ناتج البناء (`vite build`) يولّد نسخة مطابقة في
 * `dist/public` تلقائيًا عبر vite plugin.
 */

import path from "node:path";
import { writeSitemap } from "./sitemap-generate-core.mjs";

const root = process.cwd();
const { out, count } = await writeSitemap(root, path.join(root, "public"));
console.log(`sitemap: ${count} URLs → ${path.relative(root, out)}`);
