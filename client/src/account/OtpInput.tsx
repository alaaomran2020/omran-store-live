/**
 * إدخال رمز OTP من 6 خانات — قابل للوصول بالكامل:
 * تنقّل لوحة المفاتيح، Backspace يعود للخلف السابقة، اللصق يوزّع الرمز،
 * أسهم يمين/يسار، أرقام عربية/لاتينية، وinput مخفي واحد مدعوم بقارئات الشاشة.
 */
import { useEffect, useRef, useState } from "react";
import { OTP_CODE_LENGTH } from "@shared/otp";

const LENGTH = OTP_CODE_LENGTH;

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** يوحد الأرقام العربية والفارسية إلى أرقام لاتينية. */
function toLatinDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, digit => {
    const arabicIndex = ARABIC_DIGITS.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);
    return String(EXTENDED_ARABIC_DIGITS.indexOf(digit));
  });
}

export function OtpInput({
  value,
  onChange,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState(false);

  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length === 0) refs.current[0]?.focus();
  }, []);

  function commit(next: string) {
    const clean = toLatinDigits(next.replace(/[^\d٠-٩۰-۹]/g, "")).slice(0, LENGTH);
    onChange(clean);
    return clean;
  }

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();
  }

  return (
    <div dir="ltr" className="flex justify-center gap-2" role="group" aria-label="خانات رمز التحقق الست">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={node => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`الخانة ${index + 1} من ${LENGTH}`}
          onFocus={event => {
            setFocused(true);
            event.target.select();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={event => {
            if (event.key === "Backspace") {
              event.preventDefault();
              if (digits[index]) {
                const next = value.slice(0, index) + value.slice(index + 1);
                onChange(next.padEnd(LENGTH - 1, "").slice(0, LENGTH - 1));
                focusAt(index);
              } else {
                focusAt(index - 1);
              }
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusAt(index + 1); // RTL: يسار = الخانة التالية
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              focusAt(index - 1);
            } else if (event.key === "Delete") {
              event.preventDefault();
              onChange(value.slice(0, index) + value.slice(index + 1));
            }
          }}
          onChange={event => {
            const raw = event.target.value;
            // لصق متعدد الخانات في خانة واحدة
            if (raw.length > 1) {
              const clean = commit(raw);
              focusAt(clean.length >= LENGTH ? LENGTH - 1 : clean.length);
              return;
            }
            const latin = toLatinDigits(raw);
            if (!/^\d?$/.test(latin)) return;
            const next = (value.slice(0, index) + latin + value.slice(index + 1)).slice(0, LENGTH);
            onChange(next);
            if (latin) focusAt(index + 1);
          }}
          onPaste={event => {
            event.preventDefault();
            const clean = commit(event.clipboardData.getData("text"));
            focusAt(clean.length >= LENGTH ? LENGTH - 1 : clean.length);
          }}
          className={`h-13 w-12 rounded-2xl border-2 bg-white text-center text-2xl font-black text-brand-ink outline-none transition sm:h-14 sm:w-13 ${
            hasError
              ? "border-brand-red focus:ring-4 focus:ring-brand-red/15"
              : digit
                ? "border-brand-blue"
                : "border-brand-border focus:border-brand-blue"
          } ${focused ? "ring-4 ring-brand-blue/15" : ""} disabled:bg-brand-cream`}
          style={{ height: "3.25rem", width: "3rem" }}
        />
      ))}
    </div>
  );
}
