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

function read(relative: string) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

describe("سلامة العربية في الواجهة العامة", () => {
  it("لا تحتوي ملفات الواجهة العامة على علامات ترميز عربي مشوه", () => {
    for (const file of PUBLIC_UI_FILES) {
      const source = read(file);
      expect(source, file).not.toMatch(/[ØÙÃÂ]|â€|ï»¿/);
    }
  });

  it("لا تعرض التسميات الإنجليزية التي تم إيقافها مؤقتًا", () => {
    const combined = PUBLIC_UI_FILES.map(read).join("\n");
    for (const label of ["POP UP", "Gifts & Balloons", "Special Department", "SKU:", ">Instagram<", ">Facebook<", ">WhatsApp<", "B2B"]) {
      expect(combined).not.toContain(label);
    }
  });
});
