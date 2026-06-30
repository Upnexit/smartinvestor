import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Download, Trophy, TrendingUp, TrendingDown, Users, Wallet, CreditCard,
  PiggyBank, Activity, AlertTriangle, ShieldCheck, Target, Crown, ArrowUpRight,
  ArrowDownRight, Sparkles, FileText, Calendar, Printer,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  ComposedChart, Line, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from "recharts";
import {
  AdminPageHeader, AdminCard, GradientButton, SoftButton, Shimmer, StatTile, EmptyState,
} from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "রিপোর্ট ও অ্যানালিটিক্স — Admin" }] }),
  component: ReportsPage,
});

/* ============== TYPES ============== */
type DayBucket = { d: string; signups: number; revenue: number; withdraw: number; tasks: number; netflow: number };
type Leader = { id: string; full_name: string | null; total_earned: number | string | null; balance?: number | string | null };
type Referrer = { id: string; full_name: string | null; referrals: number; earned: number };

type Snapshot = {
  // counts
  totalUsers: number;
  newUsers: number;
  activeInvestors: number;
  suspendedUsers: number;
  unverifiedUsers: number;
  // money
  totalRevenue: number;
  totalWithdraw: number;
  pendingWithdraw: number;
  pendingDeposit: number;
  rejectedWithdraw: number;
  liabilityBalance: number;   // sum profiles.balance
  lockedBalance: number;
  totalEarnedLifetime: number;
  refCommission: number;
  // tasks
  tasksApproved: number;
  tasksPending: number;
  // package distribution
  pkgDistribution: { name: string; value: number; revenue: number }[];
  // method breakdown
  payMethods: { name: string; deposits: number; withdrawals: number }[];
};

const BN = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("bn-BD");
const NUM = (n: number) => Number(n || 0).toLocaleString("bn-BD");
const fmtKey = (s: string) => new Date(s).toISOString().slice(5, 10);

