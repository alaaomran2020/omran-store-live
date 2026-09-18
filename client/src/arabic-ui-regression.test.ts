import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const PUBLIC_UI_FILES = [
  "./components/HomeProductShowcase.tsx",
  "./components/BrandHeader.tsx",
  "./components/ProductCard.tsx",
  "./components/ProductDetailsDialog.tsx",
  "./components/PopUpPromo.tsx",
  "./components/SiteFooter.tsx",
  "./components/OfficialSocialEmbeds.tsx",
  "./components/VipSignup.tsx",
  "./pages/Products.tsx",
  "./pages/PopUp.tsx",
  "./pages/PopupVideos.tsx",
] as const;

describe("سلامة العربية في الواجهة العامة", () => {
  it("لا تحتوي ملفات الواجهة العامة على علامات ترميز عربي مشوه", () => {
    for (const relative of PUBLIC_UI_FILES) {
      const source = readFileSync(new URL(relative, import.meta.url), "utf8");
      expect(source, relative).not.toMatch(/[ØÙÃÂ]|â€|ï»¿/);
    }
  });
});
