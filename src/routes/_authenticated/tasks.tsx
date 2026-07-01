import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ListChecks, ExternalLink, ThumbsUp, MessageCircle, Share2, Eye,
  Sparkles, Lock, CheckCircle2, Clock, Loader2, Coins, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
};

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

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const [{ data: t }, { data: s }, { data: up }, { data: prof }] = await Promise.all([
        supabase.from("link_tasks").select("*").eq("active", true).order("created_at", { ascending: false }),
        supabase.from("task_submissions").select("task_id,status,created_at").eq("user_id", u.user.id)
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("user_packages").select("id").eq("user_id", u.user.id).eq("status", "active").limit(1),
        supabase.from("profiles").select("email_verified").eq("id", u.user.id).maybeSingle(),
      ]);
      setTasks((t ?? []) as Task[]);
      setSubs((s ?? []) as Submission[]);
      setHasActivePkg((up ?? []).length > 0);
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

  const filtered = (tasks ?? []).filter((t) =>
    filter === "all" ? true : t.action_type === filter
  );

  async function handleDoTask(task: Task) {
    if (!userId) return;
    void emailVerified;
    if (hasActivePkg === false) {
      toast.error("টাস্ক করতে হলে একটি active প্যাকেজ লাগবে");
      return;
    }
    window.open(task.link_url, "_blank", "noopener,noreferrer");
    setSubmittingId(task.id);
    const tId = toast.loading("সাবমিট করা হচ্ছে…");
    try {
      const { error } = await supabase.from("task_submissions").insert({
        task_id: task.id,
        user_id: userId,
        status: "pending",
      });
      if (error) throw error;
      toast.success("টাস্ক জমা — রিভিউ-এর অপেক্ষায়", { id: tId });
      const { data: s } = await supabase.from("task_submissions").select("task_id,status,created_at")
        .eq("user_id", userId)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      setSubs((s ?? []) as Submission[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "সাবমিট ব্যর্থ", { id: tId });
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
                      disabled={submittingId === task.id || hasActivePkg === false}
                      onClick={() => handleDoTask(task)}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-md transition",
                        "bg-gradient-to-br", meta.from, meta.to,
                        "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]",
                      )}
                    >
                      {submittingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      টাস্ক করুন
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
