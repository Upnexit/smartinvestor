import { AdWatchTaskCard } from "@/components/panel/AdWatchTaskCard";
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
  head: () => ({ meta: [{ title: "আজকের টাস্ক — Smart Click BD" }] }),
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

type Submission = {
  task_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reward: number;
};

type RawSubmission = Omit<Submission, "reward"> & {
  reward?: number | null;
  link_tasks?: { reward?: number | null } | Array<{ reward?: number | null }> | null;
};

function normalizeSubmissions(rows: RawSubmission[] | null | undefined): Submission[] {
  return (rows ?? []).map((row) => {
    const linked = Array.isArray(row.link_tasks) ? row.link_tasks[0] : row.link_tasks;
    return {
      task_id: row.task_id,
      status: row.status,
      created_at: row.created_at,
      reward: Number(row.reward ?? linked?.reward ?? 0),
    };
  });
}

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
        supabase.from("task_submissions").select("task_id,status,created_at,link_tasks(reward)").eq("user_id", u.user.id)
          .gte("created_at", startOfTodayBDISO()),
        supabase.from("user_packages").select("package_id, packages(name,daily_tasks)").eq("user_id", u.user.id).eq("status", "active"),
        supabase.from("profiles").select("email_verified").eq("id", u.user.id).maybeSingle(),
      ]);
      const activePackages = (up ?? []) as ActivePackage[];
      const activePkgIds = activePackages.map((r) => r.package_id);
      const activePkgIdSet = new Set(activePkgIds);
      const todaySubs = normalizeSubmissions(s as RawSubmission[] | null);
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
      const submittedTaskIds = new Set(todaySubs
        .filter((sub) => sub.status !== "rejected")
        .map((sub) => sub.task_id));
      const allTasks = ((t ?? []) as Task[])
        .filter((task) => !task.is_draft)
        // Extra safety: exclude any task the user already has a non-rejected submission for
        .filter((task) => !submittedTaskIds.has(task.id));
      // Admin panel থেকে আজ যে package task active করা হয়েছে, user panel-এ সেটাই দেখাও।
      // hardcoded Crazy=5 বা package daily_tasks দিয়ে list কেটে দিলে 10 task → 5 task bug হয়।
      const packageSpecific = allTasks.filter((task) => task.required_package_id && activePkgIdSet.has(task.required_package_id));
      const globalTasks = allTasks.filter((task) => task.required_package_id === null);
      const todaysTasks = [...packageSpecific, ...globalTasks];
      setTasks(todaysTasks);
      setSubs(todaySubs);
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
    .reduce((acc, s) => acc + Number(s.reward || 0), 0);

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
      const { data: s } = await supabase.from("task_submissions").select("task_id,status,created_at,link_tasks(reward)")
        .eq("user_id", userId)
        .gte("created_at", startOfTodayBDISO());
      setSubs(normalizeSubmissions(s as RawSubmission[] | null));
      setTasks((current) => current?.filter((task) => task.id !== activeTask.id) ?? current);
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
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">DAILY AD REWARDS</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">বিজ্ঞাপন দেখে প্রতিদিন আয় 🎯</h1>
        <p className="mt-1 text-sm text-slate-600">কোনো ইনভেস্ট ছাড়া ৫০টি বিজ্ঞাপন দেখুন এবং সরাসরি আপনার অ্যাকাউন্টে ব্যালেন্স যোগ করুন।</p>
      </div>

      {/* Main Rewarded Ad Watch Section */}
      <AdWatchTaskCard />
    </div>
  );
}
