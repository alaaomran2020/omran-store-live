import BrandHeader from "@/components/BrandHeader";
import PopUpPromo from "@/components/PopUpPromo";
import SiteFooter from "@/components/SiteFooter";
import Products from "@/pages/Products";
import AnnouncementBar from "@/components/AnnouncementBar";

export default function Storefront() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <AnnouncementBar />
      <BrandHeader />
      <PopUpPromo />

      <div className="[&>div>main>footer]:hidden">
        <Products showAnnouncement={false} />
      </div>

      <SiteFooter />
    </div>
  );
}
