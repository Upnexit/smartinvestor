import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users, ShieldCheck, Wallet, UserPlus, Package as PackageIcon, BarChart3,
  Settings, ArrowDownToLine, ListChecks, Sparkles, TrendingUp, LineChart as LineIcon, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminPageHeader, AdminCard, AdminSectionTitle, Shimmer,
} from "@/components/admin/AdminUI";
import { useAdminAutoRefresh, emitAdminRefresh } from "@/lib/admin-refresh";
import { ACCENTS, type AccentKey } from "@/lib/admin-accents";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Smart Investor Admin" }] }),
  component: DashboardPage,
});

type Stats = {
  totalUsers: number; activeUsers: number; revenue: number; pending: number;
  signupSeries: { date: string; count: number }[];
  revenueSeries: { date: string; amount: number }[];
  topupSeries: { date: string; count: number }[];
};

const fmtBDT = (n: number) => "৳" + Math.round(n).toLocaleString("bn-BD");
const fmtBN = (n: number) => n.toLocaleString("bn-BD");

async function loadStats(): Promise<Stats> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [totalU, activeU, revRows, pendRows, signupRows] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("user_packages").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("user_packages").select("created_at, status, packages(price)").gte("created_at", since),
    supabase.from("user_packages").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("created_at").gte("created_at", since),
  ]);

  const day = (d: string) => d.slice(0, 10);
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10));

  const signupMap = new Map<string, number>();
  (signupRows.data ?? []).forEach((r) => signupMap.set(day(r.created_at!), (signupMap.get(day(r.created_at!)) ?? 0) + 1));

  const revMap = new Map<string, number>();
  const topupMap = new Map<string, number>();
  let revenue = 0;
  (revRows.data ?? []).forEach((r) => {
    const k = day(r.created_at!);
    topupMap.set(k, (topupMap.get(k) ?? 0) + 1);
    if (r.status === "active") {
      const price = Number((r as { packages?: { price?: number } | null }).packages?.price ?? 0);
      revenue += price;
      revMap.set(k, (revMap.get(k) ?? 0) + price);
    }
  });

  return {
    totalUsers: totalU.count ?? 0,
    activeUsers: activeU.count ?? 0,
    revenue,
    pending: pendRows.count ?? 0,
    signupSeries: days.map((d) => ({ date: d.slice(5), count: signupMap.get(d) ?? 0 })),
    revenueSeries: days.map((d) => ({ date: d.slice(5), amount: revMap.get(d) ?? 0 })),
    topupSeries: days.map((d) => ({ date: d.slice(5), count: topupMap.get(d) ?? 0 })),
  };
}

/* ---------- Vibrant fully-gradient stat tile ---------- */
function VibrantStat({
  label, value, hint, accent, Icon, trend,
}: {
  label: string; value: string; hint?: string; accent: AccentKey;
  Icon: React.ComponentType<{ className?: string }>; trend?: string;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl p-4 text-white shadow-xl animate-admin-pop transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]",
      "bg-gradient-to-br", a.gradient, a.glow,
    )}>
      {/* deco blobs */}
      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
      <span className="pointer-events-none absolute -left-4 -bottom-8 h-20 w-20 rounded-full bg-black/20 blur-2xl" />
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">{label}</p>
          <p className="mt-1 bn-display text-2xl sm:text-3xl drop-shadow-sm">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-white/80">{hint}</p>}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/25 backdrop-blur-md ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur-md ring-1 ring-white/30">
          <TrendingUp className="h-3 w-3" /> {trend}
        </div>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: "/admin/packages",    label: "নতুন প্যাকেজ", accent: "fuchsia" as AccentKey, Icon: PackageIcon },
  { to: "/admin/approvals",   label: "অ্যাপ্রুভাল",   accent: "orange"  as AccentKey, Icon: ShieldCheck },
  { to: "/admin/withdrawals", label: "উইথড্র",       accent: "emerald" as AccentKey, Icon: ArrowDownToLine },
  { to: "/admin/tasks",       label: "টাস্ক",         accent: "rose"    as AccentKey, Icon: ListChecks },
  { to: "/admin/reports",     label: "রিপোর্ট",       accent: "indigo"  as AccentKey, Icon: BarChart3 },
  { to: "/admin/settings",    label: "সেটিংস",       accent: "teal"    as AccentKey, Icon: Settings },
];

