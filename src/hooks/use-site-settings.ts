import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
};

export const BRAND_NAME = "Smart Click BD";
export const BRAND_TAGLINE = "স্মার্ট ক্লিক বিডি";
export const BRAND_LOGO_URL = "/logo.png";
export const BRAND_FAVICON_URL = "/app-icon-192.png";

const DEFAULTS: SiteSettings = {
  site_name: BRAND_NAME,
  tagline: BRAND_TAGLINE,
  logo_url: BRAND_LOGO_URL,
  favicon_url: BRAND_FAVICON_URL,
};

const STORAGE_KEY = "scbd.site-settings.v3";

function readCache(): SiteSettings {
  return DEFAULTS;
}

function writeCache(_v: SiteSettings) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS)); } catch { /* noop */ }
}

// Module-level singleton state to keep every mounted component in sync
let current: SiteSettings = DEFAULTS;
const listeners = new Set<(s: SiteSettings) => void>();
let initialized = false;
let channelStarted = false;

function setAll(next: Partial<SiteSettings>) {
  current = {
    ...current,
    ...next,
    site_name: BRAND_NAME,
    tagline: BRAND_TAGLINE,
    logo_url: BRAND_LOGO_URL,
    favicon_url: BRAND_FAVICON_URL,
  };
  writeCache(current);
  listeners.forEach((l) => l(current));
  if (typeof document !== "undefined") {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = BRAND_FAVICON_URL;
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
