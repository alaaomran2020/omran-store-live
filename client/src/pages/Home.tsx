import {
  Baby,
  Gift,
  HeartHandshake,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { WHATSAPP_SCRIPTS, whatsappNumber } from "@/lib/productFormat";

function whatsappUrl(message: string) {
  const number = whatsappNumber();
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

const storeWhatsAppUrl = whatsappUrl(WHATSAPP_SCRIPTS.welcome);
const giftFinderWhatsAppUrl = whatsappUrl(WHATSAPP_SCRIPTS.giftFinder);

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

const ageGroups = ["0-2", "3-5", "6-8", "9-12", "13+"];

const giftIdeas = [
  { title: "هدايا عيد ميلاد", query: "هدية عيد ميلاد" },
  { title: "لعشاق السيارات", query: "سيارات" },
  { title: "للتعلم والإبداع", query: "تعليمية" },
];

export default function Home() {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="sticky top-0 z-40 border-b border-brand-border/90 bg-white/95 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <a href="/" className="min-w-0">
            <span className="block truncate text-lg font-extrabold tracking-tight text-brand-navy sm:text-xl">
              شركة عمران التجارية
            </span>
            <span className="hidden text-xs font-semibold text-brand-muted sm:block">
              لعب أطفال وهدايا
            </span>
          </a>

          <nav className="flex items-center gap-2 text-sm font-bold">
            <a
              href="/products"
              className="rounded-xl px-3 py-2.5 text-brand-navy transition hover:bg-brand-sky hover:text-brand-blue sm:px-4"
            >
              المنتجات
            </a>
            {storeWhatsAppUrl && (
              <a
                href={storeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-whatsapp px-3 py-2 text-white transition hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-whatsapp/25 sm:px-4"
              >
                <MessageCircle size={16} aria-hidden="true" />
                <span className="hidden sm:inline">واتساب</span>
              </a>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="container grid gap-10 py-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/30 px-3 py-1.5 text-xs font-extrabold text-brand-navy">
              <Sparkles size={15} aria-hidden="true" /> فرحة تبدأ من الاختيار
            </span>
            <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.18] text-brand-ink sm:text-5xl lg:text-6xl">
              اكتشف ألعاب وهدايا
              <span className="block text-brand-blue">لكل مناسبة</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-brand-muted sm:text-lg">
              اختيارات متنوعة تساعدك تلاقي اللعبة أو الهدية المناسبة بسهولة، ولو محتار هنساعدك تختار على واتساب.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/products"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-blue-hover focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              >
                <Search size={18} aria-hidden="true" /> اكتشف المنتجات
              </a>
              {giftFinderWhatsAppUrl && (
                <a
                  href={giftFinderWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-brand-border bg-white px-6 py-3 text-sm font-bold text-brand-navy transition hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                >
                  <MessageCircle size={18} aria-hidden="true" /> ساعدني أختار على واتساب
                </a>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-brand-navy p-6 text-white shadow-xl sm:p-8">
            <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-brand-blue/35" />
            <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-brand-yellow/20" />
            <div className="relative">
              <p className="text-sm font-bold text-brand-yellow">اختيار أسهل، بدون تخمين</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-9">قولنا بتدور على إيه، وإحنا نساعدك توصل له</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                  <Gift size={24} aria-hidden="true" />
                  <p className="mt-3 font-extrabold">محتار في هدية؟</p>
                  <p className="mt-1 text-sm leading-6 text-white/75">قولنا السن والمناسبة والميزانية التقريبية.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                  <Search size={24} aria-hidden="true" />
                  <p className="mt-3 font-extrabold">عارف نوع اللعبة؟</p>
                  <p className="mt-1 text-sm leading-6 text-white/75">ابدأ بالتصنيف أو ابحث مباشرة عن المنتج.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-brand-border bg-white py-12 lg:py-16">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-brand-red">Product Discovery</p>
                <h2 className="mt-1 text-2xl font-extrabold text-brand-ink sm:text-3xl">اختار حسب النوع</h2>
              </div>
              <a href="/products" className="text-sm font-bold text-brand-blue hover:underline">
                عرض كل المنتجات
              </a>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(category => (
                <a
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="rounded-2xl border border-brand-border bg-brand-cream p-5 font-extrabold text-brand-navy transition hover:-translate-y-0.5 hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue hover:shadow-sm"
                >
                  {category}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-12 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-brand-blue">
                <Baby size={20} aria-hidden="true" />
                <p className="text-sm font-bold">Shop by Age</p>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-brand-ink sm:text-3xl">اختيارات حسب السن</h2>
              <p className="mt-2 text-sm leading-7 text-brand-muted">استخدم السن كنقطة بداية، وراجع تفاصيل كل منتج قبل الاختيار.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ageGroups.map(age => (
                  <a
                    key={age}
                    href={`/products?age=${encodeURIComponent(age)}`}
                    className="rounded-2xl border border-brand-border bg-white p-4 text-center font-extrabold text-brand-navy transition hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue"
                  >
                    {age} سنوات
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-brand-red">
                <Gift size={20} aria-hidden="true" />
                <p className="text-sm font-bold">Gift Ideas</p>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-brand-ink sm:text-3xl">أفكار تساعدك تبدأ</h2>
              <p className="mt-2 text-sm leading-7 text-brand-muted">لو مش عارف اسم اللعبة، ابدأ بالمناسبة أو الاهتمام.</p>
              <div className="mt-6 grid gap-3">
                {giftIdeas.map(item => (
                  <a
                    key={item.title}
                    href={`/products?search=${encodeURIComponent(item.query)}`}
                    className="flex items-center justify-between rounded-2xl border border-brand-border bg-white p-4 font-extrabold text-brand-navy transition hover:border-brand-blue hover:bg-brand-sky hover:text-brand-blue"
                  >
                    {item.title}
                    <Star size={17} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-brand-sky py-12 lg:py-16">
          <div className="container">
            <div className="text-center">
              <p className="text-sm font-bold text-brand-blue">Why Omran</p>
              <h2 className="mt-2 text-2xl font-extrabold text-brand-ink sm:text-3xl">اختيارات أكثر. اختيار أسهل. خدمة تثق فيها.</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                [PackageCheck, "عرض واضح للمنتجات", "صور ومعلومات تساعدك تفهم المنتج قبل ما تسأل أو تطلب."],
                [ShieldCheck, "معلومات بدون اختلاق", "السعر أو التوفر أو المواصفات غير المؤكدة لا يتم تقديمها كحقيقة."],
                [HeartHandshake, "مساعدة حقيقية", "لو محتار، واتساب عندنا قناة مساعدة في الاختيار مش مجرد زر تواصل."],
              ].map(([Icon, title, body]) => {
                const IconComponent = Icon as typeof PackageCheck;
                return (
                  <div key={String(title)} className="rounded-2xl border border-brand-border bg-white p-6 shadow-[0_4px_18px_rgba(23,32,51,.06)]">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-sky text-brand-blue">
                      <IconComponent size={21} aria-hidden="true" />
                    </span>
                    <p className="mt-4 text-lg font-extrabold text-brand-ink">{String(title)}</p>
                    <p className="mt-2 text-sm leading-7 text-brand-muted">{String(body)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container py-12 lg:py-20">
          <div className="rounded-2xl bg-brand-blue p-6 text-white shadow-xl sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div>
              <p className="text-sm font-bold text-brand-yellow">WhatsApp Assisted Selling</p>
              <h2 className="mt-2 text-2xl font-extrabold">محتار تختار إيه؟ قولنا سن الطفل وإحنا نساعدك.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">ابعتلنا اسم المنتج أو صورته، أو قولنا المناسبة والسن والميزانية التقريبية، وهنساعدك في الوصول لاختيارات مناسبة.</p>
            </div>
            {giftFinderWhatsAppUrl && (
              <a
                href={giftFinderWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-whatsapp px-6 py-3 text-sm font-bold text-white transition hover:bg-whatsapp-hover focus-visible:ring-4 focus-visible:ring-white/30 lg:mt-0"
              >
                <MessageCircle size={18} aria-hidden="true" /> ابدأ على واتساب
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-navy bg-brand-navy py-10 text-white">
        <div className="container grid gap-6 text-center sm:grid-cols-2 sm:text-right">
          <div>
            <p className="text-lg font-extrabold">شركة عمران التجارية</p>
            <p className="mt-1 text-sm text-white/70">لعب أطفال وهدايا — فرحة تبدأ من الاختيار.</p>
          </div>
          <div className="sm:text-left">
            <a href="/products" className="text-sm font-bold text-white hover:text-brand-yellow">تصفح المنتجات</a>
            <p className="mt-2 text-xs text-white/55">omrantoys.store</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