type Tab = "signups" | "revenue" | "topups";
const TABS: { key: Tab; label: string; accent: AccentKey; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "signups", label: "দৈনিক সাইনআপ",  accent: "sky",     Icon: Users },
  { key: "revenue", label: "রেভিনিউ ট্রেন্ড", accent: "amber",   Icon: Wallet },
  { key: "topups",  label: "দৈনিক টপআপ",     accent: "fuchsia", Icon: LineIcon },
];

function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; label: string; time: string; accent: AccentKey }>>([]);
  const [tab, setTab] = useState<Tab>("signups");

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
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);
  const A = ACCENTS[activeTab.accent];

  return (
    <>
      <AdminPageHeader
        accent="amber" Icon={Sparkles}
        title="স্বাগতম, অ্যাডমিন 👋"
        subtitle={"আজ " + new Date().toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long" })}
        badge={<span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md shadow-emerald-500/30">LIVE</span>}
      />

      {/* Fully-gradient stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <VibrantStat accent="sky"     label="মোট ইউজার"          value={stats ? fmtBN(stats.totalUsers) : "—"} Icon={Users}       trend="30 দিনে" />
        <VibrantStat accent="emerald" label="অ্যাক্টিভ ইউজার"      value={stats ? fmtBN(stats.activeUsers) : "—"} Icon={ShieldCheck} trend="চলমান" />
        <VibrantStat accent="amber"   label="মোট রেভিনিউ (৩০d)"  value={stats ? fmtBDT(stats.revenue) : "—"}    Icon={Wallet}      trend="এই মাস" />
        <VibrantStat accent="rose"    label="পেন্ডিং অ্যাপ্রুভাল"  value={stats ? fmtBN(stats.pending) : "—"}    Icon={UserPlus}    trend="অপেক্ষমান" />
      </div>

      {/* Unified analytics: tabs (signups / revenue / topups) + quick actions */}
      <AdminCard accent={activeTab.accent} className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="bn-display text-lg text-slate-900">অ্যানালিটিক্স — ৩০ দিন</h2>
            <p className="text-xs text-slate-500 mt-0.5">লেয়ার বাই লেয়ার ভিউ — ট্যাবে ক্লিক করুন</p>
          </div>
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md bg-gradient-to-r text-white", A.chip)}>Live</span>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => {
            const active = t.key === tab;
            const ac = ACCENTS[t.accent];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "group inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-300",
                  active
                    ? cn("bg-gradient-to-br text-white shadow-lg scale-[1.03]", ac.chip, ac.glow)
                    : cn("ring-1 ring-slate-200 hover:-translate-y-0.5 bg-white", ac.text, ac.soft),
                )}
              >
                <t.Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Chart */}
        {!stats ? <Shimmer className="h-56" /> : (
          <ResponsiveContainer width="100%" height={240}>
            {tab === "signups" ? (
              <AreaChart data={stats.signupSeries}>
                <defs>
                  <linearGradient id="g-signups" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%"  stopColor="#0284c7" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0284c7" strokeWidth={2.5} fill="url(#g-signups)" />
              </AreaChart>
            ) : tab === "revenue" ? (
              <BarChart data={stats.revenueSeries}>
                <defs>
                  <linearGradient id="g-rev" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%"  stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v) => fmtBDT(Number(v))} />
                <Bar dataKey="amount" fill="url(#g-rev)" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={stats.topupSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#c026d3" strokeWidth={2.5} dot={{ r: 3, fill: "#c026d3" }} activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}

        {/* Quick actions inside the analytics card */}
        <div className="mt-5 pt-4 border-t border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-600" />
            <h3 className="bn-display text-sm text-slate-900">দ্রুত অ্যাকশন</h3>
            <span className="text-[10px] text-slate-500">এক ক্লিকে কাজ</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK_ACTIONS.map((q) => {
              const ac = ACCENTS[q.accent];
              return (
                <Link key={q.to} to={q.to} className={cn(
                  "group relative overflow-hidden flex flex-col items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br p-3 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.04]",
                  ac.chip, ac.glow,
                )}>
                  <span className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/20 blur-xl" />
                  <q.Icon className="h-5 w-5 transition-transform group-hover:rotate-12" />
                  <span className="text-[11px] font-bold text-center leading-tight">{q.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </AdminCard>

      {/* Live activity */}
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

async function loadActivity() {
  const [pkgs, wds] = await Promise.all([
    supabase.from("user_packages").select("id, status, created_at, packages(name)").order("created_at", { ascending: false }).limit(8),
    supabase.from("withdrawals").select("id, amount, status, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  type R = { id: string; label: string; time: string; accent: AccentKey };
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