/* ============== PAGE ============== */
function ReportsPage() {
  const settings = useSiteSettings();
  const [days, setDays] = useState(30);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [series, setSeries] = useState<DayBucket[] | null>(null);
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [referrers, setReferrers] = useState<Referrer[] | null>(null);

  /* ---------- Load all data ---------- */
  useEffect(() => {
    void (async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      setSnap(null); setSeries(null);

      const [
        allProfiles, newProfiles, allUserPkgs, allWith, allTasks, allRef, allPkgs,
      ] = await Promise.all([
        supabase.from("profiles").select("id,balance,locked_balance,total_earned,status,email_verified"),
        supabase.from("profiles").select("created_at,referred_by").gte("created_at", since),
        supabase.from("user_packages").select("created_at,status,payment_method,package_id,packages(name,price)"),
        supabase.from("withdrawals").select("created_at,status,amount,method"),
        supabase.from("task_submissions").select("created_at,status,reward_credited"),
        supabase.from("referral_earnings").select("amount,created_at"),
        supabase.from("packages").select("id,name,price"),
      ]);

      const profiles = allProfiles.data ?? [];
      const userPkgs = allUserPkgs.data ?? [];
      const withs = allWith.data ?? [];
      const tasks = allTasks.data ?? [];
      const refs = allRef.data ?? [];
      const pkgs = allPkgs.data ?? [];

      // ---------- KPIs ----------
      const totalRevenue = userPkgs
        .filter((u) => u.status === "active" && new Date(u.created_at).toISOString() >= since)
        .reduce((s, u) => s + Number((u as { packages?: { price?: number } | null }).packages?.price ?? 0), 0);
      const totalWithdraw = withs
        .filter((w) => w.status === "approved" && new Date(w.created_at).toISOString() >= since)
        .reduce((s, w) => s + Number(w.amount ?? 0), 0);
      const pendingWithdraw = withs.filter((w) => w.status === "pending").reduce((s, w) => s + Number(w.amount ?? 0), 0);
      const pendingDeposit = userPkgs.filter((u) => u.status === "pending").length;
      const rejectedWithdraw = withs.filter((w) => w.status === "rejected").length;
      const refCommission = refs
        .filter((r) => new Date(r.created_at).toISOString() >= since)
        .reduce((s, r) => s + Number(r.amount ?? 0), 0);

      // ---------- Package distribution ----------
      const distMap: Record<string, { name: string; value: number; revenue: number }> = {};
      userPkgs.filter((u) => u.status === "active").forEach((u) => {
        const p = (u as { packages?: { name?: string; price?: number } | null }).packages;
        const name = p?.name ?? "—";
        if (!distMap[name]) distMap[name] = { name, value: 0, revenue: 0 };
        distMap[name].value += 1;
        distMap[name].revenue += Number(p?.price ?? 0);
      });
      const pkgDistribution = Object.values(distMap).sort((a, b) => b.value - a.value).slice(0, 6);

      // ---------- Payment methods ----------
      const methodMap: Record<string, { name: string; deposits: number; withdrawals: number }> = {};
      const ensure = (n: string) => (methodMap[n] ??= { name: n, deposits: 0, withdrawals: 0 });
      userPkgs.filter((u) => u.status === "active").forEach((u) => { ensure(String(u.payment_method ?? "—")).deposits += 1; });
      withs.filter((w) => w.status === "approved").forEach((w) => { ensure(String(w.method ?? "—")).withdrawals += 1; });
      const payMethods = Object.values(methodMap);

      const snapshot: Snapshot = {
        totalUsers: profiles.length,
        newUsers: newProfiles.data?.length ?? 0,
        activeInvestors: new Set(userPkgs.filter((u) => u.status === "active").map((u) => (u as { user_id?: string }).user_id)).size,
        suspendedUsers: profiles.filter((p) => p.status === "suspended").length,
        unverifiedUsers: profiles.filter((p) => !p.email_verified).length,
        totalRevenue,
        totalWithdraw,
        pendingWithdraw,
        pendingDeposit,
        rejectedWithdraw,
        liabilityBalance: profiles.reduce((s, p) => s + Number(p.balance ?? 0), 0),
        lockedBalance: profiles.reduce((s, p) => s + Number(p.locked_balance ?? 0), 0),
        totalEarnedLifetime: profiles.reduce((s, p) => s + Number(p.total_earned ?? 0), 0),
        refCommission,
        tasksApproved: tasks.filter((t) => t.status === "approved").length,
        tasksPending: tasks.filter((t) => t.status === "pending").length,
        pkgDistribution,
        payMethods,
      };
      setSnap(snapshot);

      // ---------- Time series ----------
      const buckets: Record<string, DayBucket> = {};
      for (let i = days - 1; i >= 0; i--) {
        const k = fmtKey(new Date(Date.now() - i * 86400_000).toISOString());
        buckets[k] = { d: k, signups: 0, revenue: 0, withdraw: 0, tasks: 0, netflow: 0 };
      }
      (newProfiles.data ?? []).forEach((s) => { const k = fmtKey(s.created_at); if (buckets[k]) buckets[k].signups++; });
      userPkgs.filter((u) => u.status === "active").forEach((u) => {
        const k = fmtKey(u.created_at);
        if (buckets[k]) buckets[k].revenue += Number((u as { packages?: { price?: number } | null }).packages?.price ?? 0);
      });
      withs.filter((w) => w.status !== "rejected").forEach((w) => {
        const k = fmtKey(w.created_at);
        if (buckets[k]) buckets[k].withdraw += Number(w.amount ?? 0);
      });
      tasks.filter((t) => t.status === "approved").forEach((t) => { const k = fmtKey(t.created_at); if (buckets[k]) buckets[k].tasks++; });
      Object.values(buckets).forEach((b) => { b.netflow = b.revenue - b.withdraw; });
      setSeries(Object.values(buckets));

      // unused helper variables silenced
      void pkgs;
    })();
  }, [days]);

  /* ---------- Leaderboards ---------- */
  useEffect(() => {
    void supabase.from("profiles").select("id,full_name,total_earned,balance")
      .order("total_earned", { ascending: false }).limit(10)
      .then(({ data }) => setLeaders((data ?? []) as Leader[]));

    void (async () => {
      const { data: refs } = await supabase.from("referral_earnings").select("referrer_id,amount");
      if (!refs) return;
      const map: Record<string, { count: number; amount: number }> = {};
      refs.forEach((r) => {
        const k = r.referrer_id as string;
        if (!map[k]) map[k] = { count: 0, amount: 0 };
        map[k].count += 1;
        map[k].amount += Number(r.amount ?? 0);
      });
      const ids = Object.keys(map).slice(0, 50);
      if (!ids.length) { setReferrers([]); return; }
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      const merged: Referrer[] = (profs ?? []).map((p) => ({
        id: p.id, full_name: p.full_name,
        referrals: map[p.id]?.count ?? 0,
        earned: map[p.id]?.amount ?? 0,
      })).sort((a, b) => b.earned - a.earned).slice(0, 10);
      setReferrers(merged);
    })();
  }, []);

  /* ---------- Derived: forecast (linear regression on revenue series) ---------- */
  const forecast = useMemo(() => {
    if (!series || series.length < 7) return null;
    const xs = series.map((_, i) => i);
    const ys = series.map((s) => s.revenue);
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumXX = xs.reduce((s, x) => s + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const projDays = Math.min(15, Math.round(days / 2));
    const out: DayBucket[] = [];
    for (let i = 0; i < projDays; i++) {
      const x = n + i;
      const proj = Math.max(0, slope * x + intercept);
      const d = new Date(Date.now() + (i + 1) * 86400_000).toISOString();
      out.push({ d: fmtKey(d), signups: 0, revenue: proj, withdraw: 0, tasks: 0, netflow: proj });
    }
    return { projection: out, slope, monthly: Math.max(0, Math.round((slope * 30 + intercept) * 30)) };
  }, [series, days]);

  const combinedSeries = useMemo(() => {
    if (!series) return null;
    const actual = series.map((s) => ({ ...s, projected: null as number | null }));
    const fc = forecast ? forecast.projection.map((p) => ({ ...p, revenue: null as unknown as number, projected: p.revenue })) : [];
    return [...actual, ...fc];
  }, [series, forecast]);

  /* ---------- Export ---------- */
  const exportCsv = () => {
    if (!series) return;
    const head = "date,signups,revenue,withdraw,tasks,netflow\n";
    const body = series.map((r) => `${r.d},${r.signups},${r.revenue},${r.withdraw},${r.tasks},${r.netflow}`).join("\n");
    const blob = new Blob([head + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(settings?.site_name ?? "Report").replace(/\s+/g, "_")}_Report_${days}d_${Date.now()}.csv`;
    a.click();
  };

  const printReport = () => window.print();

  /* ============== UI ============== */
  return (
    <div className="space-y-4 print:bg-white">
      <AdminPageHeader
        accent="indigo" Icon={BarChart3}
        title="রিপোর্ট ও অ্যানালিটিক্স"
        subtitle={`গত ${days} দিনের সম্পূর্ণ সিস্টেম পরিসংখ্যান ও ভবিষ্যৎ পূর্বাভাস`}
        action={
          <div className="flex gap-2 print:hidden">
            <SoftButton onClick={printReport}><Printer className="h-3.5 w-3.5" /> Print</SoftButton>
            <GradientButton accent="indigo" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</GradientButton>
          </div>
        }
      />

      {/* ----- Date range ----- */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-600 mr-1">পরিসীমা:</span>
        {[7, 30, 90, 365].map((n) => (
          <button key={n} onClick={() => setDays(n)} className={cn(
            "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
            days === n
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md scale-105"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300",
          )}>{n === 365 ? "১ বছর" : `${n} দিন`}</button>
        ))}
      </div>

      {/* ============== KPI GRID ============== */}
      {!snap ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Shimmer key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          <SectionTitle title="মূল পরিসংখ্যান" hint="সকল গুরুত্বপূর্ণ মেট্রিক এক নজরে" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile accent="emerald" Icon={Wallet} label="মোট রেভিনিউ" value={BN(snap.totalRevenue)} hint={`${days} দিনে`} />
            <StatTile accent="rose" Icon={CreditCard} label="মোট উইথড্র" value={BN(snap.totalWithdraw)} hint={`${days} দিনে`} />
            <StatTile accent="sky" Icon={Users} label="নতুন ইউজার" value={NUM(snap.newUsers)} hint={`মোট: ${NUM(snap.totalUsers)}`} />
            <StatTile accent="indigo" Icon={Target} label="অ্যাক্টিভ ইনভেস্টর" value={NUM(snap.activeInvestors)} hint="সক্রিয় প্যাকেজ" />

            <StatTile accent="amber" Icon={PiggyBank} label="নেট প্রফিট" value={BN(snap.totalRevenue - snap.totalWithdraw)} hint="ইন - আউট" />
            <StatTile accent="fuchsia" Icon={Sparkles} label="রেফারেল কমিশন" value={BN(snap.refCommission)} hint={`${days} দিনে`} />
            <StatTile accent="orange" Icon={AlertTriangle} label="পেন্ডিং উইথড্র" value={BN(snap.pendingWithdraw)} hint={`${NUM(snap.pendingDeposit)}টি ডিপোজিট`} />
            <StatTile accent="teal" Icon={Activity} label="টাস্ক কমপ্লিট" value={NUM(snap.tasksApproved)} hint={`${NUM(snap.tasksPending)} পেন্ডিং`} />
          </div>

          {/* ============== FINANCIAL HEALTH ============== */}
          <SectionTitle title="ফাইনান্সিয়াল হেলথ" hint="সিস্টেমের সম্পূর্ণ আর্থিক চিত্র" />
          <div className="grid gap-3 md:grid-cols-3">
            <FinancialCard
              title="ক্যাশ ইনফ্লো" amount={snap.totalRevenue} icon={ArrowUpRight}
              accent="from-emerald-500 to-green-600" sub={`ডিপোজিট থেকে আয় (${days} দিন)`}
            />
            <FinancialCard
              title="ক্যাশ আউটফ্লো" amount={snap.totalWithdraw} icon={ArrowDownRight}
              accent="from-rose-500 to-red-600" sub={`ইউজার উইথড্রয়াল (${days} দিন)`}
            />
            <FinancialCard
              title="নেট ব্যালেন্স" amount={snap.totalRevenue - snap.totalWithdraw}
              icon={snap.totalRevenue >= snap.totalWithdraw ? TrendingUp : TrendingDown}
              accent={snap.totalRevenue >= snap.totalWithdraw ? "from-indigo-500 to-violet-600" : "from-orange-500 to-red-600"}
              sub="প্রতিষ্ঠানের লাভ"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <LiabilityCard label="ইউজার ব্যালেন্স (দায়)" value={snap.liabilityBalance} icon={Wallet} color="amber" />
            <LiabilityCard label="লকড ব্যালেন্স" value={snap.lockedBalance} icon={ShieldCheck} color="orange" />
            <LiabilityCard label="মোট লাইফটাইম আর্নিং" value={snap.totalEarnedLifetime} icon={Crown} color="purple" />
          </div>
        </>
      )}

      {/* ============== TREND CHARTS ============== */}
      {!combinedSeries ? <Shimmer className="h-72" /> : (
        <>
          <SectionTitle title="রেভিনিউ ও পূর্বাভাস" hint="বর্তমান ট্রেন্ড + AI-ভিত্তিক ভবিষ্যৎ পূর্বাভাস" />
          <AdminCard accent="indigo" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="bn-display text-sm text-slate-700">রেভিনিউ ট্রেন্ড + প্রজেকশন</p>
              {forecast && (
                <div className="text-xs">
                  <span className="text-slate-500">পরবর্তী ৩০ দিনে সম্ভাব্য রেভিনিউ: </span>
                  <span className="bn-display font-bold bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                    {BN(forecast.monthly)}
                  </span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={combinedSeries}>
                <defs>
                  <linearGradient id="rev-actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rev-proj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => v == null ? "—" : "৳" + Number(v).toLocaleString("en-IN")} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="বাস্তব রেভিনিউ" stroke="#6366f1" fill="url(#rev-actual)" strokeWidth={2} />
                <Area type="monotone" dataKey="projected" name="পূর্বাভাস" stroke="#ec4899" fill="url(#rev-proj)" strokeWidth={2} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="withdraw" name="উইথড্র" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </AdminCard>

          <div className="grid gap-3 lg:grid-cols-2">
            <AdminCard accent="sky" className="p-4">
              <p className="bn-display text-sm text-slate-700 mb-2">দৈনিক সাইনআপ</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={series ?? []}>
                  <defs>
                    <linearGradient id="su" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="signups" fill="url(#su)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </AdminCard>

            <AdminCard accent="emerald" className="p-4">
              <p className="bn-display text-sm text-slate-700 mb-2">দৈনিক ক্যাশ ফ্লো</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={series ?? []}>
                  <defs>
                    <linearGradient id="nf+" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => "৳" + Number(v).toLocaleString("en-IN")} />
                  <Area type="monotone" dataKey="netflow" stroke="#10b981" fill="url(#nf+)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </AdminCard>
          </div>
        </>
      )}

      {/* ============== DISTRIBUTION ============== */}
      {snap && snap.pkgDistribution.length > 0 && (
        <>
          <SectionTitle title="প্যাকেজ ও পেমেন্ট বিশ্লেষণ" hint="কোন প্যাকেজ ও মাধ্যম জনপ্রিয়" />
          <div className="grid gap-3 lg:grid-cols-2">
            <AdminCard accent="fuchsia" className="p-4">
              <p className="bn-display text-sm text-slate-700 mb-2">প্যাকেজ বিতরণ</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={snap.pkgDistribution} dataKey="value" nameKey="name"
                    innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {snap.pkgDistribution.map((_, i) => (
                      <Cell key={i} fill={["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7"][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {snap.pkgDistribution.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7"][i % 6] }} />
                      <span className="font-bold text-slate-700">{p.name}</span>
                    </span>
                    <span className="bn-display text-slate-600">{NUM(p.value)} জন · {BN(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard accent="orange" className="p-4">
              <p className="bn-display text-sm text-slate-700 mb-2">পেমেন্ট মাধ্যম বিশ্লেষণ</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={snap.payMethods}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="deposits" name="ডিপোজিট" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="withdrawals" name="উইথড্র" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </AdminCard>
          </div>
        </>
      )}

      {/* ============== SYSTEM HEALTH ============== */}
      {snap && (
        <>
          <SectionTitle title="সিস্টেম স্বাস্থ্য" hint="অ্যাটেনশন দরকার এমন বিষয়সমূহ" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HealthTile label="পেন্ডিং ডিপোজিট" value={NUM(snap.pendingDeposit)} hint="অনুমোদন প্রয়োজন" tone={snap.pendingDeposit > 0 ? "warn" : "ok"} Icon={CreditCard} />
            <HealthTile label="পেন্ডিং উইথড্র" value={BN(snap.pendingWithdraw)} hint={`${NUM(snap.rejectedWithdraw)} রিজেক্টেড`} tone={snap.pendingWithdraw > 0 ? "warn" : "ok"} Icon={Wallet} />
            <HealthTile label="সাসপেন্ডেড ইউজার" value={NUM(snap.suspendedUsers)} hint="অ্যাকাউন্ট ব্লকড" tone={snap.suspendedUsers > 0 ? "bad" : "ok"} Icon={AlertTriangle} />
            <HealthTile label="অনভেরিফায়েড ইমেইল" value={NUM(snap.unverifiedUsers)} hint="ভেরিফিকেশন বাকি" tone={snap.unverifiedUsers > 10 ? "warn" : "ok"} Icon={ShieldCheck} />
          </div>

          {/* Health Score */}
          <AdminCard accent="emerald" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="bn-display text-sm text-slate-700">সিস্টেম হেলথ স্কোর</p>
                <p className="text-xs text-slate-500">সকল মেট্রিকের সমন্বিত মূল্যায়ন</p>
              </div>
              <ResponsiveContainer width={140} height={120}>
                <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ name: "score", value: computeHealth(snap), fill: "#10b981" }]} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="text-right">
                <p className="bn-display text-4xl bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">{computeHealth(snap)}%</p>
                <p className="text-xs font-bold text-slate-500 mt-1">{healthLabel(computeHealth(snap))}</p>
              </div>
            </div>
          </AdminCard>
        </>
      )}

      {/* ============== LEADERBOARDS ============== */}
      <SectionTitle title="শীর্ষ পারফর্মার" hint="সর্বোচ্চ আয়কারী ও রেফারার" />
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminCard accent="amber" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-600" />
            <p className="bn-display text-sm text-slate-700">টপ ১০ আর্নার</p>
          </div>
          {!leaders ? <Shimmer className="h-40" /> : leaders.length === 0 ? <EmptyState Icon={Trophy} title="কোনো ডেটা নেই" accent="amber" /> : (
            <div className="space-y-1.5">
              {leaders.map((u, i) => (
                <div key={u.id} className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
                  i < 3 ? "bg-gradient-to-r from-amber-50 to-orange-50" : "hover:bg-slate-50",
                )}>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white",
                      i === 0 ? "bg-gradient-to-br from-amber-500 to-orange-600" :
                      i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-600" :
                      i === 2 ? "bg-gradient-to-br from-orange-400 to-amber-700" :
                      "bg-slate-200 text-slate-600",
                    )}>{i + 1}</span>
                    <span className="bn-display truncate">{u.full_name ?? "—"}</span>
                  </span>
                  <span className="bn-display bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent font-bold whitespace-nowrap">
                    {BN(Number(u.total_earned ?? 0))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard accent="purple" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-purple-600" />
            <p className="bn-display text-sm text-slate-700">টপ ১০ রেফারার</p>
          </div>
          {!referrers ? <Shimmer className="h-40" /> : referrers.length === 0 ? <EmptyState Icon={Crown} title="কোনো রেফারার নেই" accent="purple" /> : (
            <div className="space-y-1.5">
              {referrers.map((r, i) => (
                <div key={r.id} className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
                  i < 3 ? "bg-gradient-to-r from-purple-50 to-fuchsia-50" : "hover:bg-slate-50",
                )}>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white",
                      i === 0 ? "bg-gradient-to-br from-purple-500 to-fuchsia-600" :
                      i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-600" :
                      i === 2 ? "bg-gradient-to-br from-fuchsia-400 to-purple-700" :
                      "bg-slate-200 text-slate-600",
                    )}>{i + 1}</span>
                    <span className="bn-display truncate">{r.full_name ?? "—"}<span className="ml-1.5 text-[10px] text-slate-500">({NUM(r.referrals)})</span></span>
                  </span>
                  <span className="bn-display bg-gradient-to-br from-purple-600 to-fuchsia-600 bg-clip-text text-transparent font-bold whitespace-nowrap">
                    {BN(r.earned)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      {/* ============== FUTURE PLAN / RECOMMENDATIONS ============== */}
      {snap && (
        <>
          <SectionTitle title="ভবিষ্যৎ পরিকল্পনা ও পরামর্শ" hint="ডেটা-ভিত্তিক স্মার্ট রিকমেন্ডেশন" />
          <AdminCard accent="indigo" className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {generateRecommendations(snap, forecast?.monthly ?? 0).map((rec, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-3 ring-1 ring-indigo-100">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow", rec.color)}>
                    <rec.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="bn-display text-sm font-bold text-slate-800">{rec.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{rec.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </>
      )}

      {/* ============== EXPORT FOOTER ============== */}
      <div className="flex flex-wrap gap-2 pt-2 print:hidden">
        <GradientButton accent="indigo" onClick={exportCsv}><Download className="h-4 w-4" /> সম্পূর্ণ CSV ডাউনলোড</GradientButton>
        <SoftButton onClick={printReport}><FileText className="h-3.5 w-3.5" /> প্রিন্ট-ফ্রেন্ডলি রিপোর্ট</SoftButton>
      </div>
    </div>
  );
}

/* ============== HELPER COMPONENTS ============== */
function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mt-4 mb-1">
      <div>
        <h2 className="bn-display text-lg text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 text-white">Live</span>
    </div>
  );
}

function FinancialCard({
  title, amount, icon: Icon, accent, sub,
}: { title: string; amount: number; icon: React.ComponentType<{ className?: string }>; accent: string; sub: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br", accent)}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">{title}</p>
          <p className="bn-display mt-1 text-2xl sm:text-3xl">{BN(amount)}</p>
          <p className="mt-1 text-[11px] opacity-80">{sub}</p>
        </div>
        <Icon className="h-7 w-7 opacity-80" />
      </div>
    </div>
  );
}

function LiabilityCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const map: Record<string, string> = {
    amber: "from-amber-50 to-orange-50 ring-amber-200 text-amber-700",
    orange: "from-orange-50 to-red-50 ring-orange-200 text-orange-700",
    purple: "from-purple-50 to-fuchsia-50 ring-purple-200 text-purple-700",
  };
  return (
    <div className={cn("rounded-2xl bg-gradient-to-br p-4 ring-1", map[color])}>
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">{label}</p>
          <p className="bn-display text-2xl font-bold text-slate-900">{BN(value)}</p>
        </div>
      </div>
    </div>
  );
}

function HealthTile({
  label, value, hint, tone, Icon,
}: { label: string; value: string; hint: string; tone: "ok" | "warn" | "bad"; Icon: React.ComponentType<{ className?: string }> }) {
  const t = tone === "ok"
    ? "from-emerald-50 to-teal-50 ring-emerald-200 text-emerald-700"
    : tone === "warn"
    ? "from-amber-50 to-orange-50 ring-amber-200 text-amber-700"
    : "from-rose-50 to-red-50 ring-rose-200 text-rose-700";
  return (
    <div className={cn("rounded-2xl bg-gradient-to-br p-4 ring-1", t)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">{label}</p>
          <p className="bn-display mt-1 text-xl font-bold text-slate-900">{value}</p>
          <p className="text-[10px] opacity-80 mt-1">{hint}</p>
        </div>
        <Icon className="h-5 w-5 shrink-0" />
      </div>
    </div>
  );
}

/* ============== ALGORITHMS ============== */
function computeHealth(s: Snapshot): number {
  let score = 100;
  if (s.pendingDeposit > 5) score -= Math.min(20, s.pendingDeposit);
  if (s.pendingWithdraw > 50000) score -= 15;
  if (s.suspendedUsers > 0 && s.totalUsers > 0) score -= Math.min(15, (s.suspendedUsers / s.totalUsers) * 100);
  if (s.totalUsers > 0 && s.unverifiedUsers / s.totalUsers > 0.4) score -= 10;
  if (s.totalWithdraw > s.totalRevenue * 1.2) score -= 20;
  return Math.max(20, Math.round(score));
}
function healthLabel(n: number) {
  if (n >= 85) return "চমৎকার অবস্থা";
  if (n >= 70) return "ভালো — সামান্য মনোযোগ";
  if (n >= 50) return "সতর্কতা প্রয়োজন";
  return "জরুরি ব্যবস্থা নিন";
}

function generateRecommendations(s: Snapshot, projected: number) {
  const recs: { title: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [];

  if (s.pendingDeposit > 3) {
    recs.push({
      title: "ডিপোজিট অনুমোদন বাকি",
      desc: `${NUM(s.pendingDeposit)}টি ডিপোজিট অনুমোদনের অপেক্ষায়। দ্রুত অনুমোদন করুন — ইউজার সন্তুষ্টি বাড়বে।`,
      icon: CreditCard, color: "from-amber-500 to-orange-600",
    });
  }
  if (s.pendingWithdraw > 0) {
    recs.push({
      title: "উইথড্র প্রসেসিং",
      desc: `${BN(s.pendingWithdraw)} উইথড্র পেন্ডিং। ২৪ ঘন্টার মধ্যে প্রসেস করলে ট্রাস্ট বৃদ্ধি পাবে।`,
      icon: Wallet, color: "from-rose-500 to-red-600",
    });
  }
  if (s.totalRevenue > s.totalWithdraw * 1.5) {
    recs.push({
      title: "শক্তিশালী লাভ",
      desc: `রেভিনিউ উইথড্রের চেয়ে ${Math.round((s.totalRevenue / Math.max(s.totalWithdraw, 1)) * 100 - 100)}% বেশি। মার্কেটিং বাজেট বাড়ানোর সময়।`,
      icon: TrendingUp, color: "from-emerald-500 to-green-600",
    });
  } else if (s.totalWithdraw > s.totalRevenue) {
    recs.push({
      title: "ক্যাশফ্লো সতর্কতা",
      desc: "উইথড্র রেভিনিউ ছাড়িয়েছে। নতুন প্যাকেজ লঞ্চ বা প্রমোশন চালান।",
      icon: AlertTriangle, color: "from-rose-500 to-red-600",
    });
  }
  if (projected > 0) {
    recs.push({
      title: "৩০ দিনের রাজস্ব পূর্বাভাস",
      desc: `বর্তমান ট্রেন্ড চললে আগামী মাসে ~${BN(projected)} আয় সম্ভব। প্রস্তুতি নিন।`,
      icon: Target, color: "from-indigo-500 to-violet-600",
    });
  }
  if (s.unverifiedUsers > 10) {
    recs.push({
      title: "ইমেইল ভেরিফিকেশন ক্যাম্পেইন",
      desc: `${NUM(s.unverifiedUsers)} জন ইউজার অনভেরিফায়েড। রিমাইন্ডার ইমেইল পাঠান।`,
      icon: ShieldCheck, color: "from-sky-500 to-blue-600",
    });
  }
  if (s.activeInvestors > 0 && s.totalUsers > 0) {
    const conv = Math.round((s.activeInvestors / s.totalUsers) * 100);
    recs.push({
      title: `ইনভেস্টমেন্ট কনভার্শন: ${conv}%`,
      desc: conv < 20
        ? "কনভার্শন কম — অনবোর্ডিং ইমেইল ও বোনাস অফার দিন।"
        : "ভালো কনভার্শন রেট। রেফারেল প্রোগ্রাম আরও বুস্ট করুন।",
      icon: Sparkles, color: "from-fuchsia-500 to-pink-600",
    });
  }
  if (recs.length === 0) {
    recs.push({
      title: "সব ঠিকঠাক চলছে",
      desc: "এই মুহূর্তে কোনো জরুরি অ্যাকশন নেই। ভাল পারফরম্যান্স ধরে রাখুন।",
      icon: ShieldCheck, color: "from-emerald-500 to-teal-600",
    });
  }
  return recs.slice(0, 6);
}
