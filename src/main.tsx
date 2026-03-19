import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const hostname = window.location.hostname;
const isPreviewHost = hostname.includes("lovableproject.com") || hostname.includes("id-preview--");
const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

window.addEventListener("pageshow", (event) => {
  console.info("[tab-restore] pageshow", {
    persisted: event.persisted,
    wasDiscarded: document.wasDiscarded,
    navigationType: navigationEntry?.type,
    path: `${window.location.pathname}${window.location.search}`,
    previewHost: isPreviewHost,
  });
});

if (document.wasDiscarded) {
  console.warn("[tab-restore] Chrome discarded this tab and restored the page. The previous issue came from stale route/module loading during restore, not from a focus or visibility listener.", {
    navigationType: navigationEntry?.type,
    path: `${window.location.pathname}${window.location.search}`,
    previewHost: isPreviewHost,
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (isPreviewHost) {
      console.warn("[tab-restore] Preview host detected: disabling service worker and clearing cached app shells to prevent stale module restores on tab return.");
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        void Promise.all(registrations.map((registration) => registration.unregister()));
      }).catch((err) => {
        console.warn("SW unregister failed:", err);
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          void Promise.all(keys.filter((key) => key.startsWith("hireforjob-")).map((key) => caches.delete(key)));
        }).catch((err) => {
          console.warn("Cache cleanup failed:", err);
        });
      }

      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" storageKey="hire-theme">
    <App />
  </ThemeProvider>
);
