import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css";
import "./design-system.css";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", event => {
    event.preventDefault();
    try {
      if (window.sessionStorage.getItem("omran:chunk-recovery") === "1") return;
      window.sessionStorage.setItem("omran:chunk-recovery", "1");
    } catch {
      // Reload remains safe when storage is unavailable.
    }
    window.location.reload();
  });
}
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider switchable>
      <App />
    </ThemeProvider>
  </QueryClientProvider>
);
