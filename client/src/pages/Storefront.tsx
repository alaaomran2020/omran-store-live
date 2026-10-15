import BrandHeader from "@/components/BrandHeader";
import HomeHero from "@/components/HomeHero";
import HomeProductShowcase from "@/components/HomeProductShowcase";
import PopUpPromo from "@/components/PopUpPromo";
import SiteFooter from "@/components/SiteFooter";
import AnnouncementBar from "@/components/AnnouncementBar";
import HomeCategoryHighlights from "@/components/HomeCategoryHighlights";
import HomeAgeBrowse from "@/components/HomeAgeBrowse";
import { RamadanSeasonBanner, RamadanSeasonRibbon } from "@/components/RamadanSeasonBanner";

// Seasonal promotion remains available in the catalog but is hidden on the homepage
// outside explicitly approved campaign periods (no automatic activation).
const SHOW_RAMADAN_PROMO = import.meta.env.VITE_SHOW_RAMADAN_PROMO === "true";
import StoreTrustFeatures from "@/components/StoreTrustFeatures";
import HomeSupportSections from "@/components/HomeSupportSections";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

export default function Storefront() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <AnnouncementBar />
      {SHOW_RAMADAN_PROMO && <RamadanSeasonRibbon />}
      <BrandHeader />
      <HomeHero />
      <main id={MAIN_CONTENT_ID} tabIndex={-1}>
        {SHOW_RAMADAN_PROMO && <RamadanSeasonBanner />}
        <HomeCategoryHighlights />
        <HomeAgeBrowse />
        <HomeProductShowcase />
        <StoreTrustFeatures />
        <HomeSupportSections />
        <PopUpPromo />
      </main>
      <SiteFooter />
    </div>
  );
}
