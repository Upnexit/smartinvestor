import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users, Package, Wallet, TrendingUp, LayoutDashboard, ArrowRight,
  Award, Crown, UserPlus, Sparkles, MessagesSquare, User as UserIcon,
  Eye, EyeOff, Flame, Trophy,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { AdminCard, EmptyState, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { getMyDistributorBundle, listMyDistributorUsers } from "@/lib/admin-client";
import { DistributorReferralCard } from "@/components/distributor/DistributorReferralCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/distributor/")({
  component: DistDashboard,
});

type Stats = { total_users?: number; active_packages?: number; total_deposit?: number; balance?: number; total_earned?: number };
type Profile = { full_name?: string; district?: string; commission_rate?: number };
type Me = { profile: Profile | null; stats: Stats | null };

type UserRow = {
  id: string; full_name: string | null; email: string; balance: number | null;
  total_earned?: number | null; total_deposit?: number | null; created_at: string;
};
type UPkg = { user_id: string; created_at: string; status: string; price?: number | null; packages?: { name?: string | null; price?: number | null } | null };

function DistDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [pkgs, setPkgs] = useState<UPkg[] | null>(null);
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    (async () => {
      try { setMe(await getMyDistributorBundle() as Me); } catch { setMe({ profile: null, stats: null }); }
      try {
        const u = await listMyDistributorUsers("");
        setUsers(u as UserRow[]);
      } catch { setUsers([]); }
    })();
  }, []);

  // Fetch packages for this distributor's users
  useEffect(() => {
    if (!users || users.length === 0) { setPkgs([]); return; }
    (async () => {
      const ids = users.map(u => u.id);
      try {
        const { data } = await supabase
          .from("user_packages")
          .select("user_id, created_at, status, price, packages(name,price)")
          .in("user_id", ids)
          .order("created_at", { ascending: false })
          .limit(500);
        setPkgs((data ?? []) as unknown as UPkg[]);
      } catch { setPkgs([]); }
    })();
  }, [users]);

  const s = me?.stats;
  const profile = me?.profile;

  // 7-day chart: new signups + package purchases
  const chart = useMemo(() => {
    const labels = ["শনি","রবি","সোম","মঙ্গল","বুধ","বৃহ","শুক্র"];
    const today = new Date();
    const days: { day: string; signups: number; deposits: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      days.push({ day: labels[d.getDay()], signups: 0, deposits: 0 });
    }
    (users ?? []).forEach((u) => {
      const idx = 6 - Math.floor((today.getTime() - new Date(u.created_at).getTime()) / 86400000);
      if (idx >= 0 && idx < 7) days[idx].signups += 1;
    });
    (pkgs ?? []).forEach((p) => {
      const idx = 6 - Math.floor((today.getTime() - new Date(p.created_at).getTime()) / 86400000);
      if (idx >= 0 && idx < 7) days[idx].deposits += Number(p.price ?? p.packages?.price ?? 0);
    });
    return days;
  }, [users, pkgs]);

  const popularPkg = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    (pkgs ?? []).forEach((p) => {
      const name = p.packages?.name ?? "প্যাকেজ";
      const cur = map.get(name) ?? { name, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(p.price ?? p.packages?.price ?? 0);
      map.set(name, cur);
    });
    const arr = [...map.values()].sort((a, b) => b.count - a.count);
    return arr[0] ?? null;
  }, [pkgs]);

  const topDepositor = useMemo(() => {
    if (!users || users.length === 0) return null;
    // fallback ranking by total_earned or balance if total_deposit missing
    return [...users].sort((a, b) => {
      const av = Number(a.total_deposit ?? a.total_earned ?? a.balance ?? 0);
      const bv = Number(b.total_deposit ?? b.total_earned ?? b.balance ?? 0);
      return bv - av;
    })[0];
  }, [users]);

  const recent = (users ?? []).slice(0, 6);

  const stats = [
    { Icon: Users,      label: "মোট ইউজার",     value: s?.total_users ?? 0,           from: "from-indigo-400",  via: "via-violet-500",  to: "to-purple-600",  isCount: true },
    { Icon: Package,    label: "সক্রিয় প্যাকেজ", value: s?.active_packages ?? 0,       from: "from-emerald-400", via: "via-teal-500",    to: "to-green-600",   isCount: true },
    { Icon: TrendingUp, label: "মোট ডিপোজিট",   value: s?.total_deposit ?? 0,         from: "from-fuchsia-400", via: "via-pink-500",    to: "to-rose-600" },
    { Icon: Award,      label: "মোট কমিশন",     value: s?.total_earned ?? 0,          from: "from-amber-400",   via: "via-orange-500",  to: "to-red-500" },
  ];

  const quick = [
    { to: "/distributor/users",    Icon: Users,          label: "আমার ইউজার",  desc: "সব ইউজার",     from: "from-sky-400",     to_: "to-blue-600" },
    { to: "/distributor/earnings", Icon: Wallet,         label: "কমিশন",       desc: "আয় বিস্তারিত", from: "from-emerald-400", to_: "to-green-600" },
    { to: "/distributor/support",  Icon: MessagesSquare, label: "সাপোর্ট",     desc: "অ্যাডমিন চ্যাট", from: "from-fuchsia-400", to_: "to-purple-600" },
    { to: "/distributor/profile",  Icon: UserIcon,       label: "প্রোফাইল",    desc: "তথ্য এডিট",    from: "from-violet-400",  to_: "to-fuchsia-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">DISTRIBUTOR</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">
          স্বাগতম{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {profile?.district ? `${profile.district} অঞ্চল • ` : ""}কমিশন {profile?.commission_rate ?? 5}% • আপনার নেটওয়ার্ক দেখুন
        </p>
      </div>

      {/* Balance / commission hero card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-fuchsia-300/25 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/85">আমার ব্যালেন্স</p>
            <p className="bn-display mt-1 text-4xl">
              {hideBalance ? "৳ ••••" : `৳ ${Number(s?.balance ?? 0).toLocaleString("bn-BD")}`}
            </p>
            <p className="mt-1 text-xs text-white/85">মোট আয়: ৳ {Number(s?.total_earned ?? 0).toLocaleString("bn-BD")}</p>
          </div>
          <button
            onClick={() => setHideBalance(v => !v)}
            aria-label={hideBalance ? "দেখান" : "লুকান"}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur hover:bg-white/30"
          >
            {hideBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>
        <div className="relative mt-4 flex gap-2">
          <Link to="/distributor/earnings" className="rounded-xl bg-white/20 backdrop-blur px-3 py-2 text-xs font-semibold hover:bg-white/30">আয় দেখুন</Link>
          <Link to="/distributor/users" className="rounded-xl bg-white text-indigo-700 px-3 py-2 text-xs font-bold hover:bg-indigo-50">আমার ইউজার</Link>
        </div>
      </div>

      {/* Fully gradient stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((t) => (
          <div key={t.label}
            className={cn(
              "relative overflow-hidden rounded-2xl p-4 text-white shadow-pop bg-gradient-to-br transition-all duration-300 hover:-translate-y-0.5 hover:saturate-150",
              t.from, t.via, t.to,
            )}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl" />
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 backdrop-blur ring-1 ring-white/30">
              <t.Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-[11px] font-medium text-white/85">{t.label}</p>
            <p className="bn-display mt-0.5 text-xl drop-shadow-sm">
              {t.isCount ? Number(t.value).toLocaleString("bn-BD") : `৳ ${Number(t.value).toLocaleString("bn-BD")}`}
            </p>
          </div>
        ))}
      </div>

      {/* Chart + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">নেটওয়ার্ক গ্রাফ</p>
              <h2 className="bn-display text-lg text-slate-900">৭ দিনের পারফরম্যান্স</h2>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> সাইনআপ</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-fuchsia-500" /> ডিপোজিট</span>
            </div>
          </div>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDeposits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d946ef" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  labelStyle={{ fontWeight: 700, color: "#0f172a" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Area type="monotone" dataKey="signups"  name="সাইনআপ" stroke="#6366f1" strokeWidth={2.5} fill="url(#gSignups)" />
                <Area type="monotone" dataKey="deposits" name="ডিপোজিট" stroke="#d946ef" strokeWidth={2.5} fill="url(#gDeposits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1">
          <h2 className="bn-display mb-3 text-lg text-slate-900">দ্রুত অ্যাকশন</h2>
          <div className="grid grid-cols-2 gap-3">
            {quick.map((q) => (
              <Link key={q.to} to={q.to}
                className={cn(
                  "group relative overflow-hidden rounded-2xl p-4 text-white shadow-pop transition-all duration-300 bg-gradient-to-br hover:-translate-y-0.5 hover:saturate-150",
                  q.from, q.to_,
                )}>
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/25 backdrop-blur ring-1 ring-white/30">
                  <q.Icon className="h-5 w-5" />
                </span>
                <p className="bn-display relative mt-3 text-sm">{q.label}</p>
                <p className="relative mt-0.5 text-[11px] text-white/85">{q.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights row: popular package + top depositor */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-pop bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 ring-1 ring-white/30 backdrop-blur">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/85">জনপ্রিয় প্যাকেজ</p>
              <p className="bn-display text-lg leading-tight">{popularPkg?.name ?? "—"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/20 backdrop-blur p-2.5">
              <p className="text-white/80">মোট বিক্রি</p>
              <p className="bn-display text-lg">{(popularPkg?.count ?? 0).toLocaleString("bn-BD")}</p>
            </div>
            <div className="rounded-xl bg-white/20 backdrop-blur p-2.5">
              <p className="text-white/80">মোট আয়</p>
              <p className="bn-display text-lg">৳ {(popularPkg?.revenue ?? 0).toLocaleString("bn-BD")}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-pop bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 ring-1 ring-white/30 backdrop-blur">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/85">সর্বোচ্চ ডিপোজিটকারী</p>
              <p className="bn-display text-lg leading-tight truncate">{topDepositor?.full_name ?? "—"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/20 backdrop-blur p-2.5">
              <p className="text-white/80">ডিপোজিট</p>
              <p className="bn-display text-lg">৳ {Number(topDepositor?.total_deposit ?? topDepositor?.total_earned ?? 0).toLocaleString("bn-BD")}</p>
            </div>
            <div className="rounded-xl bg-white/20 backdrop-blur p-2.5">
              <p className="text-white/80">ব্যালেন্স</p>
              <p className="bn-display text-lg">৳ {Number(topDepositor?.balance ?? 0).toLocaleString("bn-BD")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent users */}
      <AdminCard accent="sky" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="bn-display text-lg text-slate-900 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-sky-600" /> সাম্প্রতিক ইউজার
          </h3>
          <Link to="/distributor/users" className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1">সব দেখুন <ArrowRight className="h-3 w-3" /></Link>
        </div>
        {users === null ? <Shimmer className="h-24" />
          : recent.length === 0 ? <EmptyState Icon={Users} title="এখনো কোন ইউজার নেই" hint="নিচের রেফারেল লিংক শেয়ার করে শুরু করুন" accent="sky" />
          : (
            <ul className="divide-y divide-slate-100">
              {recent.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold shadow-md">
                      {(u.full_name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{u.full_name || "—"}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">৳{Number(u.balance ?? 0).toLocaleString("bn-BD")}</span>
                </li>
              ))}
            </ul>
          )}
      </AdminCard>

      {/* Referral share */}
      <DistributorReferralCard />

      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-4 text-sm text-indigo-900 flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-indigo-600" />
        <span>আপনার এলাকায় যত বেশি ইউজার — তত বেশি কমিশন! রেফারেল লিংক শেয়ার করুন এবং নেটওয়ার্ক বাড়ান।</span>
        <Crown className="h-5 w-5 shrink-0 text-amber-500 ml-auto" />
      </div>
    </div>
  );
}
