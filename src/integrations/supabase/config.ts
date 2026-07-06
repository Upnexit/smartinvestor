const FALLBACK_SUPABASE_URL = "https://gpyarcrizvjyukaazndj.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweWFyY3JpenZqeXVrYWF6bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjkzOCwiZXhwIjoyMDk4MzA1OTM4fQ.iI3hMWQxrwYVuAz-Lxkq257Be-Rn1GXCjF0hVPLzupw";

function readRuntimeEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env?.[name];
}

export function resolveSupabasePublicEnv() {
  const SUPABASE_URL =
    readRuntimeEnv("SUPABASE_URL") ||
    readRuntimeEnv("VITE_SUPABASE_URL") ||
    import.meta.env.VITE_SUPABASE_URL ||
    FALLBACK_SUPABASE_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    readRuntimeEnv("SUPABASE_PUBLISHABLE_KEY") ||
    readRuntimeEnv("SUPABASE_PUBLISHABLE_KEYS") ||
    readRuntimeEnv("SUPABASE_ANON_KEY") ||
    readRuntimeEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    readRuntimeEnv("VITE_SUPABASE_ANON_KEY") ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
}