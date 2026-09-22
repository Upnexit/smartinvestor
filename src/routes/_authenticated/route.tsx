import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { UserPanelLayout } from "@/components/panel/UserPanelLayout";
import { SuspendedScreen } from "@/components/panel/SuspendedScreen";
import { usePresenceBroadcast } from "@/hooks/use-presence-broadcast";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Fast memory/storage session check avoids redundant network roundtrips on internal navigation
    const { data: sessData } = await supabase.auth.getSession();
    if (sessData.session?.user) {
      return { user: sessData.session.user };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const routeContext = Route.useRouteContext();
  const initialUserId = routeContext?.user?.id ?? null;
  const cachedStatus = initialUserId && typeof window !== "undefined"
    ? sessionStorage.getItem(`smartclick:status:${initialUserId}`)
    : null;

  const [status, setStatus] = useState<"loading" | "active" | "suspended">(
    cachedStatus === "suspended" ? "suspended" : (initialUserId ? "active" : "loading")
  );
  const [reason, setReason] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(initialUserId);
  usePresenceBroadcast(userId);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const uid = initialUserId || (await supabase.auth.getSession()).data.session?.user?.id;
      if (!uid) return;
      if (cancelled) return;
      setUserId(uid);
      const { data } = await supabase.from("profiles").select("status, suspend_reason").eq("id", uid).maybeSingle();
      const s = (data as { status?: string; suspend_reason?: string | null } | null)?.status;
      if (cancelled) return;
      if (s === "suspended" || s === "banned") {
        sessionStorage.setItem(`smartclick:status:${uid}`, "suspended");
        setStatus("suspended");
        setReason((data as { suspend_reason?: string | null } | null)?.suspend_reason ?? null);
      } else {
        sessionStorage.setItem(`smartclick:status:${uid}`, "active");
        setStatus("active");
      }
    };
    check();

    // Realtime: react to status changes
    const ch = supabase.channel("profile-status-watch")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as { id: string; status?: string; suspend_reason?: string | null };
        if (row.id === userId) {
          if (row.status === "suspended" || row.status === "banned") {
            if (userId) sessionStorage.setItem(`smartclick:status:${userId}`, "suspended");
            setStatus("suspended");
            setReason(row.suspend_reason ?? null);
          } else {
            if (userId) sessionStorage.setItem(`smartclick:status:${userId}`, "active");
            setStatus("active");
          }
        }
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [initialUserId, userId]);

  if (status === "loading") {
    return <div className="min-h-screen grid place-items-center bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50">
      <div className="h-10 w-10 rounded-full border-4 border-amber-300 border-t-amber-600 animate-spin" />
    </div>;
  }
  if (status === "suspended" && userId) {
    return <SuspendedScreen userId={userId} reason={reason} />;
  }
  return (
    <UserPanelLayout>
      <Outlet />
    </UserPanelLayout>
  );
}
