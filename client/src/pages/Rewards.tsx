import { Gift } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";

export default function Rewards() {
  return <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink"><AnnouncementBar /><BrandHeader /><main className="container py-10 sm:py-16"><div className="mx-auto max-w-3xl rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10"><span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-yellow/25 text-brand-navy"><Gift /></span><p className="mt-5 text-sm font-bold text-brand-blue">مكافآت عمران تويز</p><h1 className="mt-2 text-3xl font-black text-brand-navy">مزايا وعروض مخصوصة لعملاء عمران تويز</h1><p className="mt-4 leading-8 text-brand-muted">تابع الصفحة عشان تعرف أحدث المزايا والعروض الخاصة المتاحة لعملائنا.</p></div></main><SiteFooter /></div>;
}
