import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global rollout switch. Everything staged for the big re-launch
 * (new packages, user Shop, etc.) stays hidden until this flips to true.
 * Stored in site_settings → key = 'package_launch' → { launched: boolean }
 */
let cached: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();
let loading = false;

async function loadOnce() {
  if (loading || cached !== null) return;
  loading = true;
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "package_launch")
    .maybeSingle();
  const v = (data?.value ?? {}) as { launched?: boolean };
  cached = v.launched === true;
  listeners.forEach((l) => l(cached as boolean));
}

export function useLaunchFlag(): { launched: boolean; ready: boolean } {
  const [launched, setLaunched] = useState<boolean | null>(cached);

  useEffect(() => {
    const l = (v: boolean) => setLaunched(v);
    listeners.add(l);
    if (cached !== null) setLaunched(cached);
    else loadOnce();
    return () => { listeners.delete(l); };
  }, []);

  return { launched: launched === true, ready: launched !== null };
}
