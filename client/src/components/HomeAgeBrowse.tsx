import { ArrowLeft } from "lucide-react";

const ageGroups = [
  { key: "0-2", label: "0–2", caption: "سنين" },
  { key: "3-5", label: "3–5", caption: "سنين" },
  { key: "6-8", label: "6–8", caption: "سنين" },
  { key: "9-12", label: "9–12", caption: "سنة" },
  { key: "13+", label: "+13", caption: "سنة" },
] as const;

export default function HomeAgeBrowse() {
  return (
    <section className="border-b border-brand-border bg-brand-cream py-8 sm:py-11" aria-labelledby="home-age-title">
      <div className="container">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-brand-blue sm:text-sm">اختيار أسرع</p>
            <h2 id="home-age-title" className="font-hand-ar mt-1 text-3xl font-bold text-brand-navy sm:text-4xl">تسوق حسب العمر</h2>
          </div>
          <a href="/products#feed" className="hidden min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-brand-blue hover:bg-brand-sky sm:inline-flex">
            كل اللعب <ArrowLeft size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ageGroups.map(group => (
            <a
              key={group.key}
              href={`/products?age=${encodeURIComponent(group.key)}#feed`}
              className="omran-pressable group flex min-h-28 items-center justify-between rounded-[1.5rem] border border-brand-border bg-brand-surface px-4 py-4 shadow-[0_8px_22px_rgba(18,59,109,.06)] transition hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-[0_14px_30px_rgba(18,59,109,.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              aria-label={`تصفح لعب عمر ${group.label} ${group.caption}`}
            >
              <span>
                <span className="block text-2xl font-black text-brand-navy sm:text-3xl">{group.label}</span>
                <span className="mt-1 block text-xs font-bold text-brand-muted">{group.caption}</span>
              </span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-sky text-brand-blue transition group-hover:bg-brand-blue group-hover:text-white" aria-hidden="true">
                <ArrowLeft size={16} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}