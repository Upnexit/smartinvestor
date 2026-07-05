import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true only after the Supabase session has been restored from storage
 * (or confirmed absent). Use it to gate admin queries/mutations and avoid the
 * "No authorization header" / "Missing Supabase env" race on cold load.
 */
export function useAuthReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().finally(() => {
      if (cancelled) return;
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setReady(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return ready;
}
