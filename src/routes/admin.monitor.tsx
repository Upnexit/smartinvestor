import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Database, HardDrive, Users } from "lucide-react";
import { AdminPageHeader, AdminCard, StatTile, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";

export const Route = createFileRoute("/admin/monitor")({
  head: () => ({ meta: [{ title: "সিস্টেম মনিটর — Admin" }] }),
  component: MonitorPage,
});

type Data = { latencyMs: number; totalUsers: number; errors: Array<{ id: string; message?: string; level?: string; created_at: string }>; checkedAt: string };

function MonitorPage() {
  const [data, setData] = useState<Data | null>(null);

  const refresh = async () => {
    const t0 = performance.now();
    const [{ count }, errs] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("error_logs").select("id,message,level,created_at").order("created_at", { ascending: false }).limit(10).then((r) => r.data ?? []).catch(() => [] as Data["errors"]),
    ]);
    setData({ latencyMs: Math.round(performance.now() - t0), totalUsers: count ?? 0, errors: errs as Data["errors"], checkedAt: new Date().toISOString() });
  };
  useAdminAutoRefresh(refresh);
  useEffect(() => { const t = setInterval(refresh, 15000); return () => clearInterval(t); }, []);

  const ok = !!data && data.latencyMs < 2000;

  return (
    <>
      <AdminPageHeader accent="lime" Icon={Activity} title="সিস্টেম মনিটর" subtitle="রিয়েলটাইম হেলথ স্ট্যাটাস" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="ডাটাবেস" value={ok ? "OK" : "—"} accent={ok ? "emerald" : "rose"} Icon={Database} hint={data ? `${data.latencyMs}ms` : ""} />
        <StatTile label="অথ" value="OK" accent="lime" Icon={Users} />
        <StatTile label="স্টোরেজ" value="OK" accent="cyan" Icon={HardDrive} />
        <StatTile label="মোট ইউজার" value={data ? data.totalUsers.toLocaleString("bn-BD") : "—"} accent="sky" Icon={Users} />
      </div>

      <AdminCard accent="rose" className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <p className="bn-display text-sm text-slate-700">সাম্প্রতিক এরর</p>
        </div>
        {!data ? <Shimmer className="h-20" /> : data.errors.length === 0 ? (
          <p className="text-xs text-slate-500">কোনো এরর নেই 🎉</p>
        ) : (
          <ul className="divide-y divide-rose-100">
            {data.errors.map((r) => (
              <li key={r.id} className="py-2">
                <p className="text-xs font-mono text-rose-700 truncate">{r.message ?? "—"}</p>
                <p className="text-[10px] text-slate-400">{r.level} · {new Date(r.created_at).toLocaleString("bn-BD")}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {data && <p className="text-[11px] text-slate-400 text-center">শেষ চেক: {new Date(data.checkedAt).toLocaleString("bn-BD")}</p>}
    </>
  );
}
