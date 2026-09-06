import BrandHeader from "@/components/BrandHeader";
import PopUpPromo from "@/components/PopUpPromo";
import SiteFooter from "@/components/SiteFooter";
import Products from "@/pages/Products";

export default function Storefront() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <BrandHeader />
      <PopUpPromo />

      <div className="[&>div>header]:hidden [&>div>main>footer]:hidden">
        <Products />
      </div>

      <SiteFooter />
    </div>
  );
}
