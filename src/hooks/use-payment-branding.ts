import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "bkash" | "nagad" | "rocket";

export type PaymentBrandingConfig = {
  number?: string;
  agent_number?: string;
  type?: "personal" | "merchant" | string;
  instructions?: string;
  logo_url?: string;
  active?: boolean;
};

export type PaymentBranding = Record<PaymentMethod, PaymentBrandingConfig>;

const METHODS: PaymentMethod[] = ["bkash", "nagad", "rocket"];
const STORAGE_KEY = "si.payment-branding.v1";
const EMPTY: PaymentBranding = { bkash: {}, nagad: {}, rocket: {} };

let current: PaymentBranding = readCache();
const listeners = new Set<(state: PaymentBranding) => void>();
let initialized = false;
let channelStarted = false;

function cloneState(state: PaymentBranding): PaymentBranding {
  return {
    bkash: { ...state.bkash },
    nagad: { ...state.nagad },
    rocket: { ...state.rocket },
  };
}

function readCache(): PaymentBranding {
  if (typeof window === "undefined") return cloneState(EMPTY);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneState(EMPTY);
    return { ...cloneState(EMPTY), ...(JSON.parse(raw) as Partial<PaymentBranding>) };
  } catch {
    return cloneState(EMPTY);
  }
}

function writeCache(state: PaymentBranding) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage may be unavailable */
  }
}

function preloadLogos(state: PaymentBranding) {
  if (typeof window === "undefined") return;
  METHODS.forEach((method) => {
    const url = state[method].logo_url;
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}

async function resolveLogoUrl(value?: string): Promise<string | undefined> {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  const { data } = await supabase.storage.from("payment-logos").createSignedUrl(value, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? value;
}

async function normalizeConfig(value: unknown): Promise<PaymentBrandingConfig> {
  const config = (value ?? {}) as PaymentBrandingConfig;
  return { ...config, logo_url: await resolveLogoUrl(config.logo_url) };
}

function publish(next: PaymentBranding) {
  current = cloneState(next);
  writeCache(current);
  preloadLogos(current);
  listeners.forEach((listener) => listener(current));
}

async function mergeRows(rows: Array<{ key: string; value: unknown }>) {
  const next = cloneState(current);
  await Promise.all(rows.map(async (row) => {
    const method = row.key.replace("payment_", "") as PaymentMethod;
    if (!METHODS.includes(method)) return;
    next[method] = await normalizeConfig(row.value);
  }));
  publish(next);
}

async function loadOnce() {
  if (initialized) return;
  initialized = true;
  const { data } = await supabase
    .from("site_settings")
    .select("key,value")
    .in("key", METHODS.map((method) => `payment_${method}`));
  if (data) await mergeRows(data as Array<{ key: string; value: unknown }>);
}

function startRealtime() {
  if (channelStarted) return;
  channelStarted = true;
  const channel = supabase
    .channel("payment-branding-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, async (payload) => {
      const row = (payload.new ?? payload.old) as { key?: string; value?: unknown } | null;
      if (!row?.key?.startsWith("payment_")) return;
      await mergeRows([{ key: row.key, value: row.value }]);
    })
    .subscribe();

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => { void supabase.removeChannel(channel); });
  }
}

export function usePaymentBranding(): PaymentBranding {
  const [state, setState] = useState<PaymentBranding>(current);
  useEffect(() => {
    listeners.add(setState);
    preloadLogos(current);
    void loadOnce();
    startRealtime();
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}