import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Broadcasts the current user's online presence on a shared "online-users"
 * Supabase Realtime channel. Any admin subscribing to the same channel via
 * `useOnlineUsers` will see this user as online while the tab is open.
 */
export function usePresenceBroadcast(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("online-users", {
      config: { presence: { key: userId } },
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });
    const onVis = () => {
      if (document.visibilityState === "visible") {
        channel.track({ user_id: userId, online_at: new Date().toISOString() }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
