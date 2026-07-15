import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Database, HardDrive, Users, CheckCircle2, Trash2, Copy, Filter, RefreshCcw, Clock } from "lucide-react";
import { AdminPageHeader, AdminCard, StatTile, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/monitor")({
  head: () => ({ meta: [{ title: "সিস্টেম মনিটর — Admin" }] }),
  component: MonitorPage,
});

type ErrRow = {
  id: string;
  level: string | null;
  message: string | null;
  source: string | null;
  url: string | null;
  user_id: string | null;
  user_agent: string | null;
  context: unknown;
  fingerprint: string | null;
  count: number;
  created_at: string;
  last_seen_at: string;
  resolved: boolean;
};

type Data = {
  latencyMs: number;
  totalUsers: number;
  errors: ErrRow[];
  unresolvedCount: number;
  last24h: number;
  checkedAt: string;
};

function MonitorPage() {
  const [data, setData] = useState<Data | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const t0 = performance.now();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count }, errsRes, unresRes, d24Res] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("error_logs" as any) as any)
        .select("id,level,message,source,url,user_id,user_agent,context,fingerprint,count,created_at,last_seen_at,resolved")
        .order("last_seen_at", { ascending: false })
        .limit(200),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("error_logs" as any) as any).select("id", { count: "exact", head: true }).eq("resolved", false),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("error_logs" as any) as any).select("id", { count: "exact", head: true }).gte("last_seen_at", since24h),
    ]);
    setData({
      latencyMs: Math.round(performance.now() - t0),
      totalUsers: count ?? 0,
      errors: (errsRes.data ?? []) as ErrRow[],
      unresolvedCount: unresRes.count ?? 0,
      last24h: d24Res.count ?? 0,
      checkedAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const adminReady = useAdminAutoRefresh(refresh);
  useEffect(() => {
    if (!adminReady) return;
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminReady]);

  const ok = !!data && data.latencyMs < 2000;

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.errors.filter((r) => {
      if (!showResolved && r.resolved) return false;
      if (levelFilter !== "all" && (r.level ?? "error") !== levelFilter) return false;
      if (sourceFilter !== "all" && (r.source ?? "") !== sourceFilter) return false;
      return true;
    });
  }, [data, showResolved, levelFilter, sourceFilter]);

  const sources = useMemo(() => {
    if (!data) return [] as string[];
    return Array.from(new Set(data.errors.map((r) => r.source ?? "unknown"))).sort();
  }, [data]);

  const markResolved = async (id: string, resolved: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("error_logs" as any) as any).update({
      resolved, resolved_at: resolved ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(resolved ? "Resolved হয়েছে" : "Reopen হয়েছে");
    refresh();
  };

  const deleteRow = async (id: string) => {
    if (!confirm("এই এরর লগটি delete করবেন?")) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("error_logs" as any) as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    refresh();
  };

  const clearResolved = async () => {
    if (!confirm("সব resolved এরর delete করবেন?")) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("error_logs" as any) as any).delete().eq("resolved", true);
    if (error) { toast.error(error.message); return; }
    toast.success("সব resolved এরর delete হয়েছে");
    refresh();
  };

  const copyReport = (r: ErrRow) => {
    const txt = [
      `Level: ${r.level ?? "error"}`,
      `Source: ${r.source ?? "-"}`,
      `Count: ${r.count} (last seen ${new Date(r.last_seen_at).toLocaleString("bn-BD")})`,
      `URL: ${r.url ?? "-"}`,
      `User: ${r.user_id ?? "-"}`,
      `Message: ${r.message ?? "-"}`,
      `Context: ${JSON.stringify(r.context ?? {}, null, 2)}`,
      `UA: ${r.user_agent ?? "-"}`,
    ].join("\n");
    navigator.clipboard.writeText(txt).then(() => toast.success("Report copy হয়েছে"));
  };

  return (
    <>
      <AdminPageHeader accent="lime" Icon={Activity} title="সিস্টেম মনিটর" subtitle="রিয়েলটাইম হেলথ ও এরর ট্র্যাকিং"
        action={
          <button onClick={refresh} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-md disabled:opacity-50">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> রিফ্রেশ
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile label="ডাটাবেস" value={ok ? "OK" : "—"} accent={ok ? "emerald" : "rose"} Icon={Database} hint={data ? `${data.latencyMs}ms` : ""} />
        <StatTile label="অথ" value="OK" accent="lime" Icon={Users} />
        <StatTile label="স্টোরেজ" value="OK" accent="cyan" Icon={HardDrive} />
        <StatTile label="মোট ইউজার" value={data ? data.totalUsers.toLocaleString("bn-BD") : "—"} accent="sky" Icon={Users} />
        <StatTile label="অমীমাংসিত এরর" value={data ? data.unresolvedCount.toLocaleString("bn-BD") : "—"} accent={data && data.unresolvedCount > 0 ? "rose" : "emerald"} Icon={AlertTriangle} hint={data ? `২৪ঘণ্টা: ${data.last24h}` : ""} />
      </div>

      <AdminCard accent="rose" className="p-4 mt-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <p className="bn-display text-sm text-slate-800">এরর লগ ({filtered.length})</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <Filter className="h-3.5 w-3.5 text-slate-500 ml-1" />
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
                className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                <option value="all">সব লেভেল</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                <option value="all">সব সোর্স</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-3 w-3" />
              Resolved-ও দেখাও
            </label>
            <button onClick={clearResolved}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-rose-100 hover:text-rose-700">
              <Trash2 className="h-3 w-3" /> Resolved মুছো
            </button>
          </div>
        </div>

        {!data ? <Shimmer className="h-32" /> : filtered.length === 0 ? (
          <div className="grid place-items-center py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="bn-display mt-2 text-sm text-slate-700">কোনো এরর নেই 🎉</p>
            <p className="text-[11px] text-slate-500">সিস্টেম সুস্থ ও নিরাপদ চলছে</p>
          </div>
        ) : (
          <ul className="divide-y divide-rose-100 -mx-1">
            {filtered.map((r) => {
              const isOpen = expanded === r.id;
              const levelColor = r.level === "warning" ? "amber" : r.level === "info" ? "sky" : "rose";
              return (
                <li key={r.id} className={`px-2 py-2 rounded-lg ${r.resolved ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-flex items-center rounded-full bg-${levelColor}-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-${levelColor}-700 ring-1 ring-${levelColor}-200`}>
                      {r.level ?? "error"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="w-full text-left">
                        <p className="text-xs font-mono text-rose-800 break-words line-clamp-2">{r.message}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                          <span className="font-bold text-slate-600">{r.source}</span>
                          <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {new Date(r.last_seen_at).toLocaleString("bn-BD")}</span>
                          {r.count > 1 && <span className="rounded-full bg-rose-100 px-1.5 py-0 font-bold text-rose-700">×{r.count}</span>}
                          {r.url && <span className="truncate max-w-[240px]">{r.url.replace(/^https?:\/\/[^/]+/, "")}</span>}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                          {r.url && <div className="text-[10px]"><b>URL:</b> <span className="break-all">{r.url}</span></div>}
                          {r.user_id && <div className="text-[10px]"><b>User:</b> <code>{r.user_id}</code></div>}
                          {r.user_agent && <div className="text-[10px]"><b>UA:</b> <span className="break-all">{r.user_agent}</span></div>}
                          {r.context ? (
                            <pre className="mt-1 max-h-56 overflow-auto rounded bg-white p-2 text-[10px] text-slate-700 ring-1 ring-slate-200">
{JSON.stringify(r.context, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => copyReport(r)} title="Report copy"
                        className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => markResolved(r.id, !r.resolved)}
                        title={r.resolved ? "Reopen" : "Resolved mark"}
                        className={`grid h-7 w-7 place-items-center rounded-md ${r.resolved ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteRow(r.id)} title="Delete"
                        className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      {data && <p className="mt-3 text-[11px] text-slate-400 text-center">শেষ চেক: {new Date(data.checkedAt).toLocaleString("bn-BD")} · প্রতি ২০ সেকেন্ডে auto-refresh</p>}
    </>
  );
}
