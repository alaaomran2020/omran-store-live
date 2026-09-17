import BrandHeader from "@/components/BrandHeader";
import HomeHero from "@/components/HomeHero";
import PopUpPromo from "@/components/PopUpPromo";
import SiteFooter from "@/components/SiteFooter";
import Products from "@/pages/Products";
import AnnouncementBar from "@/components/AnnouncementBar";
import HomeCategoryHighlights from "@/components/HomeCategoryHighlights";
import StoreTrustFeatures from "@/components/StoreTrustFeatures";

export default function Storefront() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <AnnouncementBar />
      <BrandHeader />
      <HomeHero />
      <HomeCategoryHighlights />

      <main id="products" className="scroll-mt-28">
        <Products showAnnouncement={false} />
      </main>

      <StoreTrustFeatures />
      <PopUpPromo />
      <SiteFooter />
    </div>
  );
}
