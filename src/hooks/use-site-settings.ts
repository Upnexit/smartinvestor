import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
};

const DEFAULTS: SiteSettings = {
  site_name: "Smart Investor",
  tagline: "স্মার্ট ইনভেস্টর",
  logo_url: "",
  favicon_url: "",
};

const STORAGE_KEY = "si.site-settings.v1";

function readCache(): SiteSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SiteSettings>) };
  } catch {
    return DEFAULTS;
  }
}

function writeCache(v: SiteSettings) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch { /* noop */ }
}

// Module-level singleton state to keep every mounted component in sync
let current: SiteSettings = readCache();
const listeners = new Set<(s: SiteSettings) => void>();
let initialized = false;
let channelStarted = false;

function setAll(next: Partial<SiteSettings>) {
  current = { ...current, ...next };
  writeCache(current);
  listeners.forEach((l) => l(current));
  if (typeof document !== "undefined") {
    if (current.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = current.favicon_url;
    }
  }
}

async function loadOnce() {
  if (initialized) return;
  initialized = true;
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<SiteSettings>;
  setAll(v);
}

function startRealtime() {
  if (channelStarted) return;
  channelStarted = true;
  const ch = supabase
    .channel("site-settings-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "site_settings", filter: "key=eq.site" },
      (payload) => {
        const row = (payload.new ?? payload.old) as { value?: Partial<SiteSettings> } | null;
        if (row?.value) setAll(row.value);
      },
    )
    .subscribe();
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => { void supabase.removeChannel(ch); });
  }
}

export function useSiteSettings(): SiteSettings {
  const [state, setState] = useState<SiteSettings>(current);
  useEffect(() => {
    listeners.add(setState);
    void loadOnce();
    startRealtime();
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}

/** Tiny brand component: logo image (if set) or gradient fallback. */
