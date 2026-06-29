import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, ShieldCheck, Wallet, UserPlus, Package as PackageIcon, BarChart3,
  Settings, ArrowDownToLine, ListChecks, Sparkles, Activity,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminPageHeader, AdminCard, StatTile, AdminSectionTitle, Shimmer, GradientButton,
} from "@/components/admin/AdminUI";
import { useAdminAutoRefresh, emitAdminRefresh } from "@/lib/admin-refresh";
import { ACCENTS } from "@/lib/admin-accents";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Smart Investor Admin" }] }),
  component: DashboardPage,
});

type Stats = {
  totalUsers: number; activeUsers: number; revenue: number; pending: number;
  signupSeries: { date: string; count: number }[];
  revenueSeries: { date: string; amount: number }[];
};

function fmtBDT(n: number) {
  return "৳" + Math.round(n).toLocaleString("bn-BD");
}

async function loadStats(): Promise<Stats> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [totalU, activeU, revRows, pendRows, signupRows] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("user_packages").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("user_packages").select("created_at, packages(price)").eq("status", "active").gte("created_at", since),
    supabase.from("user_packages").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("created_at").gte("created_at", since),
  ]);

  // bucket by day
  const day = (d: string) => d.slice(0, 10);
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10));

  const signupMap = new Map<string, number>();
  (signupRows.data ?? []).forEach((r) => signupMap.set(day(r.created_at!), (signupMap.get(day(r.created_at!)) ?? 0) + 1));

  const revMap = new Map<string, number>();
  let revenue = 0;
  (revRows.data ?? []).forEach((r) => {
    const price = Number((r as { packages?: { price?: number } | null }).packages?.price ?? 0);
    revenue += price;
    revMap.set(day(r.created_at!), (revMap.get(day(r.created_at!)) ?? 0) + price);
  });

  return {
    totalUsers: totalU.count ?? 0,
    activeUsers: activeU.count ?? 0,
    revenue,
    pending: pendRows.count ?? 0,
    signupSeries: days.map((d) => ({ date: d.slice(5), count: signupMap.get(d) ?? 0 })),
    revenueSeries: days.map((d) => ({ date: d.slice(5), amount: revMap.get(d) ?? 0 })),
  };
}

function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; label: string; time: string; accent: keyof typeof ACCENTS }>>([]);

  const refresh = () => {
    loadStats().then(setStats).catch(() => {});
    loadActivity().then(setActivity).catch(() => {});
  };
  useAdminAutoRefresh(refresh);

  useEffect(() => {
    const ch = supabase.channel("admin-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_packages" }, () => { refresh(); emitAdminRefresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AdminPageHeader
        accent="amber" Icon={Sparkles}
        title="স্বাগতম, অ্যাডমিন 👋"
        subtitle={"আজ " + new Date().toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long" })}
        badge={<span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md shadow-emerald-500/30">LIVE</span>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile accent="sky"     label="মোট ইউজার"     value={stats?.totalUsers.toLocaleString("bn-BD") ?? "—"} Icon={Users} />
        <StatTile accent="emerald" label="অ্যাক্টিভ ইউজার" value={stats?.activeUsers.toLocaleString("bn-BD") ?? "—"} Icon={ShieldCheck} />
        <StatTile accent="amber"   label="মোট রেভিনিউ (৩০d)" value={stats ? fmtBDT(stats.revenue) : "—"} Icon={Wallet} />
        <StatTile accent="rose"    label="পেন্ডিং অ্যাপ্রুভাল" value={stats?.pending.toLocaleString("bn-BD") ?? "—"} Icon={UserPlus} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminCard accent="sky" className="p-4">
          <AdminSectionTitle title="দৈনিক সাইনআপ (৩০ দিন)" accent="sky" />
          {!stats ? <Shimmer className="h-56" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.signupSeries}>
                <defs>
                  <linearGradient id="g-signups" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%"  stopColor="#0284c7" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0284c7" strokeWidth={2} fill="url(#g-signups)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </AdminCard>
        <AdminCard accent="amber" className="p-4">
          <AdminSectionTitle title="রেভিনিউ ট্রেন্ড (৩০ দিন)" accent="amber" />
          {!stats ? <Shimmer className="h-56" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.revenueSeries}>
                <defs>
                  <linearGradient id="g-rev" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%"  stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v) => fmtBDT(Number(v))} />
                <Bar dataKey="amount" fill="url(#g-rev)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminCard>
      </div>

      <AdminCard accent="indigo" className="p-4">
        <AdminSectionTitle title="দ্রুত অ্যাকশন" hint="এক ক্লিকে কাজ" accent="indigo" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_ACTIONS.map((q) => (
            <Link key={q.to} to={q.to} className={cn(
              "group flex items-center gap-2 rounded-xl bg-gradient-to-br p-3 text-white shadow-lg transition hover:scale-[1.02]",
              ACCENTS[q.accent].chip, ACCENTS[q.accent].glow,
            )}>
              <q.Icon className="h-5 w-5 transition-transform group-hover:rotate-12" />
              <span className="text-sm font-bold">{q.label}</span>
            </Link>
          ))}
        </div>
      </AdminCard>

      <AdminCard accent="lime" className="p-4">
        <AdminSectionTitle title="লাইভ অ্যাক্টিভিটি" hint="সাম্প্রতিক ইভেন্ট" accent="lime" />
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500 py-3 text-center">এখনও কোনো অ্যাক্টিভিটি নেই</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1 ring-amber-100", ACCENTS[a.accent].soft)}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2 w-2 rounded-full bg-gradient-to-br", ACCENTS[a.accent].chip)} />
                  <p className="text-sm text-slate-800 truncate">{a.label}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">{a.time}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </>
  );
}

const QUICK_ACTIONS = [
  { to: "/admin/packages", label: "নতুন প্যাকেজ", accent: "fuchsia", Icon: PackageIcon },
  { to: "/admin/approvals", label: "অ্যাপ্রুভাল", accent: "orange", Icon: ShieldCheck },
  { to: "/admin/withdrawals", label: "উইথড্র", accent: "emerald", Icon: ArrowDownToLine },
  { to: "/admin/tasks", label: "টাস্ক", accent: "rose", Icon: ListChecks },
  { to: "/admin/reports", label: "রিপোর্ট", accent: "indigo", Icon: BarChart3 },
  { to: "/admin/settings", label: "সেটিংস", accent: "teal", Icon: Settings },
] as const;

async function loadActivity() {
  const [pkgs, wds] = await Promise.all([
    supabase.from("user_packages").select("id, status, created_at, packages(name)").order("created_at", { ascending: false }).limit(8),
    supabase.from("withdrawals").select("id, amount, status, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  type R = { id: string; label: string; time: string; accent: keyof typeof ACCENTS };
  const items: R[] = [];
  (pkgs.data ?? []).forEach((p) => {
    items.push({
      id: "p-" + p.id,
      label: `প্যাকেজ ${(p as { packages?: { name?: string } | null }).packages?.name ?? ""} — ${p.status}`,
      time: new Date(p.created_at!).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }),
      accent: p.status === "active" ? "emerald" : p.status === "pending" ? "amber" : "rose",
    });
  });
  (wds.data ?? []).forEach((w) => {
    items.push({
      id: "w-" + w.id,
      label: `উইথড্র ৳${w.amount} — ${w.status}`,
      time: new Date(w.created_at!).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }),
      accent: w.status === "approved" ? "emerald" : w.status === "pending" ? "amber" : "rose",
    });
  });
  return items.slice(0, 10);
}

// Keep GradientButton import used so dead-code shaker doesn't complain in dev
void GradientButton;
void Activity;
