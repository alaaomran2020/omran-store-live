/**
 * client/src/admin/ui.tsx — مكونات لوحة الإدارة (Dark Digital Brutalism).
 * ألوان مخصصة من @theme في index.css: electric / sunbeam / ink.
 */
import { useRef } from "react";
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function BrutalCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-2 border-ink-deep bg-slate-900 shadow-[4px_4px_0_0_#050A18]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-300">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-none border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 " +
  "placeholder:text-slate-600 focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/30 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(inputBase, className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(inputBase, "min-h-24 resize-y", className)} />;
}

export function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-none border-2 border-sunbeam-hover bg-sunbeam px-4 py-2 text-sm font-black text-sunbeam-ink " +
          "shadow-[3px_3px_0_0_#050A18] transition-colors hover:bg-sunbeam-hover " +
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-sunbeam",
        className
      )}
    />
  );
}

export function GhostButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-none border-2 border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 " +
          "transition-colors hover:border-electric hover:text-electric " +
          "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
    />
  );
}

const noticeStyles = {
  error: "border-red-600 bg-red-950/40 text-red-300",
  info: "border-electric bg-electric/10 text-electric-soft",
  success: "border-emerald-600 bg-emerald-950/40 text-emerald-300",
  warn: "border-sunbeam-hover bg-sunbeam/10 text-sunbeam",
} as const;

export function Notice({
  kind = "info",
  children,
  className,
}: {
  kind?: keyof typeof noticeStyles;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      dir="rtl"
      className={cn(
        "border-2 px-3 py-2 text-sm leading-relaxed",
        noticeStyles[kind],
        className
      )}
    >
      {children}
    </div>
  );
}

export function RoleBadge({ role }: { role: "super_admin" | "limited_admin" }) {
  const limited = role === "limited_admin";
  return (
    <span
      dir="rtl"
      className={cn(
        "rounded-none border-2 px-2 py-1 font-mono text-[10px] font-black tracking-widest uppercase",
        limited
          ? "border-electric bg-electric/10 text-electric"
          : "border-sunbeam bg-sunbeam/10 text-sunbeam"
      )}
    >
      {limited ? "صلاحيات محدودة" : "مالك"}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-electric-soft">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-electric border-t-transparent" />
      {label ? <span className="font-mono text-xs tracking-widest">{label}</span> : null}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-black text-slate-100">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

/** مربعات إدخال الكود المكوّنة من 6 خانات */
export function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  return (
    <div
      dir="ltr"
      className="flex cursor-text gap-2"
      onClick={() => inputRef.current?.focus()}
    >
      {digits.map((d, i) => (
        <div
          key={i}
          className={cn(
            "flex h-12 w-11 items-center justify-center border-2 border-slate-700 bg-slate-950 font-mono text-lg font-black text-slate-100",
            i === Math.min(value.length, 5) && "border-electric"
          )}
        >
          {d === " " ? "" : d}
        </div>
      ))}
      <input
        ref={inputRef}
        autoFocus
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="absolute h-0 w-0 opacity-0"
        aria-label="كود التحقق"
      />
    </div>
  );
}
