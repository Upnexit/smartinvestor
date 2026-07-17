import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays, ArrowLeft, Users, CheckCircle2, Clock, XCircle,
  Coins, Trophy, ListChecks, Search, ChevronRight, TrendingUp,
  UserCheck, UserX, ListTodo, Timer, Bell, Loader2,
} from "lucide-react";
import { AdminPageHeader, AdminCard, StatTile, Shimmer, EmptyState } from "@/components/admin/AdminUI";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { todayBD } from "@/lib/bd-time";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendMissedTaskNotice } from "@/lib/notices.functions";

export const Route = createFileRoute("/admin/tasks/daily-report")({
  head: () => ({ meta: [{ title: "দৈনিক টাস্ক রিপোর্ট — Admin" }] }),
  component: DailyReportPage,
});

type Submission = {
  id: string;
  task_id: string;
  status: string;
  created_at: string;
  reward_credited: number | null;
  task_title: string | null;
  task_reward: number;
};

type CompletedUser = {
  user_id: string;
  full_name: string | null;
  user_code: string | null;
  avatar_url: string | null;
  package_name: string | null;
  approved: number;
  pending: number;
  rejected: number;
  total_reward: number;
  first_at: string;
  last_at: string;
  submissions: Submission[];
};

type PendingUser = {
  user_id: string;
  full_name: string | null;
  user_code: string | null;
  avatar_url: string | null;
  package_name: string | null;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function DailyReportPage() {
  const [date, setDate] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);
  const [totalActive, setTotalActive] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totals, setTotals] = useState({ approved: 0, pending: 0, rejected: 0, reward: 0 });
  const [completed, setCompleted] = useState<CompletedUser[]>([]);
  const [notCompleted, setNotCompleted] = useState<PendingUser[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"done" | "missing">("done");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<Set<string>>(new Set());
  const [notified, setNotified] = useState<Set<string>>(new Set());
  const sendMissed = useServerFn(sendMissedTaskNotice);

  async function handleSendMissed(userId: string, name: string | null) {
    if (notifying.has(userId)) return;
    setNotifying((s) => new Set(s).add(userId));
    try {
      await sendMissed({ data: { user_id: userId, date: dateStr } });
      setNotified((s) => new Set(s).add(userId));
      toast.success(`${name || "User"}-কে সতর্কতা notice পাঠানো হয়েছে`);
    } catch (e: any) {
      toast.error(e?.message || "Notice পাঠানো যায়নি");
    } finally {
      setNotifying((s) => { const n = new Set(s); n.delete(userId); return n; });
    }
  }

  const dateStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  const isToday = dateStr === todayBD();

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      const dayStartISO = new Date(`${dateStr}T00:00:00+06:00`).toISOString();
      const dayEndISO = new Date(`${dateStr}T23:59:59.999+06:00`).toISOString();

      const [
        { data: pkgRows },
        { data: subs, error: subsErr },
        { data: tasks },
      ] = await Promise.all([
        supabase
          .from("user_packages")
          .select("user_id, package_id, status, activated_at, expires_at, packages(name)")
          .in("status", ["active", "expired"])
          .lte("activated_at", dayEndISO)
          .or(`expires_at.is.null,expires_at.gt.${dayStartISO}`)
          .limit(5000),
        supabase
          .from("task_submissions")
          .select("id, user_id, task_id, status, reward_credited, created_at, link_tasks(title, reward)")
          .gte("created_at", dayStartISO)
          .lte("created_at", dayEndISO)
          .limit(5000),
        supabase
          .from("link_tasks")
          .select("id, scheduled_date, created_at, is_draft, active")
          .eq("is_draft", false)
          .or(`scheduled_date.eq.${dateStr},and(scheduled_date.is.null,created_at.gte.${dayStartISO},created_at.lte.${dayEndISO})`),
      ]);

      if (subsErr) console.warn("[daily-report] submissions query error:", subsErr.message);

      const activeUsers = new Map<string, { pkg: string | null }>();
      (pkgRows ?? []).forEach((r: { user_id: string; packages: { name: string } | null }) => {
        if (!activeUsers.has(r.user_id)) {
          activeUsers.set(r.user_id, { pkg: r.packages?.name ?? null });
        }
      });

      const userIds = Array.from(new Set(((subs ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)));
      const allIds = new Set<string>([...activeUsers.keys(), ...userIds]);
      const profileByUser = new Map<string, { full_name: string | null; user_code: string | null; avatar_url: string | null }>();
      if (allIds.size) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, user_code, avatar_url").in("id", Array.from(allIds));
        (profs ?? []).forEach((p: { id: string; full_name: string | null; user_code: string | null; avatar_url: string | null }) => {
          profileByUser.set(p.id, { full_name: p.full_name, user_code: p.user_code, avatar_url: p.avatar_url });
        });
      }

      type SubRow = {
        id: string;
        user_id: string;
        task_id: string;
        status: string;
        reward_credited: number | null;
        created_at: string;
        link_tasks: { title: string; reward: number } | null;
      };

      const map = new Map<string, CompletedUser>();
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
            package_name: activeUsers.get(uid)?.pkg ?? null,
            approved: 0, pending: 0, rejected: 0, total_reward: 0,
            first_at: s.created_at, last_at: s.created_at,
            submissions: [],
          };
          map.set(uid, row);
        }
        const perReward = Number(s.reward_credited) > 0
          ? Number(s.reward_credited)
          : Number(s.link_tasks?.reward ?? 0);
        row.submissions.push({
          id: s.id, task_id: s.task_id, status: s.status, created_at: s.created_at,
          reward_credited: s.reward_credited,
          task_title: s.link_tasks?.title ?? null,
          task_reward: Number(s.link_tasks?.reward ?? 0),
        });
        if (s.created_at < row.first_at) row.first_at = s.created_at;
        if (s.created_at > row.last_at) row.last_at = s.created_at;
        // Count total reward across non-rejected submissions so the row total matches the timeline sum.
        if (s.status !== "rejected") {
          row.total_reward += perReward;
        }
        if (s.status === "approved") {
          row.approved += 1; tApproved += 1;
          tReward += perReward;
        } else if (s.status === "pending") { row.pending += 1; tPending += 1; }
        else if (s.status === "rejected") { row.rejected += 1; tRejected += 1; }
      });

      map.forEach((u) => u.submissions.sort((a, b) => a.created_at.localeCompare(b.created_at)));

      const completedList = Array.from(map.values()).sort((a, b) =>
        b.approved - a.approved || b.total_reward - a.total_reward || a.last_at.localeCompare(b.last_at),
      );

      const notCompletedList: PendingUser[] = [];
      activeUsers.forEach((v, uid) => {
        if (!map.has(uid)) {
          const p = profileByUser.get(uid);
          notCompletedList.push({
            user_id: uid,
            full_name: p?.full_name ?? null,
            user_code: p?.user_code ?? null,
            avatar_url: p?.avatar_url ?? null,
            package_name: v.pkg,
          });
        }
      });
      notCompletedList.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));

      if (!cancelled) {
        setTotalActive(activeUsers.size);
        setTotalTasks((tasks ?? []).length);
        setTotals({ approved: tApproved, pending: tPending, rejected: tRejected, reward: tReward });
        setCompleted(completedList);
        setNotCompleted(notCompletedList);
        setLoading(false);
      }
    };

    load(true);

    // Realtime: only subscribe for today's report — past dates are static.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (dateStr === todayBD()) {
      const scheduleReload = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { if (!cancelled) load(false); }, 400);
      };
      channel = supabase
        .channel(`daily-report-${dateStr}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, scheduleReload)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleReload)
        .subscribe();
    }

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [dateStr]);

  const filteredCompleted = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return completed;
    return completed.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.user_code ?? "").toLowerCase().includes(q) ||
      (u.package_name ?? "").toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q),
    );
  }, [completed, search]);

  const filteredMissing = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notCompleted;
    return notCompleted.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.user_code ?? "").toLowerCase().includes(q) ||
      (u.package_name ?? "").toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q),
    );
  }, [notCompleted, search]);

  const completionRate = totalActive > 0 ? Math.round((completed.length / totalActive) * 100) : 0;

  return (
    <>
      <AdminPageHeader
        accent="fuchsia"
        Icon={CalendarDays}
        title="দৈনিক টাস্ক রিপোর্ট"
        subtitle="আজকের টাস্ক ও ইউজার-ভিত্তিক বিস্তারিত"
        action={
          <Link to="/admin/tasks" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <ArrowLeft className="h-3.5 w-3.5" /> টাস্ক লিংক
          </Link>
        }
      />

      {/* Colorful hero */}
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

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="মোট টাস্ক" value={totalTasks} accent="purple" Icon={ListTodo} />
        <StatTile label="মোট Active User" value={totalActive} accent="sky" Icon={Users} />
        <StatTile label="সম্পন্ন করেছে" value={completed.length} accent="emerald" Icon={UserCheck} />
        <StatTile label="সম্পন্ন করেনি" value={notCompleted.length} accent="rose" Icon={UserX} />
        <StatTile label="Approved" value={totals.approved} accent="emerald" Icon={CheckCircle2} />
        <StatTile label="মোট Reward ৳" value={totals.reward.toFixed(2)} accent="fuchsia" Icon={Coins} />
      </div>

      {/* Sub stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Pending" value={totals.pending} accent="amber" Icon={Clock} />
        <StatTile label="Rejected" value={totals.rejected} accent="rose" Icon={XCircle} />
        <StatTile label="Completion %" value={`${completionRate}%`} accent="fuchsia" Icon={TrendingUp} />
      </div>

      {/* Progress */}
      <AdminCard accent="fuchsia" className="p-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-500" /> সম্পন্নের হার</span>
          <span className="text-fuchsia-700">{completionRate}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-fuchsia-500 to-rose-500 transition-all duration-500" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          মোট {totalActive}জন active user এর মধ্যে {completed.length}জন আজ অংশ নিয়েছে, {notCompleted.length}জন এখনো task সম্পন্ন করেনি।
        </p>
      </AdminCard>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
        <button
          onClick={() => setTab("done")}
          className={cn(
            "flex-1 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition inline-flex items-center justify-center gap-1.5",
            tab === "done"
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          <UserCheck className="h-4 w-4" /> সম্পন্ন ({completed.length})
        </button>
        <button
          onClick={() => setTab("missing")}
          className={cn(
            "flex-1 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition inline-flex items-center justify-center gap-1.5",
            tab === "missing"
              ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          <UserX className="h-4 w-4" /> সম্পন্ন করেনি ({notCompleted.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="নাম, ইউজার কোড, প্যাকেজ, User ID খুঁজুন…"
          className="w-full rounded-xl border border-fuchsia-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-fuchsia-400"
        />
      </div>

      {/* List */}
      {loading ? (
        <Shimmer className="h-40" />
      ) : tab === "done" ? (
        filteredCompleted.length === 0 ? (
          <EmptyState Icon={ListChecks} accent="emerald" title={search ? "মিল পাওয়া যায়নি" : "এই দিনে কেউ task সম্পন্ন করেনি"} />
        ) : (
          <div className="space-y-2">
            {filteredCompleted.map((u, idx) => {
              const isOpen = expanded === u.user_id;
              return (
                <div key={u.user_id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm hover:shadow-md transition">
                  <button onClick={() => setExpanded(isOpen ? null : u.user_id)} className="w-full p-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-md">
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                            : (u.full_name || "U").slice(0, 1).toUpperCase()}
                        </div>
                        {idx < 3 && (
                          <span className={cn(
                            "absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow ring-2 ring-white",
                            idx === 0 && "bg-gradient-to-br from-amber-400 to-orange-500",
                            idx === 1 && "bg-gradient-to-br from-slate-400 to-slate-600",
                            idx === 2 && "bg-gradient-to-br from-orange-300 to-amber-600",
                          )}>#{idx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate bn-display text-sm text-slate-900">{u.full_name || "নামহীন"}</p>
                        <p className="truncate text-[11px] text-slate-500 font-mono">
                          {u.user_code} • ID: {u.user_id.slice(0, 8)}
                        </p>
                        {u.package_name && <p className="truncate text-[11px] text-fuchsia-600 font-semibold">📦 {u.package_name}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <MiniStat label="✓" value={u.approved} tone="emerald" />
                        <MiniStat label="৳" value={u.total_reward.toFixed(2)} tone="fuchsia" />
                        <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-90")} />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> প্রথম: {fmtTime(u.first_at)}</span>
                      <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> শেষ: {fmtTime(u.last_at)}</span>
                      <span className="text-slate-400">• {u.submissions.length}টি submission</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Submission Timeline</p>
                      <div className="space-y-1.5">
                        {u.submissions.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-100">
                            <span className={cn(
                              "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white",
                              s.status === "approved" && "bg-emerald-500",
                              s.status === "pending" && "bg-amber-500",
                              s.status === "rejected" && "bg-rose-500",
                            )}>
                              {s.status === "approved" ? <CheckCircle2 className="h-4 w-4" /> : s.status === "pending" ? <Clock className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-slate-800">{s.task_title || "টাস্ক"}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {fmtTime(s.created_at)} • {new Date(s.created_at).toLocaleDateString("bn-BD")}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-fuchsia-700">৳{(Number(s.reward_credited) > 0 ? Number(s.reward_credited) : Number(s.task_reward)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <Link to="/admin/users/$id" params={{ id: u.user_id }} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-fuchsia-700 hover:underline">
                        User profile দেখুন <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        filteredMissing.length === 0 ? (
          <EmptyState Icon={CheckCircle2} accent="emerald" title={search ? "মিল পাওয়া যায়নি" : "সব active user আজ task সম্পন্ন করেছে! 🎉"} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredMissing.map((u) => {
              const isSending = notifying.has(u.user_id);
              const wasSent = notified.has(u.user_id);
              return (
                <div
                  key={u.user_id}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-rose-100 shadow-sm hover:ring-rose-300 hover:shadow-md transition"
                >
                  <Link
                    to="/admin/users/$id"
                    params={{ id: u.user_id }}
                    className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white font-bold shadow-md"
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (u.full_name || "U").slice(0, 1).toUpperCase()}
                  </Link>
                  <Link to="/admin/users/$id" params={{ id: u.user_id }} className="min-w-0 flex-1">
                    <p className="truncate bn-display text-sm text-slate-900">{u.full_name || "নামহীন"}</p>
                    <p className="truncate text-[11px] text-slate-500 font-mono">
                      {u.user_code} • ID: {u.user_id.slice(0, 8)}
                    </p>
                    {u.package_name && <p className="truncate text-[11px] text-fuchsia-600 font-semibold">📦 {u.package_name}</p>}
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendMissed(u.user_id, u.full_name); }}
                    disabled={isSending || wasSent}
                    title={wasSent ? "Notice ইতিমধ্যেই পাঠানো হয়েছে" : "সতর্কতা notice পাঠান"}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold shadow-sm ring-1 transition",
                      wasSent
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200 cursor-default"
                        : isSending
                        ? "bg-slate-100 text-slate-500 ring-slate-200 cursor-wait"
                        : "bg-gradient-to-br from-rose-500 to-pink-600 text-white ring-rose-300 hover:from-rose-600 hover:to-pink-700",
                    )}
                  >
                    {wasSent ? <CheckCircle2 className="h-3.5 w-3.5" /> : isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                    {wasSent ? "পাঠানো" : isSending ? "…" : "Notice"}
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}
    </>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number | string; tone: "emerald" | "amber" | "rose" | "fuchsia" }) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200",
    fuchsia: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
  } as const;
  return (
    <div className={cn("rounded-lg px-1.5 py-1 ring-1 text-center min-w-[36px]", map[tone])}>
      <p className="text-[9px] font-bold opacity-70">{label}</p>
      <p className="bn-display text-xs leading-tight">{value}</p>
    </div>
  );
}
