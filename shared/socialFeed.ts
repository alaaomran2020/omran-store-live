/**
 * Facebook + Instagram product-feed sync — single shared module.
 *
 * Runs unchanged in BOTH runtimes that serve `/api/social/feed`:
 *   - the Cloudflare Worker (`worker/index.ts`) — production, at the edge
 *   - the Express dev/VPS server (`server/socialFeed.ts`)
 * so it uses Web-standard APIs only (fetch/AbortController/URL). No Node, no
 * DOM, no framework imports.
 *
 * Data source is the official Meta Graph API (public scraping is blocked by
 * Meta). Tokens are read server-side only and are never sent to the browser;
 * the client receives the normalized feed below and nothing else.
 *
 * Sync model (deliberate, per store owner's brief): pull-on-request with a
 * short in-memory TTL cache. No webhooks, no cron, no database copy — every
 * page view within the TTL is served from cache; the first view after expiry
 * refreshes from Meta. New posts on Facebook/Instagram therefore appear on the
 * site automatically within `CACHE_TTL_MS`.
 */

export type SocialSource = "facebook" | "instagram";

/** One synced post, rendered by the storefront as a product card. */
export type SocialPost = {
  /** `${source}:${graph id}` — globally unique across both platforms. */
  id: string;
  source: SocialSource;
  /** Full caption/message text (may be empty for image-only posts). */
  message: string;
  /** Canonical link to the original post on the platform. */
  permalink: string;
  /** Primary image URL (null for text-only posts). */
  image: string | null;
  /** All images for carousel/multi-photo posts (includes `image` first). */
  images: string[];
  /** ISO-8601 publish time. */
  timestamp: string;
};

export type SourceStatus = "ok" | "not_configured" | "error";

export type SocialFeed = {
  posts: SocialPost[];
  sources: Record<SocialSource, SourceStatus>;
  /** ISO-8601 time this payload was assembled (i.e. last successful sync). */
  fetchedAt: string;
};

/** Server-side configuration; every field optional so each platform can be
 *  enabled independently. Never exposed to the client. */
export type SocialFeedEnv = {
  FACEBOOK_PAGE_ID?: string;
  FACEBOOK_PAGE_ACCESS_TOKEN?: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
};

/** Minimal fetch signature so tests can inject a stub and both runtimes'
 *  native `fetch` implementations satisfy it. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Pinned Graph API version (Facebook). Bump deliberately, not implicitly. */
export const GRAPH_API_VERSION = "v23.0";

/** How many posts to pull per platform per sync. The shop is pre-opening with
 *  a small catalogue; 25 covers it with headroom while keeping payloads small. */
export const FEED_LIMIT = 25;

/** Feed cache lifetime. New FB/IG posts show up within this window. */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** Per-platform request timeout. The feed must never hang a page load. */
export const UPSTREAM_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Raw Graph API shapes (only the fields we request)
// ---------------------------------------------------------------------------

type IgChild = {
  id?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
};

type IgMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  children?: { data?: IgChild[] };
};

type FbAttachmentMedia = { image?: { src?: string } };
type FbAttachment = {
  media?: FbAttachmentMedia;
  subattachments?: { data?: { media?: FbAttachmentMedia }[] };
};

type FbPost = {
  id?: string;
  message?: string;
  permalink_url?: string;
  full_picture?: string;
  created_time?: string;
  attachments?: { data?: FbAttachment[] };
};

// ---------------------------------------------------------------------------
// Normalizers (pure — unit-tested in server/socialFeed.test.ts)
// ---------------------------------------------------------------------------

const isNonEmpty = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

/** IG video posts carry the playable file in `media_url`; the poster frame is
 *  `thumbnail_url`. Cards want the image, so prefer the thumbnail for videos. */
