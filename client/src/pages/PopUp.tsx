import { useEffect } from "react";
import SiteFooter from "@/components/SiteFooter";
import Products from "@/pages/Products";

const POPUP_TITLE = "POP UP – Gifts & Balloons | شركة عمران التجارية";
const POPUP_DESCRIPTION = "هدايا وبالونات ومستلزمات حفلات من POP UP ضمن شركة عمران التجارية.";

export default function PopUp() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content ?? "";

    document.title = POPUP_TITLE;
    if (description) description.content = POPUP_DESCRIPTION;

    return () => {
      document.title = previousTitle;
      if (description) description.content = previousDescription;
    };
  }, []);

  return (
    <div className="[&>div>main>footer]:hidden">
      <Products catalog="popup" />
      <SiteFooter />
    </div>
  );
}
