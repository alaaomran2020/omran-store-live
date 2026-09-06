import { ChevronLeft, Gift, PartyPopper, Sparkles } from "lucide-react";

const features = [
  { icon: Gift, label: "هدايا" },
  { icon: Sparkles, label: "بالونات" },
  { icon: PartyPopper, label: "مستلزمات حفلات" },
];

export default function PopUpPromo() {
  return (
    <section className="border-b border-brand-border bg-white py-4 sm:py-6">
      <div className="container">
        <a
          href="/popup"
          className="group relative isolate block overflow-hidden rounded-[1.75rem] border border-[#eadcf6] bg-[linear-gradient(115deg,#35134f_0%,#5e2181_46%,#8a3aaa_100%)] px-5 py-5 text-white shadow-[0_18px_55px_rgba(76,29,103,0.22)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(76,29,103,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7a38a6]/20 sm:px-7 sm:py-6 lg:px-9 lg:py-7"
          aria-label="افتح قسم POP UP للهدايا والبالونات ومستلزمات الحفلات"
        >
          <span className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#ffc938]/35 blur-2xl transition duration-700 group-hover:scale-125" />
          <span className="pointer-events-none absolute -bottom-20 left-1/4 h-52 w-52 rounded-full bg-[#f7a6ca]/25 blur-3xl transition duration-700 group-hover:translate-x-5" />
          <span className="pointer-events-none absolute left-8 top-4 h-16 w-16 rounded-full border border-white/15 bg-white/10 backdrop-blur transition duration-700 group-hover:-translate-y-2 group-hover:translate-x-2" />
          <span className="pointer-events-none absolute left-24 top-10 h-10 w-10 rounded-full bg-[#ffd54c]/80 shadow-lg transition duration-700 group-hover:-translate-y-3" />
          <span className="pointer-events-none absolute bottom-4 left-14 h-8 w-8 rounded-full bg-[#f6b0d3]/80 shadow-lg transition duration-700 group-hover:translate-y-1" />

          <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_auto] lg:gap-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#ffd85d] backdrop-blur sm:text-xs">
                  <Sparkles size={14} aria-hidden="true" /> Special Department
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                <h2 className="text-4xl font-black tracking-[-0.04em] text-white drop-shadow sm:text-5xl lg:text-6xl">POP UP</h2>
                <span className="pb-1 text-sm font-extrabold text-[#ffd85d] sm:text-base">Gifts & Balloons</span>
              </div>

              <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-white/90 sm:text-base sm:leading-8">
                بالونات، هدايا، ومستلزمات عيد الميلاد في قسم واحد بتجربة احتفالية مميزة.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
                {features.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold text-white/95 backdrop-blur transition duration-300 group-hover:bg-white/15 sm:text-sm"
                  >
                    <Icon size={15} aria-hidden="true" /> {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
              <div className="relative hidden h-24 w-28 sm:block lg:h-28 lg:w-32" aria-hidden="true">
                <span className="absolute right-1 top-2 h-14 w-12 rounded-[50%] bg-[#ffd13f] shadow-[inset_-8px_-10px_0_rgba(255,255,255,0.13),0_12px_20px_rgba(0,0,0,0.12)] transition duration-500 group-hover:-translate-y-2" />
                <span className="absolute right-10 top-0 h-16 w-14 rounded-[50%] bg-[#f2a6ce] shadow-[inset_-8px_-10px_0_rgba(255,255,255,0.13),0_12px_20px_rgba(0,0,0,0.12)] transition duration-500 delay-75 group-hover:-translate-y-3" />
                <span className="absolute left-1 top-4 h-14 w-12 rounded-[50%] bg-[#b990db] shadow-[inset_-8px_-10px_0_rgba(255,255,255,0.13),0_12px_20px_rgba(0,0,0,0.12)] transition duration-500 delay-100 group-hover:-translate-y-2" />
                <span className="absolute bottom-0 right-[55%] h-10 w-px rotate-6 bg-white/50" />
                <span className="absolute bottom-0 right-[36%] h-12 w-px -rotate-3 bg-white/50" />
                <span className="absolute bottom-0 right-[18%] h-10 w-px -rotate-6 bg-white/50" />
              </div>

              <span className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#542170] shadow-lg transition duration-300 group-hover:gap-3 group-hover:bg-[#fff8da] sm:px-5">
                اكتشف القسم
                <ChevronLeft size={18} aria-hidden="true" />
              </span>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