const igImageOf = (m: IgChild | IgMedia): string | null => {
  if (m.media_type === "VIDEO") {
    return isNonEmpty(m.thumbnail_url)
      ? m.thumbnail_url
      : isNonEmpty(m.media_url)
        ? m.media_url
        : null;
  }
  return isNonEmpty(m.media_url)
    ? m.media_url
    : isNonEmpty(m.thumbnail_url)
      ? m.thumbnail_url
      : null;
};

export function normalizeInstagram(items: unknown): SocialPost[] {
  if (!Array.isArray(items)) return [];
  const posts: SocialPost[] = [];
  for (const raw of items as IgMedia[]) {
    if (!raw || !isNonEmpty(raw.id) || !isNonEmpty(raw.permalink)) continue;
    const images: string[] = [];
    const primary = igImageOf(raw);
    if (primary) images.push(primary);
    for (const child of raw.children?.data ?? []) {
      const src = igImageOf(child);
      if (src && !images.includes(src)) images.push(src);
    }
    posts.push({
      id: `instagram:${raw.id}`,
      source: "instagram",
      message: typeof raw.caption === "string" ? raw.caption.trim() : "",
      permalink: raw.permalink,
      image: images[0] ?? null,
      images,
      timestamp: isNonEmpty(raw.timestamp)
        ? raw.timestamp
        : new Date(0).toISOString(),
    });
  }
  return posts;
}

export function normalizeFacebook(items: unknown): SocialPost[] {
  if (!Array.isArray(items)) return [];
  const posts: SocialPost[] = [];
  for (const raw of items as FbPost[]) {
    if (!raw || !isNonEmpty(raw.id) || !isNonEmpty(raw.permalink_url)) continue;
    const images: string[] = [];
    if (isNonEmpty(raw.full_picture)) images.push(raw.full_picture);
    for (const att of raw.attachments?.data ?? []) {
      const single = att.media?.image?.src;
      if (isNonEmpty(single) && !images.includes(single)) images.push(single);
      for (const sub of att.subattachments?.data ?? []) {
        const src = sub.media?.image?.src;
        if (isNonEmpty(src) && !images.includes(src)) images.push(src);
      }
    }
    const message = typeof raw.message === "string" ? raw.message.trim() : "";
    // A Facebook post with neither text nor an image renders an unusable blank
    // card (e.g. bare shares/life events) — skip it.
    if (!message && images.length === 0) continue;
    posts.push({
      id: `facebook:${raw.id}`,
      source: "facebook",
      message,
      permalink: raw.permalink_url,
      image: images[0] ?? null,
      images,
      timestamp: isNonEmpty(raw.created_time)
        ? raw.created_time
        : new Date(0).toISOString(),
    });
  }
  return posts;
}

/** Case/whitespace-insensitive caption key used to fold cross-posted content
 *  (the same product announced on both platforms) into a single card. */
export const captionKey = (message: string): string =>
  message.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120);

/**
 * Merge both platforms: newest first; duplicate graph ids dropped; posts with
 * identical captions collapsed (Instagram preferred — its media URLs are the
 * product photos; the Facebook permalink of the loser is discarded, which is
 * fine because the card links to one canonical post).
 */
