import { logAppError } from "./error-monitor.functions";
import { supabase } from "@/integrations/supabase/client";

// Simple in-memory dedupe so a runaway loop doesn't spam the server.
const seen = new Map<string, number>();
const DEDUPE_MS = 60_000;

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function shouldSend(fingerprint: string): boolean {
  const now = Date.now();
  const last = seen.get(fingerprint) ?? 0;
  if (now - last < DEDUPE_MS) return false;
  seen.set(fingerprint, now);
  // Trim map occasionally
  if (seen.size > 200) {
    for (const [k, t] of seen) if (now - t > DEDUPE_MS) seen.delete(k);
  }
  return true;
}

export async function captureError(input: {
  error: unknown;
  source?: string;
  context?: Record<string, unknown>;
  level?: "error" | "warning" | "info";
}) {
  if (typeof window === "undefined") return;
  const err = input.error;
  const message =
    err instanceof Error ? err.message :
    typeof err === "string" ? err :
    (() => { try { return JSON.stringify(err); } catch { return String(err); } })();

  const stack = err instanceof Error ? err.stack?.slice(0, 3000) : undefined;
  const source = input.source ?? "client";
  const fingerprint = hash(`${input.level ?? "error"}|${source}|${message.slice(0, 200)}`);
  if (!shouldSend(fingerprint)) return;

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user?.id ?? null;
  } catch { /* ignore */ }

  try {
    await logAppError({
      data: {
        level: input.level ?? "error",
        message,
        source,
        context: { ...(input.context ?? {}), stack, ts: new Date().toISOString() },
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId,
        fingerprint,
      },
    });
  } catch {
    /* never let the reporter itself crash the app */
  }
}

let installed = false;
export function installGlobalErrorMonitor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    captureError({
      error: e.error ?? e.message,
      source: "window.onerror",
      context: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    captureError({
      error: e.reason,
      source: "unhandledrejection",
    });
  });
}
