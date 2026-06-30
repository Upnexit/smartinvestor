import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DistributorLayout } from "@/components/distributor/DistributorLayout";

export const Route = createFileRoute("/distributor")({
  ssr: false,
  head: () => ({ meta: [{ title: "Distributor Panel" }] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: DistShell,
});

function DistShell() {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("unauthorized");
        const { data: rows } = await supabase.from("user_roles").select("role")
          .eq("user_id", u.user.id).in("role", ["distributor", "admin"] as never);
        if (!cancelled) setState((rows?.length ?? 0) > 0 ? "ok" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">ডিস্ট্রিবিউটর যাচাই করা হচ্ছে…</p>
        </div>
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl ring-1 ring-rose-200 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="bn-display mt-3 text-xl text-slate-900">অ্যাক্সেস নেই</h2>
          <p className="mt-1 text-sm text-slate-500">এই প্যানেল শুধুমাত্র ডিস্ট্রিবিউটরদের জন্য।</p>
          <a href="/dashboard" className="mt-4 inline-block rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white">ড্যাশবোর্ড</a>
        </div>
      </div>
    );
  }
  return <DistributorLayout><Outlet /></DistributorLayout>;
}
