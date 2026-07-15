import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes (read-only) to the shared "online-users" presence channel and
 * returns a Set of user ids that currently have at least one active session.
 */
export function useOnlineUsers(): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("online-users", {
      config: { presence: { key: `observer-${Math.random().toString(36).slice(2, 10)}` } },
    });

    const sync = () => {
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      for (const key of Object.keys(state)) {
        // The presence key is set to the user_id in the broadcaster hook.
        if (key && !key.startsWith("observer-")) ids.add(key);
        // Fallback: also read the tracked payload in case a client tracked without a key.
        for (const entry of state[key] ?? []) {
          if (entry?.user_id) ids.add(entry.user_id);
        }
      }
      setOnline(ids);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return online;
}
