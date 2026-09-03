import type { Express } from "express";
import {
  applyPublicationGate,
  createProductsCache,
  fetchProductsPayload,
} from "@shared/products";

/**
 * `GET /api/products` — توأم Express للمعالج الحافّي في `worker/index.ts`.
 * كلاهما يستدعي نفس الوحدة المشتركة (`shared/products.ts`)، فالتطوير المحلي
 * والنشر على Cloudflare يرجعان نفس الحمولة بالضبط.
 *
 * لا مفتاح API: المصدر هو رابط CSV منشور للويب من Google Sheets، يُقرأ من
 * `PRODUCTS_SHEET_URL` (أو `VITE_PRODUCTS_SHEET_URL` لتفادي ازدواج الضبط).
 */
const productsCache = createProductsCache();

export function registerProductsRoute(app: Express) {
  app.get("/api/products", async (_req, res) => {
    const sheetUrl =
      process.env.PRODUCTS_SHEET_URL ||
      process.env.VITE_PRODUCTS_SHEET_URL ||
      process.env.NEXT_PUBLIC_PRODUCTS_SHEET_URL ||
      "";
    try {
      const payload = await productsCache.get(() =>
        fetchProductsPayload(sheetUrl, (url, init) => fetch(url, init))
      );
      // Final Publication Guard: نفس عقد الحافة — لا يخرج للزوار إلا
      // active=true + PUBLISHED + PASS، مهما تغيّرت مصادر الحمولة مستقبلًا.
      const guarded = {
        ...payload,
        products: applyPublicationGate(payload.products),
      };
      res.set(
        "Cache-Control",
        guarded.status === "ok" ? "public, max-age=60" : "no-store"
      );
      res.status(200).json(guarded);
    } catch {
      // الزائر لا يرى خطأ تقنيًا أبدًا: حمولة فارغة + حالة، والواجهة تتصرف.
      res.set("Cache-Control", "no-store");
      res.status(200).json({
        products: [],
        status: "error",
        fetchedAt: new Date().toISOString(),
      });
    }
  });
}
