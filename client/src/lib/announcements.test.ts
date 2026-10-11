import { describe, expect, it } from "vitest";
import { activeAnnouncements, type Announcement } from "./announcements";
import { STORE_ANNOUNCEMENTS } from "@shared/storeContent";

describe("activeAnnouncements", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  it("يعرض الرسائل الفعالة داخل نافذتها الزمنية فقط", () => {
    const items: Announcement[] = [
      { id: "live", message: "متاح", active: true, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-10T00:00:00Z" },
      { id: "future", message: "لاحقًا", active: true, startsAt: "2026-09-09T00:00:00Z" },
      { id: "off", message: "متوقف", active: false },
    ];
    expect(activeAnnouncements(items, now).map(item => item.id)).toEqual(["live"]);
  });
  it("يخفي تاريخ الافتتاح مؤقتًا مع بقاء إعلانات الكتالوج والتواصل", () => {
    const visible = activeAnnouncements(STORE_ANNOUNCEMENTS, new Date("2026-10-11T04:00:00Z"));
    expect(visible.map(item => item.id)).toEqual(["catalog", "whatsapp"]);
    expect(visible.map(item => item.message).join(" ")).not.toContain("29/11/2026");
  });
});
