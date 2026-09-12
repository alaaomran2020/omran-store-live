import { ChevronLeft, Gift, PartyPopper, Sparkles } from "lucide-react";

const features = [
  { icon: Gift, label: "هدايا" },
  { icon: Sparkles, label: "بالونات" },
  { icon: PartyPopper, label: "مستلزمات حفلات" },
];

export default function PopUpPromo() {
  return (
    <section className="border-b border-brand-border bg-white py-3 sm:py-4">
      <div className="container">
        <a
          href="/popup"
          className="group relative isolate mx-auto block max-w-5xl overflow-hidden rounded-[1.35rem] border border-[#eadcf6] bg-[linear-gradient(115deg,#35134f_0%,#5e2181_48%,#84369f_100%)] px-4 py-3.5 text-white shadow-[0_12px_34px_rgba(76,29,103,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_17px_42px_rgba(76,29,103,0.26)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a0e0] sm:px-5 sm:py-4 lg:px-6"
          aria-label="افتح قسم POP UP للهدايا والبالونات ومستلزمات الحفلات"
        >
          <span className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-[#ffc938]/30 blur-2xl transition duration-700 group-hover:scale-125" />
          <span className="pointer-events-none absolute -bottom-16 left-1/4 h-36 w-36 rounded-full bg-[#f7a6ca]/20 blur-3xl" />

          <div className="relative flex items-center justify-between gap-3 sm:gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ffd85d] backdrop-blur sm:text-[11px]">
                  <Sparkles size={12} aria-hidden="true" /> Special Department
                </span>
                <div className="flex items-baseline gap-2">
                  {/* Promo badge, not a section heading: an <h2> here would precede the
                      page <h1> and break the heading order. Styling is unchanged. */}
                  <p className="text-2xl font-black tracking-[-0.04em] text-white drop-shadow sm:text-3xl">POP UP</p>
                  <span className="text-xs font-extrabold text-[#ffd85d] sm:text-sm">Gifts & Balloons</span>
                </div>
              </div>

              <p className="mt-1.5 max-w-xl text-xs font-bold leading-5 text-white/85 sm:text-sm sm:leading-6">
                بالونات، هدايا ومستلزمات حفلات لكل مناسبة.
              </p>

              <div className="mt-2.5 hidden flex-wrap gap-1.5 sm:flex">
                {features.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-extrabold text-white/95 backdrop-blur transition duration-300 group-hover:bg-white/15"
                  >
                    <Icon size={13} aria-hidden="true" /> {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="relative hidden h-14 w-16 md:block" aria-hidden="true">
                <span className="absolute right-0 top-1 h-9 w-8 rounded-[50%] bg-[#ffd13f] shadow-[inset_-5px_-6px_0_rgba(255,255,255,0.14),0_8px_14px_rgba(0,0,0,0.12)] transition duration-500 group-hover:-translate-y-1.5" />
                <span className="absolute left-1 top-0 h-10 w-9 rounded-[50%] bg-[#f2a6ce] shadow-[inset_-5px_-6px_0_rgba(255,255,255,0.14),0_8px_14px_rgba(0,0,0,0.12)] transition duration-500 group-hover:-translate-y-2" />
                <span className="absolute bottom-0 right-4 h-6 w-px rotate-6 bg-white/45" />
                <span className="absolute bottom-0 left-5 h-6 w-px -rotate-6 bg-white/45" />
              </div>

              <span className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#542170] shadow-md transition duration-300 group-hover:gap-2 group-hover:bg-[#fff8da] sm:px-4 sm:text-sm">
                <span className="hidden sm:inline">اكتشف القسم</span>
                <span className="sm:hidden">اكتشف</span>
                <ChevronLeft size={16} aria-hidden="true" />
              </span>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
