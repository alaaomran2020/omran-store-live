import {
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { whatsappNumber } from "@/lib/productFormat";

const storeWhatsAppUrl = (() => {
  const number = whatsappNumber();
  if (!number) return null;
  const text = encodeURIComponent(
    "مرحبًا، أريد الاستفسار عن منتجات شركة عمران التجارية."
  );
  return `https://wa.me/${number}?text=${text}`;
})();

const categories = [
  "سيارات وريموت",
  "عرائس وألعاب بنات",
  "ألعاب تعليمية وفنية",
  "ألعاب تمثيل أدوار",
  "ألعاب حركة ورياضة",
  "ألعاب مائية",
  "ألعاب موسيقية",
  "ألعاب خارجية",
  "فنون وإبداع",
];

export default function Home() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="sticky top-0 z-40 border-b border-brand-border/80 bg-brand-cream/95 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <a href="/" className="text-xl font-extrabold tracking-tight text-brand-navy">
            شركة عمران التجارية
          </a>
          <nav className="flex items-center gap-3 text-sm font-bold text-brand-muted">
            <a
              href="/products"
              className="rounded-full px-4 py-2 transition hover:bg-brand-surface hover:text-brand-blue"
            >
              المنتجات
            </a>
            {storeWhatsAppUrl && (
              <a
                href={storeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-whatsapp px-4 py-2 text-white transition hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/25"
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
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/25 px-3 py-1.5 text-xs font-extrabold text-brand-navy">
              <Sparkles size={15} aria-hidden="true" /> لعب أطفال وهدايا
            </span>
            <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.15] text-brand-navy sm:text-6xl">
              شركة عمران التجارية
              <span className="mt-2 block text-brand-blue">
                اختيارات أكثر. اختيار أسهل.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
              استعرض لعب الأطفال والهدايا، شاهد الصور والتفاصيل، وتواصل مباشرة عبر
              واتساب للاستفسار عن السعر والتوفر.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/products"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              >
                <Search size={18} aria-hidden="true" /> تصفح المنتجات
              </a>
              {storeWhatsAppUrl && (
                <a
                  href={storeWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-6 py-3 text-sm font-bold text-brand-navy transition hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                >
                  <MessageCircle size={18} aria-hidden="true" /> للاستفسار عبر واتساب
                </a>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-brand-navy p-7 text-white shadow-2xl sm:p-9">
            <p className="text-sm font-bold text-brand-yellow">تجربة شراء مباشرة وواضحة</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <PackageCheck size={24} aria-hidden="true" />
                <p className="mt-3 font-extrabold">منتجات موثقة بالصور</p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  المنتجات المنشورة تمر بمراجعة قبل ظهورها في المتجر.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <ShieldCheck size={24} aria-hidden="true" />
                <p className="mt-3 font-extrabold">بيانات واضحة بدون تخمين</p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  أي سعر غير مؤكد يظل للاستفسار بدل عرض بيانات غير موثوقة.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-brand-border bg-brand-surface py-14">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-brand-red">تصفح حسب النوع</p>
                <h2 className="mt-1 text-3xl font-extrabold text-brand-navy">أقسام رئيسية</h2>
              </div>
              <a href="/products" className="text-sm font-bold text-brand-blue hover:underline">
                عرض كل المنتجات
              </a>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(category => (
                <a
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="rounded-2xl border border-brand-border bg-brand-cream p-5 font-extrabold text-brand-navy transition hover:-translate-y-0.5 hover:border-brand-blue hover:text-brand-blue hover:shadow-md"
                >
                  {category}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-14 lg:py-20">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["طلب سريع عبر واتساب", "كل منتج يوصلك مباشرة لمحادثة الاستفسار بدل خطوات شراء معقدة."],
              ["كتالوج موثّق", "نعرض داخل الموقع المنتجات التي تمت مراجعة بياناتها وصورها فقط."],
              ["اختيار أسهل", "لو محتار، ابعتلنا سن الطفل أو نوع الهدية ونساعدك في الوصول لاختيار مناسب."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-brand-border bg-brand-surface p-6">
                <p className="text-lg font-extrabold text-brand-navy">{title}</p>
                <p className="mt-2 text-sm leading-7 text-brand-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-navy bg-brand-navy py-10 text-white">
        <div className="container flex flex-col gap-3 text-center sm:text-right">
          <p className="text-lg font-extrabold">شركة عمران التجارية</p>
          <p className="text-sm text-white/70">
            لعب أطفال وهدايا — اكتشف المنتجات واستفسر مباشرة عبر واتساب.
          </p>
        </div>
      </footer>
    </div>
  );
}
