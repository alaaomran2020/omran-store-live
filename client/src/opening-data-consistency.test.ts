import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OPENING_PROFILE } from "@shared/openingProfile";
import { STORE_BRANCHES, STORE_CONTACT } from "@shared/storeContent";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("Opening data consistency", () => {
  it("uses one canonical contact record", () => {
    expect(STORE_CONTACT.whatsapp).toBe(OPENING_PROFILE.contacts.whatsapp);
    expect(STORE_CONTACT.landline).toBe(OPENING_PROFILE.contacts.landline);
    expect(STORE_CONTACT.landlineDisplay).toBe(OPENING_PROFILE.contacts.landlineDisplay);
    expect(STORE_CONTACT.whatsappDisplay).toBe(OPENING_PROFILE.contacts.whatsappDisplay);
    expect(SOCIAL_EMBED_CONFIG.whatsappNumber).toBe(OPENING_PROFILE.contacts.whatsapp);
    expect(html).toContain(`+${OPENING_PROFILE.contacts.whatsapp}`);
    expect(html).toContain(`+${OPENING_PROFILE.contacts.landline}`);
  });

  it("uses one canonical branch record", () => {
    const primary = OPENING_PROFILE.branches.find(
      branch => branch.id === OPENING_PROFILE.opening.primaryBranchId
    );
    expect(primary).toBeTruthy();
    expect(primary).toEqual(expect.objectContaining({ isPrimary: true }));
    expect(STORE_BRANCHES[0]).toEqual(
      expect.objectContaining({
        id: primary!.id,
        name: primary!.name,
        address: primary!.address,
        city: primary!.city,
      })
    );
    expect(html).toContain(primary!.address);
  });

  it("pins the official opening date", () => {
    expect(OPENING_PROFILE.opening.officialDate).toBe("2026-11-29");
    expect(OPENING_PROFILE.opening.displayDate).toBe("29/11/2026");
  });
});
