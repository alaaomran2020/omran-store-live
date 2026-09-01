import { describe, expect, it } from "vitest";
import {
  buildSocialFeed,
  captionKey,
  createFeedCache,
  facebookPostsUrl,
  instagramMediaUrl,
  mergePosts,
  normalizeFacebook,
  normalizeInstagram,
  type FetchLike,
  type SocialFeed,
} from "@shared/socialFeed";

const jsonResponse = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

describe("normalizeInstagram", () => {
  it("maps media to posts, preferring thumbnails for videos and collecting carousel children", () => {
    const posts = normalizeInstagram([
      {
        id: "1",
        caption: "لعبة روبوت\nسعر خاص",
        media_type: "CAROUSEL_ALBUM",
        media_url: "https://cdn/a.jpg",
        permalink: "https://instagram.com/p/a/",
        timestamp: "2026-08-30T10:00:00+0000",
        children: {
          data: [
            { media_type: "IMAGE", media_url: "https://cdn/a.jpg" },
            { media_type: "IMAGE", media_url: "https://cdn/b.jpg" },
            { media_type: "VIDEO", media_url: "https://cdn/v.mp4", thumbnail_url: "https://cdn/v.jpg" },
          ],
        },
      },
      {
        id: "2",
        media_type: "VIDEO",
        media_url: "https://cdn/only.mp4",
        thumbnail_url: "https://cdn/only.jpg",
        permalink: "https://instagram.com/p/b/",
        timestamp: "2026-08-29T10:00:00+0000",
      },
      { id: "3" }, // no permalink → dropped
    ]);

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      id: "instagram:1",
      source: "instagram",
      image: "https://cdn/a.jpg",
      images: ["https://cdn/a.jpg", "https://cdn/b.jpg", "https://cdn/v.jpg"],
    });
    expect(posts[1].image).toBe("https://cdn/only.jpg");
  });

  it("returns [] for non-array payloads", () => {
    expect(normalizeInstagram(undefined)).toEqual([]);
    expect(normalizeInstagram({})).toEqual([]);
  });
});

describe("normalizeFacebook", () => {
  it("maps posts and drops entries with neither text nor image", () => {
    const posts = normalizeFacebook([
      {
        id: "10",
        message: "مجسم ديناصور",
        permalink_url: "https://facebook.com/10",
        full_picture: "https://cdn/f.jpg",
        created_time: "2026-08-28T09:00:00+0000",
        attachments: {
          data: [
            {
              media: { image: { src: "https://cdn/f.jpg" } },
              subattachments: { data: [{ media: { image: { src: "https://cdn/g.jpg" } } }] },
            },
          ],
        },
      },
      { id: "11", permalink_url: "https://facebook.com/11" }, // blank → dropped
    ]);

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: "facebook:10",
      source: "facebook",
      images: ["https://cdn/f.jpg", "https://cdn/g.jpg"],
    });
  });
});

describe("mergePosts", () => {
  const ig = {
    id: "instagram:1",
    source: "instagram" as const,
    message: "لعبة  روبوت ذكي",
    permalink: "https://instagram.com/p/x/",
    image: "https://cdn/ig.jpg",
    images: ["https://cdn/ig.jpg"],
    timestamp: "2026-08-30T10:00:00Z",
  };
  const fbDup = {
    ...ig,
    id: "facebook:2",
    source: "facebook" as const,
    message: "لعبة روبوت ذكي", // same caption, different whitespace
    permalink: "https://facebook.com/2",
    timestamp: "2026-08-31T10:00:00Z",
  };
  const fbOther = {
    ...fbDup,
    id: "facebook:3",
    message: "عرض خاص على المكعبات",
    timestamp: "2026-08-29T08:00:00Z",
  };

  it("sorts newest-first and folds cross-posted captions, preferring Instagram", () => {
    const merged = mergePosts([ig], [fbDup, fbOther]);
    expect(merged.map(p => p.id)).toEqual(["instagram:1", "facebook:3"]);
  });

  it("drops duplicate ids and keeps caption-less posts", () => {
    const bare = { ...fbOther, id: "facebook:4", message: "" };
    const merged = mergePosts([ig, ig], [bare]);
    expect(merged.map(p => p.id)).toEqual(["instagram:1", "facebook:4"]);
  });

  it("captionKey normalizes whitespace and case", () => {
    expect(captionKey("  Toy   CAR \n new ")).toBe("toy car new");
  });
});

