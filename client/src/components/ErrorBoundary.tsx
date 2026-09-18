import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div lang="ar" dir="rtl" className="flex min-h-screen items-center justify-center bg-brand-cream p-6">
          <div className="w-full max-w-lg rounded-3xl border border-brand-border bg-brand-surface p-6 text-center shadow-[var(--shadow-card)] sm:p-8">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-brand-error" aria-hidden="true">
              <AlertTriangle size={30} />
            </span>
            <h2 className="mt-5 text-xl font-black text-brand-navy sm:text-2xl">حصلت مشكلة غير متوقعة</h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-brand-muted">
              جرّب تحميل الصفحة تاني. لو المشكلة مستمرة، تقدر ترجع للرئيسية وتكمل تصفح عمران تويز.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold",
                  "bg-brand-blue text-white hover:bg-brand-blue-hover"
                )}
              >
                <RotateCcw size={16} aria-hidden="true" />
                حاول تاني
              </button>
              <a
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brand-border bg-white px-4 py-3 font-bold text-brand-blue hover:border-brand-blue hover:bg-brand-sky"
              >
                الرجوع للرئيسية
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
