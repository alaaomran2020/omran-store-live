import { describe, expect, it } from "vitest";
import { SOCIAL_EMBED_CONFIG, isOfficialMetaEmbedUrl } from "../client/src/lib/socialEmbeds";

describe("official social embeds", () => {
  it("uses only public HTTPS Meta embed sources", () => {
    expect(isOfficialMetaEmbedUrl(SOCIAL_EMBED_CONFIG.instagramProfileUrl)).toBe(true);
    expect(isOfficialMetaEmbedUrl(SOCIAL_EMBED_CONFIG.facebookPageUrl)).toBe(true);
    expect(isOfficialMetaEmbedUrl(SOCIAL_EMBED_CONFIG.instagramFeaturedPostUrl)).toBe(true);
  });

  it("rejects non-Meta and non-HTTPS script sources", () => {
    expect(isOfficialMetaEmbedUrl("http://www.instagram.com/omrantoys.store/")).toBe(false);
    expect(isOfficialMetaEmbedUrl("https://example.com/embed.js")).toBe(false);
  });

  it("keeps the public Instagram post as an official destination", () => {
    expect(SOCIAL_EMBED_CONFIG.instagramFeaturedPostUrl).toBe("https://www.instagram.com/p/DcTpBu2lOt8/");
  });
});
