import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Download, Trophy } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, Shimmer } from "@/components/admin/AdminUI";
import { adminReports, adminTopUsers } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "রিপোর্ট — Admin" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const reports = useServerFn(adminReports);
  const top = useServerFn(adminTopUsers);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminReports>> | null>(null);
  const [leaders, setLeaders] = useState<Awaited<ReturnType<typeof adminTopUsers>> | null>(null);

  useEffect(() => { void reports({ data: { days } }).then(setData); }, [days, reports]);
  useEffect(() => { void top().then(setLeaders); }, [top]);

  const series = useMemo(() => {
    if (!data) return null;
    const days0: Record<string, { d: string; signups: number; revenue: number; withdraw: number; tasks: number }> = {};
    const fmt = (s: string) => new Date(s).toISOString().slice(5, 10);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      days0[fmt(d.toISOString())] = { d: fmt(d.toISOString()), signups: 0, revenue: 0, withdraw: 0, tasks: 0 };
    }
    data.signups.forEach((s: { created_at: string }) => { const k = fmt(s.created_at); if (days0[k]) days0[k].signups++; });
    data.revenue.forEach((s: { created_at: string; packages?: { price?: number } | null }) => { const k = fmt(s.created_at); const p = Number(s.packages?.price ?? 0); if (days0[k]) days0[k].revenue += p; });
    data.withdrawals.forEach((s: { created_at: string; status?: string | null; amount?: number | string | null }) => { const k = fmt(s.created_at); if (days0[k] && s.status !== "rejected") days0[k].withdraw += Number(s.amount ?? 0); });
    data.taskCompletions.forEach((s: { created_at: string }) => { const k = fmt(s.created_at); if (days0[k]) days0[k].tasks++; });
    return Object.values(days0);
  }, [data, days]);

  const exportCsv = () => {
    if (!series) return;
    const head = "date,signups,revenue,withdraw,tasks\n";
    const body = series.map((r) => `${r.d},${r.signups},${r.revenue},${r.withdraw},${r.tasks}`).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `report_${days}d.csv`; a.click();
  };

  return (
    <>
      <AdminPageHeader accent="indigo" Icon={BarChart3} title="রিপোর্ট ও অ্যানালিটিক্স"
        subtitle={`গত ${days} দিনের পরিসংখ্যান`}
        action={<GradientButton accent="indigo" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</GradientButton>} />

      <div className="flex gap-1.5">
        {[7, 30, 90, 365].map((n) => (
          <button key={n} onClick={() => setDays(n)} className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
            days === n ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md" : "bg-white text-slate-600 ring-1 ring-slate-200",
          )}>{n} দিন</button>
        ))}
      </div>

      {!series ? <Shimmer className="h-64" /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          <AdminCard accent="indigo" className="p-4">
            <p className="bn-display text-sm text-slate-700 mb-2">রেভিনিউ ট্রেন্ড</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </AdminCard>

          <AdminCard accent="sky" className="p-4">
            <p className="bn-display text-sm text-slate-700 mb-2">সাইনআপ</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series}>
                <defs>
                  <linearGradient id="su" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={1} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="signups" fill="url(#su)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </AdminCard>

          <AdminCard accent="emerald" className="p-4">
            <p className="bn-display text-sm text-slate-700 mb-2">উইথড্র</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="wd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="withdraw" stroke="#10b981" fill="url(#wd)" />
              </AreaChart>
            </ResponsiveContainer>
          </AdminCard>

          <AdminCard accent="rose" className="p-4">
            <p className="bn-display text-sm text-slate-700 mb-2">টাস্ক কমপ্লিশন</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series}>
                <defs>
                  <linearGradient id="tk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="tasks" fill="url(#tk)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </AdminCard>
        </div>
      )}

      <AdminCard accent="amber" className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          <p className="bn-display text-sm text-slate-700">টপ আর্নার</p>
        </div>
        {!leaders ? <Shimmer className="h-20" /> : (
          <div className="divide-y divide-amber-100">
            {leaders.map((u: { id: string; full_name?: string | null; total_earned?: number | string | null }, i: number) => (
              <div key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span className="bn-display"><span className="text-amber-600 mr-2">#{i + 1}</span> {u.full_name ?? "—"}</span>
                <span className="bn-display bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent">৳{Number(u.total_earned ?? 0).toLocaleString("bn-BD")}</span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <SoftButton onClick={exportCsv}><Download className="h-3.5 w-3.5" /> CSV ডাউনলোড</SoftButton>
    </>
  );
}
