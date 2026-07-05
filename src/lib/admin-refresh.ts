// Lightweight pub-sub so admin pages can invalidate each other on writes.
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuthReady } from "@/hooks/use-auth-ready";

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

/** Re-runs `refetch` only after Supabase auth storage is hydrated. */
export function useAdminAutoRefresh(refetch: () => void, enabled = true) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const authReady = useAuthReady();
  const active = enabled && authReady;

  useEffect(() => {
    if (active) refetch();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [pathname, active]);
  useEffect(() => {
    if (!active) return;
    const off = onAdminRefresh(refetch);
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { off(); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return active;
}
