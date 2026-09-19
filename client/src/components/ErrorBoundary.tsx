import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

const CHUNK_RECOVERY_KEY = "omran:chunk-recovery";

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError/i.test(
    `${error.name}: ${error.message}`
  );
}

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

  componentDidCatch(error: Error) {
    if (!isChunkLoadError(error) || typeof window === "undefined") return;

    try {
      if (window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) === "1") return;
      window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");
      window.location.reload();
    } catch {
      // If storage is unavailable, keep the fallback visible.
    }
  }

  private reloadLatestVersion = () => {
    try {
      window.sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    } catch {
      // Reload still works when sessionStorage is blocked.
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div lang="ar" dir="rtl" className="flex min-h-screen items-center justify-center bg-brand-cream p-6 text-brand-ink">
          <div className="flex w-full max-w-2xl flex-col items-center p-8">
            <AlertTriangle size={48} className="mb-6 flex-shrink-0 text-brand-red" />

            <h2 className="mb-3 text-center text-2xl font-black text-brand-navy">حصل تحديث للمتجر</h2>
            <p className="mb-6 max-w-md text-center text-sm font-semibold leading-7 text-brand-muted">
              حدّث الصفحة لتحميل أحدث نسخة من عمران تويز.
            </p>

            <button
              onClick={this.reloadLatestVersion}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-xl px-5 py-3",
                "bg-brand-blue font-black text-white",
                "cursor-pointer hover:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25"
              )}
            >
              <RotateCcw size={16} />
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;