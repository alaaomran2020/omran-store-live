import BrandHeader from "@/components/BrandHeader";
import PopUpPromo from "@/components/PopUpPromo";
import SiteFooter from "@/components/SiteFooter";
import { SeoMetadata } from "@/components/SeoMetadata";
import Products from "@/pages/Products";
import AnnouncementBar from "@/components/AnnouncementBar";
import { HOME_DESCRIPTION, HOME_TITLE } from "@shared/site";

export default function Storefront() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <SeoMetadata path="/" title={HOME_TITLE} description={HOME_DESCRIPTION} />
      <AnnouncementBar />
      <BrandHeader />
      <PopUpPromo />

      <div>
        <Products showAnnouncement={false} />
      </div>

      <SiteFooter />
    </div>
  );
}
