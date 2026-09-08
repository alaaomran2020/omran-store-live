import { describe, expect, it } from "vitest";
import { activeAnnouncements, type Announcement } from "./announcements";

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
});
