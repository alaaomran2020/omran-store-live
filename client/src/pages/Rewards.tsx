import { Gift, ShieldCheck } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { REWARDS_POLICY } from "@/lib/rewards";

export default function Rewards() {
  return <div dir="rtl" className="min-h-screen bg-brand-cream text-brand-ink"><AnnouncementBar /><BrandHeader /><main className="container py-10 sm:py-16"><div className="mx-auto max-w-3xl rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10"><span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-yellow/25 text-brand-navy"><Gift /></span><p className="mt-5 text-sm font-bold text-brand-blue">نظام نقاط عمران تويز</p><h1 className="mt-2 text-3xl font-black text-brand-navy">مكافآت موثقة بدون شروط على رأي العميل</h1><p className="mt-4 leading-8 text-brand-muted">البنية التقنية جاهزة لتسجيل المشتريات المؤكدة والمراجعات الحقيقية والصور وتسوية النقاط عند المرتجعات، مع منع تكرار نفس المرجع.</p><div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><ShieldCheck className="mt-1 shrink-0" size={20}/><p>{REWARDS_POLICY.enabled ? "النظام مفعل." : "النظام غير مفعل ماليًا حتى اعتماد قيمة النقطة، الحد الأدنى للاستبدال، مدة الصلاحية وحدود الاستخدام."}</p></div></div></main><SiteFooter /></div>;
}
