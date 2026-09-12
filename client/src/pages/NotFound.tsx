import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import { SeoMetadata } from "@/components/SeoMetadata";
import SiteFooter from "@/components/SiteFooter";
import { MAIN_CONTENT_ID } from "@/lib/a11y";

export default function NotFound() {
  const [location, setLocation] = useLocation();

  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink">
      {/* noindex + عنوان مستقل: لا تبقى metadata الصفحة السابقة على 404. */}
      <SeoMetadata
        path={location}
        title="الصفحة غير موجودة | عمران تويز"
        description="الرابط الذي فتحتَه غير موجود أو تغيّر. ارجع للرئيسية وكمل تصفح لعب الأطفال والهدايا."
        robots="noindex,follow"
      />
      <AnnouncementBar />
      <BrandHeader />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="container flex min-h-[55vh] items-center justify-center py-12">
        <section className="w-full max-w-lg rounded-3xl border border-brand-border bg-white p-7 text-center shadow-sm sm:p-10">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-brand-red">
            <AlertCircle size={32} aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-black text-brand-blue">خطأ 404</p>
          <h1 className="mt-2 text-3xl font-black text-brand-navy">الصفحة دي مش موجودة</h1>
          <p className="mt-3 text-sm leading-7 text-brand-muted">ممكن يكون الرابط اتغير. ارجع للصفحة الرئيسية وكمل تصفح المنتجات.</p>
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-sm font-black text-white transition hover:bg-brand-blue-hover focus-visible:ring-4 focus-visible:ring-brand-blue"
          >
            <Home size={18} aria-hidden="true" /> العودة للرئيسية
          </button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
