"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development a registered worker keeps serving stale cached HTML/JS
    // (that's its job for production PWA offline support), which produces
    // impossible-to-debug hydration mismatches. Unregister and purge instead.
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await registration.update();
      } catch (err) {
        console.error("Service worker registration failed:", err);
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