export function mergePosts(...groups: SocialPost[][]): SocialPost[] {
  const byId = new Map<string, SocialPost>();
  for (const group of groups) {
    for (const post of group) {
      if (!byId.has(post.id)) byId.set(post.id, post);
    }
  }
  const sorted = Array.from(byId.values()).sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  );
  const byCaption = new Map<string, SocialPost>();
  const out: SocialPost[] = [];
  for (const post of sorted) {
    const key = post.message ? captionKey(post.message) : "";
    if (!key) {
      out.push(post);
      continue;
    }
    const existing = byCaption.get(key);
    if (!existing) {
      byCaption.set(key, post);
      out.push(post);
      continue;
    }
    // Same caption on both platforms: prefer the Instagram copy in place.
    if (existing.source === "facebook" && post.source === "instagram") {
      out[out.indexOf(existing)] = post;
      byCaption.set(key, post);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Upstream fetchers
// ---------------------------------------------------------------------------

async function fetchGraph(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`graph_http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const IG_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "children{media_type,media_url,thumbnail_url}",
].join(",");

const FB_FIELDS = [
  "id",
  "message",
  "permalink_url",
  "full_picture",
  "created_time",
  "attachments{media,subattachments}",
].join(",");

export function instagramMediaUrl(token: string): string {
  const u = new URL("https://graph.instagram.com/me/media");
  u.searchParams.set("fields", IG_FIELDS);
  u.searchParams.set("limit", String(FEED_LIMIT));
  u.searchParams.set("access_token", token);
  return u.toString();
}

export function facebookPostsUrl(pageId: string, token: string): string {
  const u = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pageId)}/posts`
  );
  u.searchParams.set("fields", FB_FIELDS);
  u.searchParams.set("limit", String(FEED_LIMIT));
  u.searchParams.set("access_token", token);
  return u.toString();
}

const dataOf = (payload: unknown): unknown =>
  payload && typeof payload === "object" && "data" in payload
    ? (payload as { data: unknown }).data
    : [];

/**
 * Assemble the merged feed. Partial failure is first-class: one platform being
 * down/misconfigured yields `sources.<platform>: "error"` while the other's
 * posts still render — never an all-or-nothing page.
 */
export async function buildSocialFeed(
  env: SocialFeedEnv,
  fetchImpl: FetchLike,
  opts: { timeoutMs?: number; now?: () => number } = {}
): Promise<SocialFeed> {
  const timeoutMs = opts.timeoutMs ?? UPSTREAM_TIMEOUT_MS;
  const now = opts.now ?? Date.now;

  const igToken = env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const fbPageId = env.FACEBOOK_PAGE_ID?.trim();
  const fbToken = env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();

  const sources: SocialFeed["sources"] = {
    instagram: igToken ? "ok" : "not_configured",
    facebook: fbPageId && fbToken ? "ok" : "not_configured",
  };

  const [igPosts, fbPosts] = await Promise.all([
    igToken
      ? fetchGraph(fetchImpl, instagramMediaUrl(igToken), timeoutMs)
          .then(payload => normalizeInstagram(dataOf(payload)))
          .catch(() => {
            sources.instagram = "error";
            return [] as SocialPost[];
          })
      : Promise.resolve([] as SocialPost[]),
    fbPageId && fbToken
      ? fetchGraph(fetchImpl, facebookPostsUrl(fbPageId, fbToken), timeoutMs)
          .then(payload => normalizeFacebook(dataOf(payload)))
          .catch(() => {
            sources.facebook = "error";
            return [] as SocialPost[];
          })
      : Promise.resolve([] as SocialPost[]),
  ]);

  return {
    posts: mergePosts(igPosts, fbPosts),
    sources,
    fetchedAt: new Date(now()).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// TTL cache — one instance per runtime (module scope in the worker isolate /
// the Node process). Serves every request inside the TTL without touching
// Meta; also keeps the last good feed as a fallback if a refresh fails.
// ---------------------------------------------------------------------------

export function createFeedCache(
  ttlMs: number = CACHE_TTL_MS,
  now: () => number = Date.now
) {
  let cached: SocialFeed | null = null;
  let expiresAt = 0;
  let inflight: Promise<SocialFeed> | null = null;

  return {
    /** Returns the cached feed inside the TTL; otherwise refreshes (deduping
     *  concurrent refreshes) and falls back to the stale copy on failure. */
    async get(refresh: () => Promise<SocialFeed>): Promise<SocialFeed> {
      if (cached && now() < expiresAt) return cached;
      inflight ??= refresh()
        .then(feed => {
          cached = feed;
          expiresAt = now() + ttlMs;
          return feed;
        })
        .catch(err => {
          if (cached) return cached; // stale beats blank
          throw err;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    clear() {
      cached = null;
      expiresAt = 0;
    },
  };
}
