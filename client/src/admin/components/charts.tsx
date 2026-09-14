/**
 * رسوم بيانية خفيفة بـSVG بلا أي مكتبة خارجية — تتحمل آلاف الصفوف دون وزن
 * إضافي على حزمة المتجر (تُحمّل مع كود الإدارة فقط عبر route splitting).
 * كل رسم له حالة فراغ صادقة وتلميحات وصفية (title) واستجابة للعرض.
 */
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./primitives";

export type ChartDatum = { key: string; label: string; count: number };

const PALETTE = ["#1769e0", "#123b6d", "#2f80ed", "#1d9d62", "#f0a202", "#c62828", "#7c3aed", "#0d8649", "#94a3b8", "#ea580c"];

function ChartFrame({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 py-4", className)}>
      {title ? <p className="mb-3 text-xs font-black text-brand-muted">{title}</p> : null}
      {children}
    </div>
  );
}

/** رسم دائري لتوزيع الفئات + أسطورة بالأعداد والنسب. */
export function DonutChart({ data, centerLabel }: { data: ChartDatum[]; centerLabel?: string }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const gradientId = useId();
  if (total === 0) {
    return <EmptyState title="لا توجد بيانات بعد" description="الرسم يظهر فور توفّر بيانات حقيقية." />;
  }
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label="رسم دائري للتوزيع">
        <title>
          {data.map(d => `${d.label}: ${d.count}`).join("، ")}
        </title>
        <g transform="rotate(-90 80 80)">
          {data.map((d, index) => {
            const fraction = d.count / total;
            const dash = fraction * circumference;
            const segment = (
              <circle
                key={d.key}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={PALETTE[index % PALETTE.length]}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              >
                <title>{`${d.label}: ${d.count} (${Math.round(fraction * 100)}%)`}</title>
              </circle>
            );
            offset += dash;
            return segment;
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="fill-brand-ink text-xl font-black">
          {total}
        </text>
        <text x="80" y="96" textAnchor="middle" className="fill-brand-muted text-[10px] font-bold">
          {centerLabel ?? "الإجمالي"}
        </text>
        <defs>
          <linearGradient id={gradientId} />
        </defs>
      </svg>
      <ul className="grid w-full grid-cols-1 gap-1.5">
        {data.map((d, index) => (
          <li key={d.key} className="flex items-center gap-2 text-xs font-bold text-brand-navy">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{d.label}</span>
            <span className="tabular-nums text-brand-muted">{d.count}</span>
            <span className="w-10 text-left tabular-nums text-brand-disabled">{Math.round((d.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** أعمدة أفقية لترتيب الفئات/المنتجات — مناسب للعربية. */
export function HBarChart({ data, emptyTitle }: { data: ChartDatum[]; emptyTitle?: string }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...data.map(d => d.count));
  if (total === 0) {
    return <EmptyState title={emptyTitle ?? "لا توجد بيانات بعد"} />;
  }
  return (
    <ul className="space-y-2.5">
      {data.map((d, index) => (
        <li key={`${d.key}-${index}`}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold">
            <span className="min-w-0 truncate text-brand-navy">{d.label}</span>
            <span className="shrink-0 tabular-nums text-brand-muted">{d.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-cream" aria-hidden="true">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: PALETTE[index % PALETTE.length] }}
            >
              <span className="sr-only">{`${d.label}: ${d.count}`}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** مخطط خطي/مناطق بسيط للسلاسل اليومية. */
export function LineTrendChart({ points, height = 140 }: { points: { date: string; label: string; count: number }[]; height?: number }) {
  const width = 600;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const total = points.reduce((sum, p) => sum + p.count, 0);
  if (points.length === 0 || total === 0) {
    return <EmptyState title="لا أحداث في هذه الفترة" description="تظهر هنا ضغطات واتساب الحقيقية يومًا بيوم فور تفعيل قراءة التحليلات." />;
  }
  const max = Math.max(1, ...points.map(p => p.count));
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const xy = points.map((p, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (p.count / max) * innerH,
    ...p,
  }));
  const linePath = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xy[xy.length - 1]!.x.toFixed(1)},${padding.top + innerH} L${xy[0]!.x.toFixed(1)},${padding.top + innerH} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="الاتجاه اليومي">
        <title>{points.map(p => `${p.label}: ${p.count}`).join("، ")}</title>
        {[0.25, 0.5, 0.75].map(ratio => (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * ratio}
            y2={padding.top + innerH * ratio}
            stroke="#e4e9f0"
            strokeDasharray="4 4"
          />
        ))}
        <path d={areaPath} fill="#1769e0" opacity="0.08" />
        <path d={linePath} fill="none" stroke="#1769e0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#1769e0" strokeWidth="2">
              <title>{`${p.date}: ${p.count}`}</title>
            </circle>
            {i % Math.ceil(points.length / 7) === 0 ? (
              <text x={p.x} y={height - 6} textAnchor="middle" className="fill-brand-muted text-[9px] font-bold">
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-brand-border bg-white shadow-[0_1px_3px_rgba(16,42,82,0.06)]", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-brand-border px-5 py-4">
        <div>
          <h3 className="text-sm font-extrabold text-brand-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-brand-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <ChartFrame>{children}</ChartFrame>
    </div>
  );
}
