import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays, ArrowLeft, Users, CheckCircle2, Clock, XCircle,
  Coins, Trophy, ListChecks, Search, ChevronRight, TrendingUp,
} from "lucide-react";
import { AdminPageHeader, AdminCard, StatTile, Shimmer, EmptyState } from "@/components/admin/AdminUI";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { todayBD } from "@/lib/bd-time";

export const Route = createFileRoute("/admin/tasks/daily-report")({
  head: () => ({ meta: [{ title: "দৈনিক টাস্ক রিপোর্ট — Admin" }] }),
  component: DailyReportPage,
});

type UserRow = {
  user_id: string;
  full_name: string | null;
  user_code: string | null;
  avatar_url: string | null;
  package_name: string | null;
  approved: number;
  pending: number;
  rejected: number;
  total_reward: number;
};

function DailyReportPage() {
  const [date, setDate] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);
  const [totalActive, setTotalActive] = useState(0);
  const [totals, setTotals] = useState({ approved: 0, pending: 0, rejected: 0, reward: 0 });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const dateStr = useMemo(() => {
    // Convert selected date to YYYY-MM-DD in BD tz
    return format(date, "yyyy-MM-dd");
  }, [date]);

  const isToday = dateStr === todayBD();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const dayStartISO = new Date(`${dateStr}T00:00:00+06:00`).toISOString();
      const dayEndISO = new Date(`${dateStr}T23:59:59.999+06:00`).toISOString();

      // Total active users (users with any active package)
      const totalActivePromise = supabase
        .from("user_packages")
        .select("user_id", { count: "exact", head: false })
        .eq("status", "active");

      // Submissions on selected date, joined with task reward only
      const subsPromise = supabase
        .from("task_submissions")
        .select("user_id, status, reward_credited, link_tasks(reward)")
        .gte("created_at", dayStartISO)
        .lte("created_at", dayEndISO);

      const [{ data: actRows }, { data: subs }] = await Promise.all([
        totalActivePromise, subsPromise,
      ]);

      const uniqueActive = new Set<string>();
      (actRows ?? []).forEach((r: { user_id: string }) => uniqueActive.add(r.user_id));

      const userIds = Array.from(new Set(((subs ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)));
      const pkgByUser = new Map<string, string>();
      const profileByUser = new Map<string, { full_name: string | null; user_code: string | null; avatar_url: string | null }>();
      if (userIds.length) {
        const [{ data: ups }, { data: profs }] = await Promise.all([
          supabase.from("user_packages").select("user_id, packages(name)").in("user_id", userIds).eq("status", "active"),
          supabase.from("profiles").select("id, full_name, user_code, avatar_url").in("id", userIds),
        ]);
        (ups ?? []).forEach((r: { user_id: string; packages: { name: string } | null }) => {
          if (r.packages?.name) pkgByUser.set(r.user_id, r.packages.name);
        });
        (profs ?? []).forEach((p: { id: string; full_name: string | null; user_code: string | null; avatar_url: string | null }) => {
          profileByUser.set(p.id, { full_name: p.full_name, user_code: p.user_code, avatar_url: p.avatar_url });
        });
      }

      type SubRow = {
        user_id: string;
        status: string;
        reward_credited: number | null;
        link_tasks: { reward: number } | null;
      };

      const map = new Map<string, UserRow>();
      let tApproved = 0, tPending = 0, tRejected = 0, tReward = 0;
      ((subs ?? []) as SubRow[]).forEach((s) => {
        const uid = s.user_id;
        let row = map.get(uid);
        if (!row) {
          const p = profileByUser.get(uid);
          row = {
            user_id: uid,
            full_name: p?.full_name ?? null,
            user_code: p?.user_code ?? null,
            avatar_url: p?.avatar_url ?? null,
            package_name: pkgByUser.get(uid) ?? null,
            approved: 0, pending: 0, rejected: 0, total_reward: 0,
          };
          map.set(uid, row);
        }
        if (s.status === "approved") {
          row.approved += 1;
          tApproved += 1;
          const r = Number(s.reward_credited ?? s.link_tasks?.reward ?? 0);
          row.total_reward += r;
          tReward += r;
        } else if (s.status === "pending") { row.pending += 1; tPending += 1; }
        else if (s.status === "rejected") { row.rejected += 1; tRejected += 1; }
      });

      const list = Array.from(map.values()).sort((a, b) => b.approved - a.approved || b.total_reward - a.total_reward);

      if (!cancelled) {
        setTotalActive(uniqueActive.size);
        setTotals({ approved: tApproved, pending: tPending, rejected: tRejected, reward: tReward });
        setUsers(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dateStr]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.user_code ?? "").toLowerCase().includes(q) ||
      (u.package_name ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const participation = totalActive > 0 ? Math.round((users.length / totalActive) * 100) : 0;
  const completionRate = users.length > 0
    ? Math.round((users.filter((u) => u.approved > 0).length / users.length) * 100)
    : 0;

  return (
    <>
      <AdminPageHeader
        accent="fuchsia"
        Icon={CalendarDays}
        title="দৈনিক টাস্ক রিপোর্ট"
        subtitle="ইউজার-ভিত্তিক টাস্ক সম্পন্ন করার বিস্তারিত"
        action={
          <Link to="/admin/tasks" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <ArrowLeft className="h-3.5 w-3.5" /> টাস্ক লিংক
          </Link>
        }
      />

      {/* Colorful hero with date picker */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 p-5 sm:p-6 shadow-2xl shadow-fuchsia-500/30">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">Report Date</p>
            <p className="bn-display text-2xl sm:text-3xl mt-1">
              {format(date, "d MMMM, yyyy")}
              {isToday && <span className="ml-2 rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-bold align-middle">আজ</span>}
            </p>
            <p className="mt-1 text-xs text-white/80">{format(date, "EEEE")}</p>
          </div>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 text-sm font-bold text-fuchsia-700 shadow-lg ring-1 ring-white/50 hover:bg-white">
                <CalendarDays className="h-4 w-4" /> তারিখ বাছাই করুন
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { if (d) { setDate(d); setPickerOpen(false); } }}
                disabled={(d) => d > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="মোট Active User" value={totalActive} accent="emerald" Icon={Users} />
        <StatTile label="অংশগ্রহণ" value={`${users.length} (${participation}%)`} accent="sky" Icon={TrendingUp} />
        <StatTile label="Approved" value={totals.approved} accent="emerald" Icon={CheckCircle2} />
        <StatTile label="Pending" value={totals.pending} accent="amber" Icon={Clock} />
        <StatTile label="Rejected" value={totals.rejected} accent="rose" Icon={XCircle} />
        <StatTile label="মোট Reward ৳" value={totals.reward.toFixed(2)} accent="fuchsia" Icon={Coins} />
      </div>

      {/* Progress bar */}
      <AdminCard accent="fuchsia" className="p-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-500" /> সম্পন্নের হার</span>
          <span className="text-fuchsia-700">{completionRate}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-fuchsia-500 to-rose-500 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          {users.length}জন user submit করেছেন, তাদের মধ্যে {users.filter((u) => u.approved > 0).length}জন কমপক্ষে একটি approved পেয়েছেন।
        </p>
      </AdminCard>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="নাম, ইউজার কোড, প্যাকেজ খুঁজুন…"
          className="w-full rounded-xl border border-fuchsia-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-fuchsia-400"
        />
      </div>

      {/* User list */}
      {loading ? (
        <Shimmer className="h-40" />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          Icon={ListChecks}
          accent="fuchsia"
          title={search ? "মিল পাওয়া যায়নি" : "এই দিনে কোনো task সম্পন্ন হয়নি"}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredUsers.map((u, idx) => (
            <Link
              key={u.user_id}
              to="/admin/users/$id"
              params={{ id: u.user_id }}
              className="group relative overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-slate-200 shadow-sm hover:shadow-lg hover:ring-fuchsia-300 transition"
            >
              {idx < 3 && (
                <span className={cn(
                  "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black text-white shadow",
                  idx === 0 && "bg-gradient-to-br from-amber-400 to-orange-500",
                  idx === 1 && "bg-gradient-to-br from-slate-400 to-slate-600",
                  idx === 2 && "bg-gradient-to-br from-orange-300 to-amber-600",
                )}>
                  #{idx + 1}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white font-bold shadow-md">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                    : (u.full_name || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate bn-display text-sm text-slate-900">{u.full_name || "নামহীন"}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {u.user_code}{u.package_name && <span> • 📦 {u.package_name}</span>}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-fuchsia-600" />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                <MiniStat label="Approve" value={u.approved} tone="emerald" />
                <MiniStat label="Pending" value={u.pending} tone="amber" />
                <MiniStat label="Reject" value={u.rejected} tone="rose" />
                <MiniStat label="৳" value={u.total_reward.toFixed(2)} tone="fuchsia" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number | string; tone: "emerald" | "amber" | "rose" | "fuchsia" }) {
  const map = {
    emerald: "from-emerald-50 to-emerald-100 text-emerald-800 ring-emerald-200",
    amber: "from-amber-50 to-amber-100 text-amber-800 ring-amber-200",
    rose: "from-rose-50 to-rose-100 text-rose-800 ring-rose-200",
    fuchsia: "from-fuchsia-50 to-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  } as const;
  return (
    <div className={cn("rounded-lg bg-gradient-to-br px-1.5 py-1 ring-1", map[tone])}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="bn-display text-sm leading-tight">{value}</p>
    </div>
  );
}
