import BrandHeader from "@/components/BrandHeader";
import AnnouncementBar from "@/components/AnnouncementBar";
import SiteFooter from "@/components/SiteFooter";
import { SeoMetadata } from "@/components/SeoMetadata";
import Products from "@/pages/Products";
import { RamadanSeasonRibbon } from "@/components/RamadanSeasonBanner";
import { SHOW_RAMADAN_PROMO } from "@/lib/seasonalCampaign";

const PRODUCTS_TITLE = "لعب أطفال في طنطا | كتالوج عمران تويز - شركة عمران التجارية";
const PRODUCTS_DESCRIPTION =
  "تصفح كتالوج ألعاب الأطفال لدى شركة عمران التجارية في طنطا، وشاهد صور المنتجات وتفاصيلها. اختر حسب الفئة والعمر واستفسر عن أسعار الجملة والقطاعي عبر واتساب.";

export default function ProductsPage() {
  return (
    <div>
      <SeoMetadata path="/products" title={PRODUCTS_TITLE} description={PRODUCTS_DESCRIPTION} />
      <AnnouncementBar />
      {SHOW_RAMADAN_PROMO && <RamadanSeasonRibbon />}
      <BrandHeader />
      <Products showAnnouncement={false} />
      <SiteFooter />
    </div>
  );
}
