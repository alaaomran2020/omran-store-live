import SiteFooter from "@/components/SiteFooter";
import { SeoMetadata } from "@/components/SeoMetadata";
import Products from "@/pages/Products";

const PRODUCTS_TITLE = "لعب أطفال | شركة عمران التجارية";
const PRODUCTS_DESCRIPTION =
  "اكتشف كتالوج لعب الأطفال المعتمد من شركة عمران التجارية، وشاهد الصور والمواصفات وتواصل عبر واتساب للاستفسار عن السعر والتوفر.";

export default function ProductsPage() {
  return (
    <div className="[&>div>main>footer]:hidden">
      <SeoMetadata path="/products" title={PRODUCTS_TITLE} description={PRODUCTS_DESCRIPTION} />
      <Products />
      <SiteFooter />
    </div>
  );
}
