import type { Express } from "express";
import {
  buildSocialFeed,
  createFeedCache,
  type SocialFeedEnv,
} from "@shared/socialFeed";

/**
 * `GET /api/social/feed` — Express twin of the edge handler in
 * `worker/index.ts`. Both delegate to the same shared module
 * (`shared/socialFeed.ts`), so dev (`pnpm dev`), a pure-VPS deploy and the
 * Cloudflare edge return byte-identical feeds. In the hybrid production
 * topology the worker answers this path itself and requests never reach here.
 */
const feedCache = createFeedCache();

export function registerSocialFeedRoute(app: Express) {
  app.get("/api/social/feed", async (_req, res) => {
    const env: SocialFeedEnv = {
      FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID,
      FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN,
    };
    try {
      const feed = await feedCache.get(() =>
        buildSocialFeed(env, (url, init) => fetch(url, init))
      );
      res.set("Cache-Control", "public, max-age=60");
      res.status(200).json(feed);
    } catch {
      res.set("Cache-Control", "no-store");
      res.status(502).json({ error: "social_feed_unavailable" });
    }
  });
}
