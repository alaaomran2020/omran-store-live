import type { SocialFeed } from "@shared/socialFeed";

export type { SocialFeed, SocialPost, SocialSource } from "@shared/socialFeed";

/**
 * Fetches the merged Facebook/Instagram product feed from the same-origin API
 * (served by the Cloudflare Worker in production, Express in dev). Same-origin
 * only — the browser never talks to Meta and never sees an access token.
 */
export async function fetchSocialFeed(signal?: AbortSignal): Promise<SocialFeed> {
  const res = await fetch("/api/social/feed", {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`social_feed_http_${res.status}`);
  return (await res.json()) as SocialFeed;
}
