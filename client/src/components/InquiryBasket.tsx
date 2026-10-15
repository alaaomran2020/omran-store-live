import { MessageCircle, ShoppingBasket, X } from "lucide-react";
import { buildBulkInquiryUrl, clearInquiryCart, removeInquiryProduct, useInquiryItems } from "@/lib/inquiryCart";

export default function InquiryBasket() {
  const items = useInquiryItems();
  if (!items.length || typeof window === "undefined") return null;
  if (/^\/(admin|account|popup)(\/|$)/.test(window.location.pathname)) return null;
  const whatsappUrl = buildBulkInquiryUrl(items);
  return (
    <aside aria-label="قائمة الاستفسار" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl border border-brand-border bg-white p-3 text-brand-ink shadow-2xl sm:bottom-5" dir="rtl">
      <div className="flex items-center gap-2">
        <ShoppingBasket size={21} className="shrink-0 text-brand-blue" aria-hidden="true" />
        <strong className="min-w-0 flex-1 text-sm font-black text-brand-navy" aria-live="polite">قائمة الاستفسار ({items.length} صنف)</strong>
        <button type="button" onClick={clearInquiryCart} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-brand-muted hover:bg-brand-sky" aria-label="مسح قائمة الاستفسار">
          <X size={14} aria-hidden="true" /> مسح
        </button>
        {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-whatsapp px-3 py-2 text-xs font-black text-white hover:bg-whatsapp-hover sm:text-sm">
          <MessageCircle size={17} aria-hidden="true" /> استفسار واتساب
        </a>}
      </div>
      <details className="mt-1 text-xs">
        <summary className="cursor-pointer py-1 font-bold text-brand-blue">عرض الأصناف المختارة</summary>
        <ul className="mt-1 max-h-40 space-y-1 overflow-auto">
          {items.map(item => <li key={item.id} className="flex items-center gap-2 border-b border-brand-border py-1.5">
            <span className="min-w-0 flex-1 truncate">{item.name} — <b dir="ltr">{item.id}</b></span>
            <button type="button" className="rounded-lg px-2 py-1 font-bold text-brand-red hover:bg-red-50" onClick={() => removeInquiryProduct(item.id)} aria-label={`إزالة ${item.name} من القائمة`}>إزالة</button>
          </li>)}
        </ul>
      </details>
    </aside>
  );
}
