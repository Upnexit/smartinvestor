// Lightweight pub-sub so admin pages can invalidate each other on writes.
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

type Listener = () => void;
const listeners = new Set<Listener>();

export function emitAdminRefresh() {
  listeners.forEach((l) => {
    try { l(); } catch { /* noop */ }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin-refresh"));
  }
}

export function onAdminRefresh(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-runs `refetch` on bus events, route change and tab focus. */
export function useAdminAutoRefresh(refetch: () => void) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { refetch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);
  useEffect(() => {
    const off = onAdminRefresh(refetch);
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { off(); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
