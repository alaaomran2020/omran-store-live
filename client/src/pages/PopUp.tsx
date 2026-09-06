import { useEffect } from "react";
import Products from "@/pages/Products";

export default function PopUp() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.get("search")) {
      url.searchParams.set("search", "بالون");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return (
    <div>
      <section dir="rtl" className="border-b border-brand-border bg-white py-8 sm:py-10">
        <div className="container">
          <div className="rounded-3xl bg-brand-navy p-6 text-white shadow-xl sm:p-8">
            <p className="text-sm font-extrabold text-brand-yellow">PoP UP</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">بالونات وهدايا للمناسبات</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              قسم PoP UP مخصص للبالونات والهدايا وتجهيزات المناسبات. تظهر هنا المنتجات المطابقة من الكتالوج المعتمد فقط.
            </p>
          </div>
        </div>
      </section>
      <Products />
    </div>
  );
}
