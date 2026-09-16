import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { APP_VERSION, APP_BUILD_TIMESTAMP } from "@/config/version";
import { forceUpdateServiceWorker } from "@/lib/pwa-register";

const CHECK_INTERVAL_MS = 45 * 1000; // Check every 45 seconds
const VERSION_ENDPOINT = "/version.json";

export function useAutoUpdate() {
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    async function checkServerVersion() {
      if (isUpdatingRef.current) return;

      try {
        const response = await fetch(`${VERSION_ENDPOINT}?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = String(data?.version ?? "").trim();
        const serverTimestamp = Number(data?.buildTimestamp ?? 0);

        // Check if server version is different or timestamp is newer
        const hasNewVersion =
          (serverVersion && serverVersion !== APP_VERSION) ||
          (serverTimestamp && serverTimestamp > APP_BUILD_TIMESTAMP);

        if (hasNewVersion && !isUpdatingRef.current) {
          isUpdatingRef.current = true;

          // Prevent repeated reload loops within the same session
          const lastReloadedVersion = window.sessionStorage.getItem("si_auto_reloaded_ver");
          if (lastReloadedVersion === serverVersion) {
            isUpdatingRef.current = false;
            return;
          }

          window.sessionStorage.setItem("si_auto_reloaded_ver", serverVersion);

          toast.info("🚀 নতুন আপডেট পাওয়া গেছে!", {
            description: "অ্যাপটি স্বয়ংক্রিয়ভাবে রিফ্রেশ হচ্ছে...",
            duration: 4000,
          });

          // Invalidate caches and service worker
          await forceUpdateServiceWorker();

          // Smooth reload
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      } catch {
        // Network or fetch failed, silently ignore to avoid interrupting user
      }
    }

    // Check once after initial mount (slight delay so it doesn't block initial render)
    const initialTimer = setTimeout(() => {
      if (isMounted) checkServerVersion();
    }, 3000);

    // Periodic check
    const intervalTimer = setInterval(() => {
      if (isMounted) checkServerVersion();
    }, CHECK_INTERVAL_MS);

    // Check when user returns to window or unlocks phone
    const handleFocus = () => {
      if (isMounted) checkServerVersion();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMounted) {
        checkServerVersion();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
