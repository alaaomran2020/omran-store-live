import { MessageCircle, PackageCheck, Search, ShieldCheck, Sparkles } from "lucide-react";
import { whatsappNumber } from "@/lib/productFormat";

const storeWhatsAppUrl = (() => {
  const number = whatsappNumber();
  if (!number) return null;
  const text = encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات عمران تويز.");
  return `https://wa.me/${number}?text=${text}`;
})();

const categories = [
  "سيارات وألعاب ريموت",
  "عرائس وألعاب بنات",
  "ألعاب مطبخ وتمثيل أدوار",
  "ألعاب تعليمية وفنية",
  "ألعاب حركة ومستلزمات مائية",
];

export default function Home() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f3ec] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f3ec]/95 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <a href="/" className="text-xl font-black tracking-tight text-emerald-950">
            عمران للألعاب
          </a>
          <nav className="flex items-center gap-3 text-sm font-bold text-stone-700">
            <a href="/products" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-emerald-900">
              المنتجات
            </a>
            {storeWhatsAppUrl && (
              <a
                href={storeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-white transition hover:bg-[#1eb857]"
              >
                <MessageCircle size={16} aria-hidden="true" /> واتساب
              </a>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="container grid gap-10 py-14 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-900">
              <Sparkles size={15} aria-hidden="true" /> لعب أطفال وهدايا مختارة
            </span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.15] text-emerald-950 sm:text-6xl">
              شركة عمران التجارية
              <span className="mt-2 block text-orange-700">أكبر تشكيلة لعب أطفال وهدايا</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
              استعرض المنتجات المتاحة، شاهد الصور والتفاصيل، وتواصل مباشرة عبر واتساب للاستفسار عن السعر والكميات والتوفر.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/products"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-emerald-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-900"
              >
                <Search size={18} aria-hidden="true" /> تصفح المنتجات
              </a>
              {storeWhatsAppUrl && (
                <a
                  href={storeWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-black text-emerald-950 transition hover:border-emerald-700"
                >
                  <MessageCircle size={18} aria-hidden="true" /> للاستفسار والكميات
                </a>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-emerald-950 p-7 text-white shadow-2xl sm:p-9">
            <p className="text-sm font-black text-emerald-200">تجربة شراء مباشرة وواضحة</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-white/10 p-5">
                <PackageCheck size={24} aria-hidden="true" />
                <p className="mt-3 font-black">منتجات موثقة بالصور</p>
                <p className="mt-1 text-sm leading-6 text-emerald-100">المنتجات المنشورة تمر بمراجعة قبل ظهورها في المتجر.</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-5">
                <ShieldCheck size={24} aria-hidden="true" />
                <p className="mt-3 font-black">بيانات واضحة بدون تخمين</p>
                <p className="mt-1 text-sm leading-6 text-emerald-100">أي سعر غير مؤكد يظهر للاستفسار بدل عرض بيانات غير موثوقة.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-white py-14">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-orange-700">تصفح حسب النوع</p>
                <h2 className="mt-1 text-3xl font-black text-emerald-950">أقسام رئيسية</h2>
              </div>
              <a href="/products" className="text-sm font-black text-emerald-900 hover:underline">
                عرض كل المنتجات
              </a>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(category => (
                <a
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="rounded-2xl border border-stone-200 bg-[#f7f3ec] p-5 font-black text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow-md"
                >
                  {category}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-14 lg:py-20">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="text-lg font-black text-emerald-950">طلب سريع عبر واتساب</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">كل منتج يوصلك مباشرة لمحادثة الاستفسار بدل خطوات شراء معقدة.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="text-lg font-black text-emerald-950">كتالوج يتحدث باستمرار</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">نعرض داخل الموقع المنتجات التي تمت مراجعة بياناتها وصورها فقط.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="text-lg font-black text-emerald-950">مناسب للقطاعي والكميات</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">يمكنك الاستفسار عن التوفر والسعر والكميات مباشرة مع فريق المتجر.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-900 bg-emerald-950 py-10 text-emerald-50">
        <div className="container flex flex-col gap-3 text-center sm:text-right">
          <p className="text-lg font-black">شركة عمران التجارية — عمران للألعاب</p>
          <p className="text-sm text-emerald-200">لعب أطفال وهدايا — تصفح الكتالوج واستفسر مباشرة عبر واتساب.</p>
        </div>
      </footer>
    </div>
  );
}
