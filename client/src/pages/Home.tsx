import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { fetchProducts } from "@/lib/productsClient";
import { whatsappNumber } from "@/lib/productFormat";
import type { Product } from "@shared/products";
import { MessageCircle, Search, ShieldCheck, Sparkles, Truck, RefreshCw, Store, ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: ({ signal }) => fetchProducts(signal), staleTime: 5 * 60 * 1000 });
  const products = productsQuery.data?.products ?? [];
  const featured = useMemo(() => products.slice(0, 8), [products]);
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).slice(0, 8), [products]);
  const number = whatsappNumber();
  const whatsapp = number ? `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات عمران تويز والكميات المتاحة.")}` : null;

  return <div dir="rtl" className="min-h-screen bg-[#f7f3ec] text-stone-900">
    <div className="bg-emerald-950 px-4 py-2 text-center text-xs font-bold text-emerald-50">أكبر تشكيلة لعب أطفال وهدايا — اطلب واستفسر مباشرة عبر واتساب</div>
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f3ec]/95 backdrop-blur">
      <div className="container flex min-h-20 items-center justify-between gap-4">
        <Link href="/" className="text-xl font-black text-emerald-950">عمران تويز</Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-stone-600 md:flex"><a href="#categories">الأقسام</a><a href="#featured">منتجات مختارة</a><Link href="/products">كل المنتجات</Link><a href="#why">لماذا عمران؟</a></nav>
        <div className="flex items-center gap-2"><Link href="/products" aria-label="البحث في المنتجات" className="rounded-full border border-stone-300 p-2.5 text-emerald-950"><Search size={18}/></Link>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-black text-white"><MessageCircle size={17}/> واتساب</a>}</div>
      </div>
    </header>
    <main>
      <section className="container grid gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-20">
        <div><span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-900"><Sparkles size={15}/> لعب أطفال مختارة بعناية</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.12] text-emerald-950 sm:text-6xl">كل لعبة تبدأ منها <span className="text-orange-700">لحظة فرحة</span></h1><p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">تسوّق تشكيلة عمران تويز من لعب الأطفال والهدايا. صور واضحة، أقسام سهلة، واستفسار سريع عن السعر والكميات عبر واتساب.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/products" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-emerald-950 px-6 py-3 text-sm font-black text-white">تسوق المنتجات <ArrowLeft size={17}/></Link>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-emerald-900 px-6 py-3 text-sm font-black text-emerald-950"><MessageCircle size={18}/> للاستفسار والكميات</a>}</div></div>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-emerald-950 p-8 text-white shadow-2xl"><div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-orange-500/20"/><Store className="relative" size={48}/><p className="relative mt-8 text-sm font-bold text-emerald-200">شركة عمران التجارية</p><p className="relative mt-2 text-3xl font-black leading-tight">متجر ألعاب حقيقي، وليس مجرد كتالوج</p><p className="relative mt-4 leading-7 text-emerald-100">اكتشف الأقسام والمنتجات، افتح تفاصيل المنتج، ثم تواصل معنا مباشرة لإتمام طلبك.</p></div>
      </section>
      <section className="border-y border-stone-200 bg-white py-6"><div className="container grid gap-4 sm:grid-cols-3"><div className="flex items-center gap-3"><Truck className="text-orange-700"/><div><b>تجربة شراء سهلة</b><p className="text-sm text-stone-500">من المنتج إلى الاستفسار مباشرة</p></div></div><div className="flex items-center gap-3"><ShieldCheck className="text-orange-700"/><div><b>بيانات محدثة</b><p className="text-sm text-stone-500">المنتجات تُدار مركزيًا</p></div></div><div className="flex items-center gap-3"><MessageCircle className="text-orange-700"/><div><b>واتساب سريع</b><p className="text-sm text-stone-500">للسعر والتوفر والكميات</p></div></div></div></section>
      <section id="categories" className="container py-14"><div className="mb-7"><p className="text-sm font-bold text-orange-700">تصفح بسهولة</p><h2 className="text-3xl font-black text-emerald-950">أقسام المتجر</h2></div>{categories.length ? <div className="flex flex-wrap gap-3">{categories.map(c => <Link key={c} href={`/products?category=${encodeURIComponent(c)}`} className="rounded-2xl border border-stone-200 bg-white px-5 py-4 font-black text-emerald-950 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700">{c}</Link>)}</div> : <p className="text-stone-500">يتم تحميل الأقسام…</p>}</section>
      <section id="featured" className="border-y border-stone-200 bg-white py-14"><div className="container"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-orange-700">مختارات عمران</p><h2 className="text-3xl font-black text-emerald-950">منتجات مميزة</h2></div><Link href="/products" className="text-sm font-black text-emerald-900">عرض كل المنتجات ←</Link></div>{productsQuery.isLoading ? <div className="flex items-center gap-2 text-stone-500"><RefreshCw className="animate-spin" size={17}/> جارٍ تحميل المنتجات…</div> : featured.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{featured.map(p => <ProductCard key={p.id} product={p} onOpenDetails={setOpenProduct}/>)}</div> : <p className="text-stone-500">المنتجات غير متاحة مؤقتًا. حاول بعد قليل.</p>}</div></section>
      <section id="why" className="container py-14"><div className="rounded-[2rem] bg-orange-50 p-8 sm:p-10"><p className="text-sm font-bold text-orange-800">لماذا عمران؟</p><h2 className="mt-2 text-3xl font-black text-emerald-950">اختيار أكبر، وصول أسرع، وتواصل مباشر</h2><p className="mt-4 max-w-3xl leading-8 text-stone-600">هدف المتجر أن تصل للعبة المناسبة بأقل خطوات ممكنة: تصفح واضح، بحث وفلاتر، تفاصيل المنتج، ثم استفسار واتساب مرتبط بالمنتج نفسه.</p></div></section>
    </main>
    <footer className="bg-emerald-950 py-10 text-emerald-50"><div className="container flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xl font-black">عمران تويز</p><p className="mt-2 text-sm text-emerald-200">شركة عمران التجارية — أكبر تشكيلة لعب أطفال وهدايا</p></div>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white"><MessageCircle size={18}/> تواصل عبر واتساب</a>}</div></footer>
    <ProductDetailsDialog product={openProduct} onClose={() => setOpenProduct(null)}/>
  </div>;
}
