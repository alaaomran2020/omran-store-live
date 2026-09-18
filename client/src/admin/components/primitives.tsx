/**
 * مكوّنات لوحة الإدارة الأساسية — نظام بصري أومران:
 * خلفية فاتحة، بطاقات بيضاء بحواف دائرية وظلال خفيفة، أزرق مؤسسي مع لمسات
 * حمراء للتنبيه، تسلسل هرمي واضح وزجّامات لمس ≥44px.
 */
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Permission } from "@shared/rbac";
import { useCan } from "@/admin/AdminIdentity";

// ---------------------------------------------------------------------------
// البطاقات والعناوين
// ---------------------------------------------------------------------------

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-brand-border bg-white shadow-[0_1px_3px_rgba(16,42,82,0.06)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-brand-border px-5 py-4">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 shrink-0 text-brand-blue">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold text-brand-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs leading-5 text-brand-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-black text-brand-ink sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-brand-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

// ---------------------------------------------------------------------------
// الأزرار
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "whatsapp";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-blue text-white hover:bg-brand-blue-hover focus-visible:ring-brand-blue/30 shadow-sm",
  secondary:
    "border border-brand-border bg-white text-brand-navy hover:bg-brand-sky focus-visible:ring-brand-blue/20",
  ghost: "text-brand-navy hover:bg-brand-sky focus-visible:ring-brand-blue/20",
  danger: "bg-brand-red text-white hover:bg-red-700 focus-visible:ring-brand-red/30 shadow-sm",
  success: "bg-brand-success text-white hover:bg-emerald-700 focus-visible:ring-brand-success/30 shadow-sm",
  whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-hover focus-visible:ring-whatsapp/30 shadow-sm",
};

export const AdminButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "md";
    loading?: boolean;
  }
>(function AdminButton(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "min-h-9 px-3 text-xs",
        buttonStyles[variant],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// الحالات
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  icon,
  action,
  tone = "default",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center",
        tone === "warning" ? "border-amber-300 bg-amber-50/60" : "border-brand-border bg-brand-cream/60"
      )}
    >
      <div className={cn("mb-1 rounded-full p-3", tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-brand-sky text-brand-blue")}>
        {icon ?? <Inbox size={22} aria-hidden="true" />}
      </div>
      <h3 className="text-sm font-extrabold text-brand-ink">{title}</h3>
      {description ? <p className="max-w-md text-xs leading-6 text-brand-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "جاري تحميل البيانات…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-brand-muted" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-brand-blue" size={26} aria-hidden="true" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function InfoBanner({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "warning" }) {
  const tones = {
    info: "border-brand-blue/20 bg-brand-sky text-brand-navy",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return <div className={cn("rounded-xl border px-4 py-3 text-xs font-semibold leading-6", tones[tone])}>{children}</div>;
}

// ---------------------------------------------------------------------------
// المدخلات
// ---------------------------------------------------------------------------

export function SearchField({
  value,
  onChange,
  placeholder = "بحث…",
  label = "بحث",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-brand-border bg-white pe-9 ps-3 text-sm font-semibold text-brand-ink placeholder:font-normal placeholder:text-brand-disabled focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
      />
    </div>
  );
}

type SelectOption = { value: string; label: string };

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-bold text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextInput({ label, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className="block text-xs font-extrabold text-brand-navy">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        {...props}
        className={cn(
          "h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-ink placeholder:font-normal placeholder:text-brand-disabled focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15 disabled:bg-brand-cream",
          className
        )}
      />
      {hint ? <p className="text-[11px] leading-4 text-brand-muted">{hint}</p> : null}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className="block text-xs font-extrabold text-brand-navy">
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        {...props}
        className={cn(
          "min-h-24 w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm font-semibold text-brand-ink placeholder:font-normal placeholder:text-brand-disabled focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15 disabled:bg-brand-cream",
          className
        )}
      />
      {hint ? <p className="text-[11px] leading-4 text-brand-muted">{hint}</p> : null}
    </div>
  );
}

export function SelectField({ label, hint, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className="block text-xs font-extrabold text-brand-navy">
          {label}
        </label>
      ) : null}
      <select
        id={id}
        {...props}
        className="h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-bold text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
      >
        {children}
      </select>
      {hint ? <p className="text-[11px] leading-4 text-brand-muted">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// الشارات
// ---------------------------------------------------------------------------

type BadgeTone = "blue" | "green" | "amber" | "red" | "slate" | "purple" | "whatsapp";
const badgeTones: Record<BadgeTone, string> = {
  blue: "bg-brand-sky text-brand-navy border-brand-blue/20",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-800 border-red-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  purple: "bg-violet-50 text-violet-800 border-violet-200",
  whatsapp: "bg-emerald-50 text-[#0a6e3b] border-emerald-200",
};

export function Badge({ children, tone = "slate", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// بوابة الصلاحيات
// ---------------------------------------------------------------------------

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const can = useCan();
  const allowed = Array.isArray(permission) ? permission.some(p => can(p)) : can(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

// ---------------------------------------------------------------------------
// الجدول مع الترقيم (يتحمل آلاف الصفوف: صفحة واحدة فقط تُرسم)
// ---------------------------------------------------------------------------

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  keyOf,
  pageSize = 25,
  emptyMessage = "لا توجد بيانات مطابقة",
  caption,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  pageSize?: number;
  emptyMessage?: string;
  caption?: string;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => rows.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [rows, safePage, pageSize]
  );

  useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-brand-border text-right">
              {columns.map(column => (
                <th key={column.key} scope="col" className={cn("px-4 py-3 text-[11px] font-black uppercase tracking-wide text-brand-muted", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr key={keyOf(row)} className="border-b border-brand-border/70 transition-colors last:border-0 hover:bg-brand-cream/70">
                {columns.map(column => (
                  <td key={column.key} className={cn("px-4 py-3 align-middle text-brand-ink", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm font-semibold text-brand-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize ? (
        <nav className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-brand-muted" aria-label="تنقل الصفحات">
          <span>
            {safePage * pageSize + 1}–{Math.min(rows.length, (safePage + 1) * pageSize)} من {rows.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-navy transition hover:bg-brand-sky disabled:opacity-40"
              aria-label="الصفحة السابقة"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <span className="px-2 tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-navy transition hover:bg-brand-sky disabled:opacity-40"
              aria-label="الصفحة التالية"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// بطاقة المؤشر
// ---------------------------------------------------------------------------

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: BadgeTone;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  return (
    <Card
      className={cn(
        "p-4",
        interactive && "cursor-pointer transition hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={cn("flex w-full items-start gap-3 text-right", !interactive && "cursor-default")}
        tabIndex={interactive ? undefined : -1}
      >
        <span className={cn("rounded-xl p-2.5", badgeTones[tone])} aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-brand-muted">{label}</span>
          <span className="mt-1 block text-2xl font-black tabular-nums text-brand-ink">{value}</span>
          {hint ? <span className="mt-0.5 block text-[11px] font-semibold text-brand-muted">{hint}</span> : null}
        </span>
      </button>
    </Card>
  );
}