describe("buildSocialFeed", () => {
  const env = {
    INSTAGRAM_ACCESS_TOKEN: "ig-token",
    FACEBOOK_PAGE_ID: "123",
    FACEBOOK_PAGE_ACCESS_TOKEN: "fb-token",
  };

  it("reports not_configured without touching the network", async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      return jsonResponse({ data: [] });
    };
    const feed = await buildSocialFeed({}, fetchImpl);
    expect(calls).toBe(0);
    expect(feed.posts).toEqual([]);
    expect(feed.sources).toEqual({ instagram: "not_configured", facebook: "not_configured" });
  });

  it("merges both platforms and never leaks tokens into the payload", async () => {
    const fetchImpl: FetchLike = async url => {
      if (url.startsWith("https://graph.instagram.com/")) {
        expect(url).toBe(instagramMediaUrl("ig-token"));
        return jsonResponse({
          data: [{ id: "1", caption: "روبوت", media_url: "https://cdn/i.jpg", permalink: "https://instagram.com/p/1/", timestamp: "2026-08-30T10:00:00+0000" }],
        });
      }
      expect(url).toBe(facebookPostsUrl("123", "fb-token"));
      return jsonResponse({
        data: [{ id: "9", message: "مكعبات", permalink_url: "https://facebook.com/9", full_picture: "https://cdn/f.jpg", created_time: "2026-08-31T10:00:00+0000" }],
      });
    };
    const feed = await buildSocialFeed(env, fetchImpl);
    expect(feed.sources).toEqual({ instagram: "ok", facebook: "ok" });
    expect(feed.posts.map(p => p.id)).toEqual(["facebook:9", "instagram:1"]);
    expect(JSON.stringify(feed)).not.toContain("token");
  });

  it("degrades to partial results when one platform fails", async () => {
    const fetchImpl: FetchLike = async url =>
      url.startsWith("https://graph.instagram.com/")
        ? jsonResponse({ error: "expired" }, 400)
        : jsonResponse({
            data: [{ id: "9", message: "مكعبات", permalink_url: "https://facebook.com/9", full_picture: "https://cdn/f.jpg", created_time: "2026-08-31T10:00:00+0000" }],
          });
    const feed = await buildSocialFeed(env, fetchImpl);
    expect(feed.sources.instagram).toBe("error");
    expect(feed.sources.facebook).toBe("ok");
    expect(feed.posts).toHaveLength(1);
  });
});

describe("createFeedCache", () => {
  const feedAt = (iso: string): SocialFeed => ({
    posts: [],
    sources: { facebook: "ok", instagram: "ok" },
    fetchedAt: iso,
  });

  it("serves from cache inside the TTL and refreshes after expiry", async () => {
    let clock = 0;
    let refreshes = 0;
    const cache = createFeedCache(5 * 60_000, () => clock);
    const refresh = async () => {
      refreshes += 1;
      return feedAt(new Date(clock).toISOString());
    };

    await cache.get(refresh);
    await cache.get(refresh);
    expect(refreshes).toBe(1);

    clock = 5 * 60_000 + 1;
    await cache.get(refresh);
    expect(refreshes).toBe(2);
  });

  it("returns the stale copy if a refresh fails, and dedupes concurrent refreshes", async () => {
    let clock = 0;
    let refreshes = 0;
    const cache = createFeedCache(1000, () => clock);
    const good = async () => {
      refreshes += 1;
      return feedAt("first");
    };

    const [a, b] = await Promise.all([cache.get(good), cache.get(good)]);
    expect(refreshes).toBe(1);
    expect(a.fetchedAt).toBe("first");
    expect(b.fetchedAt).toBe("first");

    clock = 2000;
    const failing = () => Promise.reject(new Error("meta down"));
    const stale = await cache.get(failing);
    expect(stale.fetchedAt).toBe("first");
  });

  it("propagates the error when there is no stale copy to fall back to", async () => {
    const cache = createFeedCache(1000, () => 0);
    await expect(cache.get(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });
});
