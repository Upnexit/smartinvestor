import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GradientButton } from "@/components/admin/AdminUI";
import { AgreementWelcomeDialog } from "@/components/admin/AgreementWelcomeDialog";
import { AdminVersionWelcomeModal } from "@/components/admin/AdminVersionWelcomeModal";
import { ShutdownCountdownScreen } from "@/components/admin/ShutdownCountdownScreen";
import { useShutdownPhase } from "@/hooks/use-shutdown-phase";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Smart Click BD — Admin Control Panel" }] }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AdminShell,
});

function AdminShell() {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const shutdownPhase = useShutdownPhase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error("unauthorized");
        const { data: roleRows, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .limit(1);
        if (roleError) throw roleError;
        const isDesignatedAdmin = userData.user.email?.toLowerCase() === "smartclickbd@gmail.com";
        if (!cancelled) setState((roleRows?.length ?? 0) > 0 || isDesignatedAdmin ? "ok" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (shutdownPhase === "warning") return <ShutdownCountdownScreen />;

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-app grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium">অ্যাডমিন যাচাই করা হচ্ছে…</p>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="min-h-screen bg-app grid place-items-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-pop ring-1 ring-rose-200 animate-admin-pop text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/40">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="bn-display mt-3 text-xl text-slate-900">অ্যাক্সেস নেই</h2>
          <p className="mt-1 text-sm text-slate-500">এই প্যানেল শুধুমাত্র অ্যাডমিনদের জন্য।</p>
          <div className="mt-4 flex gap-2">
            <Link to="/dashboard" className="flex-1 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
              ড্যাশবোর্ডে যান
            </Link>
            <GradientButton accent="rose" className="flex-1" onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}>
              <LogOut className="h-4 w-4" /> লগআউট
            </GradientButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <AgreementWelcomeDialog />
      <AdminVersionWelcomeModal />
      <Outlet />
    </AdminLayout>
  );
}
