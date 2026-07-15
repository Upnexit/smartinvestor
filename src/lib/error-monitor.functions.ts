import { createServerFn } from "@tanstack/react-start";

// Public endpoint — anyone (even anon) can report an error. Rate-limited by
// the `record_error_log` DB function: repeats bump `count` instead of
// creating new rows (unique index on fingerprint where resolved=false).
export const logAppError = createServerFn({ method: "POST" })
  .inputValidator((d: {
    level?: string;
    message?: string;
    source?: string;
    context?: Record<string, unknown>;
    url?: string;
    userAgent?: string;
    userId?: string | null;
    fingerprint?: string;
  }) => ({
    level: (d?.level ?? "error").slice(0, 20),
    message: (d?.message ?? "unknown error").slice(0, 4000),
    source: (d?.source ?? "client").slice(0, 100),
    context: (d?.context && typeof d.context === "object") ? d.context : {},
    url: typeof d?.url === "string" ? d.url.slice(0, 500) : "",
    userAgent: typeof d?.userAgent === "string" ? d.userAgent.slice(0, 400) : "",
    userId: (typeof d?.userId === "string" && d.userId.length === 36) ? d.userId : null,
    fingerprint: typeof d?.fingerprint === "string" ? d.fingerprint.slice(0, 64) : "",
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: id, error } = await (supabaseAdmin as any).rpc("record_error_log", {
      _level: data.level,
      _message: data.message,
      _source: data.source,
      _context: data.context,
      _user_id: data.userId,
      _url: data.url,
      _user_agent: data.userAgent,
      _fingerprint: data.fingerprint,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: id as string };
  });
