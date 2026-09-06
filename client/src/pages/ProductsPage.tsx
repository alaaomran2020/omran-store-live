import SiteFooter from "@/components/SiteFooter";
import Products from "@/pages/Products";

export default function ProductsPage() {
  return (
    <div className="[&>div>main>footer]:hidden">
      <Products />
      <SiteFooter />
    </div>
  );
}
