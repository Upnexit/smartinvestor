import { createFileRoute, Link, redirect, isRedirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet, TrendingUp, Trophy, ThumbsUp, Eye, EyeOff, Sparkles,
  ListChecks, ArrowDownToLine, Package, Users, Gift, Crown, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ReferralShareCard } from "@/components/panel/ReferralShareCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Smart Investor" }] }),
  beforeLoad: async () => {
    // If the signed-in user is an admin or distributor, send them to their panel
    // so returning-visit "tab reopen" always lands on the right dashboard.
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const email = user.email?.toLowerCase() ?? "";
    if (email === "upnex360@gmail.com") throw redirect({ to: "/admin" });
    try {
      const { data: roleRows } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const roles = (roleRows ?? []).map((r) => r.role as string);
      if (roles.includes("admin")) throw redirect({ to: "/admin" });
      if (roles.includes("distributor")) throw redirect({ to: "/distributor" });
    } catch (e) {
      if (isRedirect(e)) throw e;
    }
  },
  component: DashboardPage,
});

type Profile = {
  full_name: string | null;
  balance: number;
  locked_balance: number;
  total_earned: number;
  tasks_completed: number;
};

function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showActivated, setShowActivated] = useState(false);
  const [activatedPkgName, setActivatedPkgName] = useState<string>("");
  const [hasActivePackage, setHasActivePackage] = useState<boolean | null>(null);
  const [activePkgPrice, setActivePkgPrice] = useState<number | null>(null);
  const [maxPkgPrice, setMaxPkgPrice] = useState<number | null>(null);
  const [tasksApproved, setTasksApproved] = useState<number>(0);
  const [chart, setChart] = useState<{ day: string; income: number; referral: number; tasks: number }[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("smartinv:welcome") === "1") {
      setShowWelcome(true);
      sessionStorage.removeItem("smartinv:welcome");
    }
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, balance, locked_balance, total_earned, tasks_completed")
        .eq("id", uid)
        .maybeSingle();
      if (p) setProfile(p as Profile);

      const { data: up } = await supabase
        .from("user_packages")
        .select("id, status, package_id, activated_at, packages(name, price)")
        .eq("user_id", uid)
        .eq("status", "active")
        .order("activated_at", { ascending: false })
        .limit(1);
      const active = (up ?? [])[0] as { id: string; package_id: string; packages?: { name?: string; price?: number } | null } | undefined;
      setHasActivePackage(!!active);
      setActivePkgPrice(active?.packages?.price != null ? Number(active.packages.price) : null);

      // Highest-priced active package available (to detect upgrade opportunity)
      const { data: pkgs } = await supabase
        .from("packages").select("price").eq("active", true).order("price", { ascending: false }).limit(1);
      setMaxPkgPrice((pkgs?.[0]?.price != null) ? Number(pkgs[0].price) : null);

      // Show congratulations once per activation
      if (active && typeof window !== "undefined") {
        const key = `smartinv:activated:${active.id}`;
        if (!localStorage.getItem(key)) {
          setActivatedPkgName(active.packages?.name ?? "আপনার প্যাকেজ");
          setShowActivated(true);
          localStorage.setItem(key, "1");
        }
      }

      // Approved task count — real-time from task_submissions
      const { count: approvedCount } = await supabase
        .from("task_submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("status", "approved");
      setTasksApproved(approvedCount ?? 0);

      // 7-day chart data — real data from task_submissions (approved) + referral_earnings
      const days: { day: string; income: number; referral: number; tasks: number; key: string }[] = [];
      const labels = ["রবি","সোম","মঙ্গল","বুধ","বৃহ","শুক্র","শনি"];
      const startOfToday = startOfDayBD();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(startOfToday.getTime() - i * 86400_000);
        const key = bdDateString(d);
        // getDay() in BD: shift by +6h then read UTC weekday
        const bdWeekday = new Date(d.getTime() + 6 * 3600_000).getUTCDay();
        days.push({ day: labels[bdWeekday], income: 0, referral: 0, tasks: 0, key });
      }
      const dayIdx = (iso: string) => {
        const k = bdDateString(new Date(iso));
        return days.findIndex((x) => x.key === k);
      };
      try {
        const since = new Date(startOfToday.getTime() - 6 * 86400_000);
        const [subsRes, refsRes] = await Promise.all([
          supabase.from("task_submissions")
            .select("created_at, status, link_tasks(reward)")
            .eq("user_id", uid).eq("status", "approved")
            .gte("created_at", since.toISOString()),
          supabase.from("referral_earnings")
            .select("created_at, amount")
            .eq("referrer_id", uid)
            .gte("created_at", since.toISOString()),
        ]);
        const subs = (subsRes.data ?? []) as Array<{ created_at: string; link_tasks: { reward: number | string | null } | null }>;
        const refs = (refsRes.data ?? []) as Array<{ created_at: string; amount: number | string | null }>;
        subs.forEach((t) => {
          const i = dayIdx(t.created_at);
          if (i >= 0) { days[i].income += Number(t.link_tasks?.reward ?? 0); days[i].tasks += 1; }
        });
        refs.forEach((r) => {
          const i = dayIdx(r.created_at);
          if (i >= 0) days[i].referral += Number(r.amount ?? 0);
        });
      } catch { /* keep zeros */ }
      setChart(days);
    })();
  }, []);

  const stats = useMemo(() => ([
    { Icon: Wallet,     label: "মোট ব্যালেন্স", value: profile?.balance ?? 0,        from: "from-amber-400",   via: "via-orange-500",  to: "to-rose-500" },
    { Icon: TrendingUp, label: "মোট আয়",       value: profile?.total_earned ?? 0,   from: "from-emerald-400", via: "via-teal-500",    to: "to-green-600" },
    { Icon: Trophy,     label: "লকড বোনাস",     value: profile?.locked_balance ?? 0, from: "from-fuchsia-400", via: "via-purple-500",  to: "to-indigo-600" },
    { Icon: ThumbsUp,   label: "সম্পন্ন টাস্ক",  value: Math.max(tasksApproved, profile?.tasks_completed ?? 0), from: "from-sky-400",     via: "via-blue-500",    to: "to-cyan-600", isCount: true },
  ]), [profile, tasksApproved]);

  const canUpgrade = hasActivePackage === true && activePkgPrice != null && maxPkgPrice != null && activePkgPrice < maxPkgPrice;

  const quick = [
    { to: "/tasks",    Icon: ListChecks,      label: "আজকের টাস্ক", desc: "ইনকাম শুরু",  from: "from-sky-400",     to_: "to-blue-600" },
    { to: "/withdraw", Icon: ArrowDownToLine, label: "উইথড্র",       desc: "টাকা তুলুন",  from: "from-emerald-400", to_: "to-green-600" },
    { to: "/packages", Icon: Package,         label: "প্যাকেজ",      desc: "আপগ্রেড",    from: "from-fuchsia-400", to_: "to-purple-600" },
    { to: "/referral", Icon: Users,           label: "রেফারেল",      desc: "৫% কমিশন",  from: "from-violet-400",  to_: "to-fuchsia-500" },
  ];

  return (
    <div className="space-y-5">
      {showWelcome && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <Gift className="h-8 w-8" />
            </div>
            <h2 className="bn-display mt-4 text-2xl text-slate-900">স্বাগতম!</h2>
            <p className="mt-2 text-sm text-slate-600">
              আপনার একাউন্টে <span className="font-bold text-amber-700">৳৩০০</span> সাইনআপ বোনাস ক্রেডিট হয়েছে।
              প্যাকেজ কিনে এটি আনলক করুন।
            </p>
            <button onClick={() => setShowWelcome(false)} className="btn-gold mt-5 w-full">শুরু করুন</button>
          </div>
        </div>
      )}

      {showActivated && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-6 py-8 text-center text-white">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-emerald-600 shadow-xl">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="bn-display mt-4 text-2xl">অভিনন্দন! 🎉</h2>
              <p className="mt-2 text-sm font-semibold text-white/95">
                আপনার <span className="font-black">{activatedPkgName}</span> প্যাকেজটি সফলভাবে active হয়েছে।
              </p>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm text-slate-700">
                এখন আপনি প্রতিদিন Task সম্পন্ন করে আয় করতে পারবেন, referral commission উপার্জন করতে পারবেন এবং যেকোনো সময় withdraw করতে পারবেন।
              </p>
              <button onClick={() => setShowActivated(false)} className="btn-gold mt-5 w-full">শুরু করুন</button>
            </div>
          </div>
        </div>
      )}


      {/* Welcome header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">DASHBOARD</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">
          স্বাগতম{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">আজকে লাইক ও কমেন্ট করে আয় শুরু করুন।</p>
      </div>

      {/* Promotion — different copy for no-package vs. upgrade-available */}
      {(hasActivePackage === false || canUpgrade) && (
        <Link
          to="/packages"
          className="group relative block overflow-hidden rounded-3xl p-[1.5px] bg-gradient-to-r from-amber-400 via-fuchsia-500 to-emerald-500 shadow-pop"
        >
          <div className="relative flex items-center gap-4 rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-slate-900 via-indigo-950 to-fuchsia-950 p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-2xl" />
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-2 ring-white/20">
              <Crown className="h-6 w-6" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                {canUpgrade ? "UPGRADE OFFER" : "SPECIAL OFFER"}
              </p>
              <p className="bn-display truncate text-base text-white sm:text-lg">
                {canUpgrade
                  ? "আরো আয় বাড়াতে প্যাকেজ upgrade করুন"
                  : "প্যাকেজ ক্রয় করুন — দৈনিক টাস্ক শুরু করুন"}
              </p>
              <p className="mt-0.5 text-xs text-white/75">
                {canUpgrade
                  ? "উপরের প্যাকেজে দৈনিক আয় ও টাস্ক লিমিট অনেক বেশি"
                  : "৪৫ দিনে ১১০% পর্যন্ত রিটার্ন · ইনকাম শুরু করুন"}
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-white text-amber-700 px-3 py-2 text-xs font-bold shadow-md transition group-hover:translate-x-1">
              {canUpgrade ? "আপগ্রেড করুন" : "প্যাকেজ দেখুন"} <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <span className="sm:hidden grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-md">
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
        </Link>
      )}


      {/* Balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/85">মোট ব্যালেন্স</p>
            <p className="bn-display mt-1 text-4xl">
              {hideBalance ? "৳ ••••" : `৳ ${(profile?.balance ?? 0).toFixed(2)}`}
            </p>
            <p className="mt-1 text-xs text-white/85">লকড: ৳ {(profile?.locked_balance ?? 0).toFixed(2)}</p>
          </div>
          <button
            onClick={() => setHideBalance((v) => !v)}
            aria-label={hideBalance ? "ব্যালেন্স দেখান" : "ব্যালেন্স লুকান"}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur hover:bg-white/30"
          >
            {hideBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>
        <div className="relative mt-4 flex gap-2">
          <Link to="/withdraw" className="rounded-xl bg-white/20 backdrop-blur px-3 py-2 text-xs font-semibold hover:bg-white/30">উইথড্র করুন</Link>
          <Link to="/tasks" className="rounded-xl bg-white text-amber-700 px-3 py-2 text-xs font-bold hover:bg-amber-50">আজকের টাস্ক</Link>
        </div>
      </div>

      {/* Stat tiles — fully gradient */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "relative overflow-hidden rounded-2xl p-4 text-white shadow-pop bg-gradient-to-br",
              s.from, s.via, s.to,
            )}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl" />
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 backdrop-blur ring-1 ring-white/30">
              <s.Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-[11px] font-medium text-white/85">{s.label}</p>
            <p className="bn-display mt-0.5 text-xl drop-shadow-sm">
              {s.isCount ? s.value : `৳ ${Number(s.value).toFixed(2)}`}
            </p>
          </div>
        ))}
      </div>

      {/* Chart (left) + 2x2 Quick Actions (right) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">গোল গ্রাফ</p>
              <h2 className="bn-display text-lg text-slate-900">সাপ্তাহিক পারফরম্যান্স</h2>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> ইনকাম</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-fuchsia-500" /> রেফারেল</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> টাস্ক</span>
            </div>
          </div>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRef" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d946ef" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  labelStyle={{ fontWeight: 700, color: "#0f172a" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Area type="monotone" dataKey="income"   name="ইনকাম"   stroke="#f59e0b" strokeWidth={2.5} fill="url(#gIncome)" />
                <Area type="monotone" dataKey="referral" name="রেফারেল" stroke="#d946ef" strokeWidth={2.5} fill="url(#gRef)" />
                <Area type="monotone" dataKey="tasks"    name="টাস্ক"    stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions — 2x2 on the right */}
        <div className="lg:col-span-1">
          <h2 className="bn-display mb-3 text-lg text-slate-900">দ্রুত অ্যাকশন</h2>
          <div className="grid grid-cols-2 gap-3">
            {quick.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className={cn(
                  "group relative overflow-hidden rounded-2xl p-4 text-white shadow-pop transition-all duration-300 bg-gradient-to-br hover:-translate-y-0.5 hover:saturate-150",
                  q.from, q.to_,
                )}
              >
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

      {/* Referral share — quick access from dashboard */}
      <ReferralShareCard compact />


      {hasActivePackage === false ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 p-4 text-sm text-amber-900 flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
          <span>প্যাকেজ ক্রয় করে দৈনিক টাস্ক শুরু করুন এবং ৪৫ দিনে ১১০% পর্যন্ত রিটার্ন অর্জন করুন।</span>
        </div>
      ) : canUpgrade ? (
        <div className="rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-amber-50 to-emerald-50 p-4 text-sm text-fuchsia-900 flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-fuchsia-600" />
          <span>আরো আয় বাড়াতে <Link to="/packages" className="font-bold underline">প্যাকেজ upgrade করুন</Link> — উপরের প্যাকেজে দৈনিক আয় ও টাস্ক লিমিট বেশি।</span>
        </div>
      ) : null}
    </div>

  );
}
