import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ListChecks, ExternalLink, ThumbsUp, MessageCircle, Share2, Eye,
  Sparkles, Lock, CheckCircle2, Clock, Loader2, Coins, Filter, X, CheckCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { startOfTodayBDISO, todayBD } from "@/lib/bd-time";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "আজকের টাস্ক — Smart Investor" }] }),
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  description: string | null;
  link_url: string;
  action_type: string;
  category: string | null;
  reward: number;
  daily_limit: number;
  required_package_id: string | null;
  scheduled_date?: string | null;
  is_draft?: boolean;
};

type ActivePackage = { package_id: string; packages?: { name?: string | null; daily_tasks?: number | null } | null };

function quotaForPackage(pkg: ActivePackage) {
  // Admin-এর সেট করা daily_tasks কে সর্বোচ্চ priority দাও — যাতে admin ১০টা দিলে ১০টাই যায়।
  const dbLimit = Number(pkg.packages?.daily_tasks);
  if (Number.isFinite(dbLimit) && dbLimit > 0) return Math.floor(dbLimit);
  // Fallback (পুরনো প্যাকেজ যেখানে daily_tasks সেট নেই)
  return (pkg.packages?.name ?? "").toLowerCase().includes("crazy") ? 5 : 10;
}

type Submission = {
  task_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const ACTION_META: Record<string, { icon: typeof ThumbsUp; label: string; from: string; to: string }> = {
  like:    { icon: ThumbsUp,     label: "Like",    from: "from-sky-400",     to: "to-blue-500" },
  comment: { icon: MessageCircle,label: "Comment", from: "from-fuchsia-400", to: "to-purple-600" },
  share:   { icon: Share2,       label: "Share",   from: "from-emerald-400", to: "to-teal-600" },
  view:    { icon: Eye,          label: "View",    from: "from-amber-400",   to: "to-orange-500" },
};

function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [hasActivePkg, setHasActivePkg] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [linkOpened, setLinkOpened] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const [{ data: s }, { data: up }, { data: prof }] = await Promise.all([
        supabase.from("task_submissions").select("task_id,status,created_at").eq("user_id", u.user.id)
          .gte("created_at", startOfTodayBDISO()),
        supabase.from("user_packages").select("package_id, packages(name,daily_tasks)").eq("user_id", u.user.id).eq("status", "active"),
        supabase.from("profiles").select("email_verified").eq("id", u.user.id).maybeSingle(),
      ]);
      const activePackages = (up ?? []) as ActivePackage[];
      const activePkgIds = activePackages.map((r) => r.package_id);
      setHasActivePkg(activePkgIds.length > 0);
      // Fetch tasks: শুধু আজকের scheduled_date (BD) — পুরনো দিনের active task দেখালে
      // user সেগুলো submit করতে গিয়ে UNIQUE(user_id, task_id) constraint hit করত।
      const today = todayBD();
      let tq = supabase.from("link_tasks").select("*")
        .eq("active", true)
        .eq("scheduled_date", today)
        .order("created_at", { ascending: false });
      if (activePkgIds.length > 0) {
        const list = activePkgIds.map((id) => `"${id}"`).join(",");
        tq = tq.or(`required_package_id.is.null,required_package_id.in.(${list})`);
      } else {
        tq = tq.is("required_package_id", null);
      }
      const { data: t } = await tq;
      const submittedTaskIds = new Set(((s ?? []) as Submission[])
        .filter((sub) => sub.status !== "rejected")
        .map((sub) => sub.task_id));
      const allTasks = ((t ?? []) as Task[])
        .filter((task) => !task.is_draft)
        // Extra safety: exclude any task the user already has a non-rejected submission for
        .filter((task) => !submittedTaskIds.has(task.id));
      const preferredPackage = activePackages
        .slice()
        .sort((a, b) => quotaForPackage(b) - quotaForPackage(a))[0];
      const quota = preferredPackage ? quotaForPackage(preferredPackage) : 0;
      const packageSpecific = preferredPackage
        ? allTasks.filter((task) => task.required_package_id === preferredPackage.package_id)
        : [];
      const globalTasks = allTasks.filter((task) => task.required_package_id === null);
      const todaysTasks = [...packageSpecific, ...globalTasks].slice(0, quota || undefined);
      setTasks(todaysTasks);
      setSubs((s ?? []) as Submission[]);
      setEmailVerified(!!prof?.email_verified);
    })();
  }, []);

  const subMap = useMemo(() => {
    const m = new Map<string, Submission>();
    subs.forEach((s) => m.set(s.task_id, s));
    return m;
  }, [subs]);

  const completedCount = subs.filter((s) => s.status !== "rejected").length;
  const totalEarnedToday = subs.filter((s) => s.status === "approved")
    .reduce((acc, s) => {
      const t = tasks?.find((x) => x.id === s.task_id);
      return acc + (t ? Number(t.reward) : 0);
    }, 0);

  const filtered = (tasks ?? []).filter((t) => {
    // যেকোনো task যা আজ অলরেডি submit করা হয়েছে (approved বা pending) — list থেকে সরিয়ে দাও।
    // শুধু rejected হলে আবার চেষ্টা করার সুযোগ থাকবে।
    const sub = subMap.get(t.id);
    if (sub && sub.status !== "rejected") return false;
    return filter === "all" ? true : t.action_type === filter;
  });

  function openTask(task: Task) {
    if (hasActivePkg === false) {
      toast.error("টাস্ক করতে হলে একটি active প্যাকেজ লাগবে");
      return;
    }
    const existing = subMap.get(task.id);
    if (existing && existing.status !== "rejected") {
      toast.info("এই টাস্কটি আজ ইতিমধ্যেই সম্পন্ন হয়েছে");
      return;
    }
    setActiveTask(task);
    setLinkOpened(false);
  }

  function openTaskLink() {
    // The <a target="_blank"> handles the actual navigation — never blocked.
    // We only track that the user clicked so the countdown/Submit unlocks.
    setLinkOpened(true);
  }

  async function submitActiveTask() {
    if (!userId || !activeTask) return;
    void emailVerified;
    setSubmittingId(activeTask.id);
    const tId = toast.loading("সাবমিট করা হচ্ছে…");
    try {
      const { error } = await supabase.from("task_submissions").insert({
        task_id: activeTask.id,
        user_id: userId,
        status: "approved",
      });
      if (error) throw error;
      toast.success(`৳${Number(activeTask.reward).toFixed(0)} আপনার ব্যালেন্সে যোগ হয়েছে 🎉`, { id: tId });
      const { data: s } = await supabase.from("task_submissions").select("task_id,status,created_at")
        .eq("user_id", userId)
        .gte("created_at", startOfTodayBDISO());
      setSubs((s ?? []) as Submission[]);
      setActiveTask(null);
      setLinkOpened(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      let msg = raw;
      if (/duplicate key|unique|23505/i.test(raw)) msg = "এই টাস্কটি আপনি আগেই সম্পন্ন করেছেন";
      else if (/row-level security|permission denied|42501/i.test(raw)) msg = "অনুমতি নেই — আবার লগইন করুন";
      else if (/active প্যাকেজ/.test(raw)) msg = "টাস্ক করতে হলে একটি active প্যাকেজ লাগবে";
      else if (/দৈনিক টাস্ক লিমিট/.test(raw)) msg = raw;
      else if (/আজ ইতিমধ্যেই/.test(raw)) msg = raw;
      else if (!raw || raw === "{}") msg = "সাবমিট ব্যর্থ — আবার চেষ্টা করুন";
      toast.error(msg, { id: tId });
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">DAILY TASKS</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">আজকের টাস্ক 🎯</h1>
        <p className="mt-1 text-sm text-slate-600">প্রতিটি টাস্ক সম্পন্ন করে দৈনিক আয় বাড়ান।</p>
      </div>

      {/* Summary — gradient tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-4 text-white shadow-lg ring-1 ring-white/20">
          <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
          <ListChecks className="h-5 w-5 opacity-90" />
          <p className="bn-display mt-2 text-2xl drop-shadow">{completedCount}</p>
          <p className="text-[11px] text-white/85">আজ সম্পন্ন</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-green-600 p-4 text-white shadow-lg ring-1 ring-white/20">
          <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
          <Coins className="h-5 w-5 opacity-90" />
          <p className="bn-display mt-2 text-2xl drop-shadow">৳{totalEarnedToday.toFixed(0)}</p>
          <p className="text-[11px] text-white/85">আজ আয়</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-4 text-white shadow-lg ring-1 ring-white/20">
          <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
          <Sparkles className="h-5 w-5 opacity-90" />
          <p className="bn-display mt-2 text-2xl drop-shadow">{tasks?.length ?? 0}</p>
          <p className="text-[11px] text-white/85">মোট টাস্ক</p>
        </div>
      </div>

      {hasActivePkg === false && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <Lock className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">কোন active প্যাকেজ নেই</p>
            <p className="mt-0.5 text-xs">টাস্ক করতে হলে একটি প্যাকেজ ক্রয় করুন।</p>
          </div>
          <Link to="/packages" className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">প্যাকেজ দেখুন</Link>
        </div>
      )}

      {/* Filter chips — colorful gradients */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 shrink-0 text-slate-500" />
        {["all", "like", "comment", "share", "view"].map((f) => {
          const meta = ACTION_META[f];
          const sel = filter === f;
          const grad = f === "all"
            ? "from-slate-700 to-slate-900"
            : `${meta.from} ${meta.to}`;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                sel
                  ? cn("bg-gradient-to-r text-white shadow-md scale-105", grad)
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:-translate-y-0.5",
              )}
            >
              {f === "all" ? "সব" : meta.label}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {!tasks ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-slate-300" />
          <p className="bn-display mt-2 text-base text-slate-700">কোনো টাস্ক নেই</p>
          <p className="mt-1 text-xs text-slate-500">পরে আবার চেক করুন।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const meta = ACTION_META[task.action_type] ?? ACTION_META.like;
            const sub = subMap.get(task.id);
            const done = sub?.status === "approved";
            const pending = sub?.status === "pending";
            const Icon = meta.icon;
            return (
              <div
                key={task.id}
                className={cn(
                  "rounded-2xl bg-white ring-1 p-4 shadow-soft transition",
                  done ? "ring-emerald-200 bg-emerald-50/40"
                       : pending ? "ring-amber-200 bg-amber-50/30"
                       : "ring-slate-200 hover:ring-slate-300",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md", meta.from, meta.to)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">{meta.label}</span>
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">+৳{task.reward}</span>
                    </div>
                    <h3 className="bn-display mt-1 text-base text-slate-900 leading-snug truncate">{task.title}</h3>
                    {task.description && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {done ? (
                    <div className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> অনুমোদিত (+৳{task.reward})
                    </div>
                  ) : pending ? (
                    <div className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">
                      <Clock className="h-4 w-4" /> রিভিউ-এর অপেক্ষায়
                    </div>
                  ) : (
                    <button
                      disabled={hasActivePkg === false}
                      onClick={() => openTask(task)}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-md transition",
                        "bg-gradient-to-br", meta.from, meta.to,
                        "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]",
                      )}
                    >
                      <ExternalLink className="h-4 w-4" />
                      বিস্তারিত ও শুরু করুন
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          linkOpened={linkOpened}
          submitting={submittingId === activeTask.id}
          onOpenLink={openTaskLink}
          onSubmit={submitActiveTask}
          onClose={() => { setActiveTask(null); setLinkOpened(false); }}
        />
      )}
    </div>
  );
}

function parseSteps(description: string | null): string[] {
  if (!description) return [];
  const raw = description
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(?:\d+[\.\)]|[-•*])\s*/, "").trim())
    .filter(Boolean);
  return raw.length ? raw : [description.trim()];
}

function TaskDetailModal({
  task, linkOpened, submitting, onOpenLink, onSubmit, onClose,
}: {
  task: Task;
  linkOpened: boolean;
  submitting: boolean;
  onOpenLink: () => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const meta = ACTION_META[task.action_type] ?? ACTION_META.like;
  const Icon = meta.icon;
  const steps = parseSteps(task.description);
  const WAIT_SECONDS = 10;      // return-এর পর tab-এ থাকতে হবে
  const MIN_AWAY_MS = 5000;     // লিংকে ন্যূনতম সময়
  const TAP_GUARD_MS = 800;     // return-এর সাথে সাথে accidental tap block
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);
  const [returned, setReturned] = useState(false);
  const [awayEnough, setAwayEnough] = useState(false);
  const [tapGuard, setTapGuard] = useState(false);
  const hiddenAtRef = useRef<number | null>(null);

  // Countdown শুধু tab visible + returned থাকা অবস্থায় ticks করে
  useEffect(() => {
    if (!linkOpened || !returned) return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [linkOpened, returned, secondsLeft]);

  // Reset যখন নতুন task খোলা হয়
  useEffect(() => {
    if (!linkOpened) {
      setSecondsLeft(WAIT_SECONDS);
      setReturned(false);
      setAwayEnough(false);
      setTapGuard(false);
      hiddenAtRef.current = null;
    }
  }, [linkOpened]);

  // Visibility tracking + title flash
  useEffect(() => {
    if (!linkOpened) return;
    const originalTitle = document.title;
    let flashId: ReturnType<typeof setInterval> | null = null;
    let toggle = false;
    const startFlash = () => {
      if (flashId) return;
      flashId = setInterval(() => {
        toggle = !toggle;
        document.title = toggle ? "👉 Submit করুন!" : originalTitle;
      }, 800);
    };
    const stopFlash = () => {
      if (flashId) { clearInterval(flashId); flashId = null; }
      document.title = originalTitle;
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        startFlash();
        setReturned(false);
        hiddenAtRef.current = Date.now();
      } else {
        stopFlash();
        const awayMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
        if (awayMs >= MIN_AWAY_MS) {
          setAwayEnough(true);
          setReturned(true);
          setSecondsLeft(WAIT_SECONDS); // ফিরে এসে fresh countdown
          setTapGuard(true);
          setTimeout(() => setTapGuard(false), TAP_GUARD_MS);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    startFlash();
    return () => { document.removeEventListener("visibilitychange", onVis); stopFlash(); };
  }, [linkOpened]);

  const canSubmit = linkOpened && returned && awayEnough && secondsLeft <= 0 && !tapGuard;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className={cn("relative bg-gradient-to-br px-5 pt-5 pb-6 text-white", meta.from, meta.to)}>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
            aria-label="বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/25 backdrop-blur ring-1 ring-white/40">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <span className="rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {meta.label} · +৳{task.reward}
              </span>
              <h2 className="bn-display mt-1 text-lg leading-snug">{task.title}</h2>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 pb-32 sm:pb-24">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">কাজের নির্দেশনা</p>
          <h3 className="bn-display mt-1 text-base text-slate-900">ধাপে ধাপে অনুসরণ করুন</h3>

          <ol className="mt-4 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow",
                  meta.from, meta.to,
                )}>
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-slate-800">{s}</p>
              </li>
            ))}
          </ol>

          {/* Open link — real <a> tag so browsers never block on first click */}
          <a
            href={task.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpenLink}
            onAuxClick={onOpenLink}
            className={cn(
              "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br px-5 py-4 text-base font-bold text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.99]",
              meta.from, meta.to,
            )}
          >
            <ExternalLink className="h-5 w-5" />
            {linkOpened ? "আবার লিংক খুলুন" : "লিংকে যান ও কাজ শুরু করুন"}
          </a>

          {linkOpened && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              ✓ লিংক খোলা হয়েছে। সমস্ত কাজ (Like/Comment/Follow) সম্পন্ন করে এই tab-এ ফিরে এসে নিচের সবুজ Submit বাটনে ক্লিক করুন।
              {returned && <div className="mt-1 font-bold">👋 স্বাগতম! এবার নিচের Submit বাটনে ক্লিক করুন।</div>}
            </div>
          )}
        </div>

        {/* Sticky floating submit panel */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
          <div className={cn(
            "pointer-events-auto w-full sm:max-w-lg rounded-2xl bg-white/95 backdrop-blur border shadow-2xl p-3 transition",
            canSubmit && returned ? "border-emerald-400 ring-4 ring-emerald-200 animate-pulse" : "border-slate-200",
          )}>
            <p className="text-center text-[11px] font-semibold text-slate-600">
              {!linkOpened
                ? "প্রথমে উপরের লিংকে যান ও কাজ সম্পন্ন করুন"
                : !returned
                  ? "⏳ লিংকে কাজ সম্পন্ন করে এই tab-এ ফিরে আসুন"
                  : !awayEnough
                    ? "⚠️ লিংকে অন্তত ৫ সেকেন্ড সময় নিয়ে কাজ করুন, তারপর ফিরে আসুন"
                    : secondsLeft > 0
                      ? `⏳ যাচাই চলছে — ${secondsLeft} সেকেন্ড পর Submit unlock হবে`
                      : "✓ এবার Submit বাটনে ক্লিক করুন"}
            </p>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
              className={cn(
                "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition",
                canSubmit
                  ? "bg-gradient-to-br from-emerald-500 to-green-600 hover:scale-[1.01]"
                  : "bg-slate-300 cursor-not-allowed",
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              {submitting
                ? "সাবমিট হচ্ছে…"
                : secondsLeft > 0 && linkOpened
                  ? `${secondsLeft}s অপেক্ষা করুন…`
                  : `কাজ সম্পন্ন — Submit করুন (+৳${task.reward})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
