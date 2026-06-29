import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet, TrendingUp, Trophy, ThumbsUp, Eye, EyeOff, Sparkles,
  ListChecks, ArrowDownToLine, Package, Users, Gift,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Smart Investor" }] }),
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

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("smartinv:welcome") === "1") {
      setShowWelcome(true);
      sessionStorage.removeItem("smartinv:welcome");
    }
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, balance, locked_balance, total_earned, tasks_completed")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) setProfile(data as Profile);
    })();
  }, []);

  const stats = [
    { Icon: Wallet,      label: "মোট ব্যালেন্স", value: profile?.balance ?? 0,        from: "from-amber-400",   to: "to-orange-500" },
    { Icon: TrendingUp,  label: "মোট আয়",       value: profile?.total_earned ?? 0,   from: "from-emerald-400", to: "to-green-600" },
    { Icon: Trophy,      label: "লকড বোনাস",     value: profile?.locked_balance ?? 0, from: "from-fuchsia-400", to: "to-purple-600" },
    { Icon: ThumbsUp,    label: "সম্পন্ন টাস্ক",  value: profile?.tasks_completed ?? 0, from: "from-sky-400",    to: "to-blue-500", isCount: true },
  ];

  const quick = [
    { to: "/tasks",    Icon: ListChecks,      label: "আজকের টাস্ক",  from: "from-sky-400",     to_: "to-blue-500" },
    { to: "/withdraw", Icon: ArrowDownToLine, label: "উইথড্র",        from: "from-emerald-400", to_: "to-green-600" },
    { to: "/packages", Icon: Package,         label: "প্যাকেজ",       from: "from-fuchsia-400", to_: "to-purple-600" },
    { to: "/referral", Icon: Users,           label: "রেফারেল",       from: "from-violet-400",  to_: "to-fuchsia-500" },
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

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">DASHBOARD</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">
          স্বাগতম{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">আজকে লাইক ও কমেন্ট করে আয় শুরু করুন।</p>
      </div>

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

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className={cn("grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", s.from, s.to)}>
              <s.Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs text-slate-500">{s.label}</p>
            <p className="bn-display mt-0.5 text-lg text-slate-900">
              {s.isCount ? s.value : `৳ ${Number(s.value).toFixed(2)}`}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="bn-display text-lg text-slate-900">দ্রুত অ্যাকশন</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quick.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div className={cn("grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", q.from, q.to_)}>
                <q.Icon className="h-5 w-5" />
              </div>
              <p className="bn-display mt-3 text-sm text-slate-900">{q.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">এখনই যান →</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900 flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0" />
        <span>সম্পূর্ণ ড্যাশবোর্ড (চার্ট, প্যাকেজ স্ট্যাটাস, রিসেন্ট অ্যাক্টিভিটি) পরবর্তী ধাপে যোগ হবে।</span>
      </div>
    </div>
  );
}
