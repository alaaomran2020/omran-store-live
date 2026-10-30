import BrandHeader from "@/components/BrandHeader";
import HomeHero from "@/components/HomeHero";
import HomeProductShowcase from "@/components/HomeProductShowcase";
import SiteFooter from "@/components/SiteFooter";
import AnnouncementBar from "@/components/AnnouncementBar";
import HomeCategoryHighlights from "@/components/HomeCategoryHighlights";
import HomeAgeBrowse from "@/components/HomeAgeBrowse";
import { RamadanSeasonBanner, RamadanSeasonRibbon } from "@/components/RamadanSeasonBanner";

import { SHOW_RAMADAN_PROMO } from "@/lib/seasonalCampaign";
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
        <HomeCategoryHighlights compact />
        <HomeProductShowcase />
        {SHOW_RAMADAN_PROMO && <RamadanSeasonBanner />}
        <HomeAgeBrowse />
        <StoreTrustFeatures />
        <HomeSupportSections />
      </main>
      <SiteFooter />
    </div>
  );
}
