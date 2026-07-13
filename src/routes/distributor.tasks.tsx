import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ListChecks, Sparkles, ExternalLink, Check, Trash2, RefreshCw,
  Send, BookOpen, X, Users, Loader2, Settings2,
} from "lucide-react";
import { AdminPageHeader, StatTile, AdminCard } from "@/components/admin/AdminUI";
import { useServerFn } from "@tanstack/react-start";
import {
  generateDistributorTasks, listDistributorTasks, verifyDistributorTask,
  deleteAndRegenerateTask, deleteDistributorTask, publishDistributorTask,
  getReferredActiveUsers, updateDailyTaskLimit,
} from "@/lib/distributor-tasks.functions";
import { getMyDistributorBundle } from "@/lib/admin-client";

export const Route = createFileRoute("/distributor/tasks")({
  head: () => ({ meta: [{ title: "Task Management — Distributor" }] }),
  component: DistTasksPage,
});

type Task = {
  id: string;
  title: string;
  fb_page_url: string;
  action_type: string;
  reward: number;
  instruction: string | null;
  status: string;
  created_at: string;
};

const ACTION_BN: Record<string, string> = { like: "লাইক", comment: "কমেন্ট", share: "শেয়ার", follow: "ফলো" };
const STATUS_BN: Record<string, string> = { draft: "খসড়া", verified: "যাচাইকৃত", published: "প্রকাশিত", rejected: "বাতিল" };
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  verified: "bg-sky-100 text-sky-800",
  published: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

function DistTasksPage() {
  const genFn = useServerFn(generateDistributorTasks);
  const listFn = useServerFn(listDistributorTasks);
  const verifyFn = useServerFn(verifyDistributorTask);
  const regenFn = useServerFn(deleteAndRegenerateTask);
  const delFn = useServerFn(deleteDistributorTask);
  const pubFn = useServerFn(publishDistributorTask);
  const usersFn = useServerFn(getReferredActiveUsers);
  const limitFn = useServerFn(updateDailyTaskLimit);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [reward, setReward] = useState(2);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [activeUsers, setActiveUsers] = useState<{ total: number; active: Array<{ id: string; user_code: string }> }>({ total: 0, active: [] });
  const [showManual, setShowManual] = useState(false);
  const [tab, setTab] = useState<"all" | "draft" | "verified" | "published">("all");

  const load = async () => {
    try {
      const [t, u, b] = await Promise.all([
        listFn({ data: { status: "" } }),
        usersFn({}),
        getMyDistributorBundle().catch(() => null),
      ]);
      setTasks(t as Task[]);
      setActiveUsers(u as { total: number; active: Array<{ id: string; user_code: string }> });
      const prof = (b as { profile?: { daily_task_limit?: number } } | null)?.profile;
      if (prof?.daily_task_limit) setDailyLimit(prof.daily_task_limit);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = tab === "all" ? tasks : tasks.filter((t) => t.status === tab);
  const stats = {
    draft: tasks.filter((t) => t.status === "draft").length,
    verified: tasks.filter((t) => t.status === "verified").length,
    published: tasks.filter((t) => t.status === "published").length,
  };

  async function handleGenerate() {
    setBusy("generate");
    try {
      await genFn({ data: { count: dailyLimit, keyword, reward } });
      toast.success(`${dailyLimit}টি নতুন task তৈরি হয়েছে`);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function handleVerify(id: string) {
    setBusy(id);
    try { await verifyFn({ data: { id } }); toast.success("যাচাই সম্পন্ন"); await load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function handleRegen(id: string) {
    setBusy(id);
    try { await regenFn({ data: { id, keyword, reward } }); toast.success("নতুন task generate হয়েছে"); await load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function handleDelete(id: string) {
    if (!confirm("এই task delete করবেন?")) return;
    setBusy(id);
    try { await delFn({ data: { id } }); toast.success("Deleted"); await load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function handlePublish(id: string) {
    setBusy(id);
    try { await pubFn({ data: { id } }); toast.success("Publish হয়েছে — user-রা এখন task পাবেন"); await load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function handleLimitSave() {
    try { await limitFn({ data: { limit: dailyLimit } }); toast.success("দৈনিক limit save হয়েছে"); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Task Management" subtitle="AI দিয়ে task generate করুন → যাচাই করুন → publish করুন" Icon={ListChecks} accent="fuchsia" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Active User" value={String(activeUsers.total)} Icon={Users} accent="emerald" />
        <StatTile label="খসড়া Task" value={String(stats.draft)} Icon={Sparkles} accent="amber" />
        <StatTile label="যাচাইকৃত" value={String(stats.verified)} Icon={Check} accent="sky" />
        <StatTile label="প্রকাশিত" value={String(stats.published)} Icon={Send} accent="fuchsia" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowManual(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:scale-[1.02] transition">
          <BookOpen className="h-4 w-4" /> Manual / নির্দেশিকা
        </button>
      </div>

      <AdminCard accent="fuchsia" className="p-5">
        <h3 className="bn-display text-lg text-slate-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-fuchsia-600" /> AI Task Generator
        </h3>
        <div className="mt-3 grid sm:grid-cols-4 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">Topic/Keyword (optional)</span>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="যেমন: Bangladesh food, news, cricket"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">প্রতি task reward (৳)</span>
            <input type="number" step="0.5" min={0.5} max={50} value={reward} onChange={(e) => setReward(Number(e.target.value) || 2)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">দৈনিক task সংখ্যা</span>
            <div className="mt-1 flex gap-1">
              <input type="number" min={1} max={20} value={dailyLimit} onChange={(e) => setDailyLimit(Math.min(20, Math.max(1, Number(e.target.value) || 5)))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500" />
              <button onClick={handleLimitSave} title="Save" className="grid place-items-center rounded-xl bg-slate-100 px-2 text-slate-700 hover:bg-slate-200">
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </label>
        </div>
        <button onClick={handleGenerate} disabled={busy === "generate"}
          className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
          {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {dailyLimit}টি Task Generate করুন
        </button>
      </AdminCard>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "draft", "verified", "published"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={"shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition " +
              (tab === k ? "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
            {k === "all" ? "সব" : STATUS_BN[k]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="grid place-items-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            কোনো task নেই — উপরে "Generate" বাটন চাপুন
          </div>
        ) : filtered.map((t) => (
          <div key={t.id} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + (STATUS_COLOR[t.status] || "bg-slate-100 text-slate-700")}>{STATUS_BN[t.status] || t.status}</span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{ACTION_BN[t.action_type] || t.action_type}</span>
                  <span className="text-[11px] font-bold text-emerald-600">৳{Number(t.reward).toFixed(2)}</span>
                </div>
                <p className="mt-1.5 bn-display text-sm text-slate-900 truncate">{t.title}</p>
                <a href={t.fb_page_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-sky-700 hover:underline truncate max-w-full">
                  <ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{t.fb_page_url}</span>
                </a>
                {t.instruction && <p className="mt-2 whitespace-pre-line text-[11px] text-slate-600 line-clamp-3">{t.instruction}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.status === "draft" && (
                <>
                  <a href={t.fb_page_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-200">
                    <ExternalLink className="h-3 w-3" /> Page চেক করুন
                  </a>
                  <button onClick={() => handleVerify(t.id)} disabled={busy === t.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-200 disabled:opacity-50">
                    <Check className="h-3 w-3" /> যাচাই সম্পন্ন
                  </button>
                  <button onClick={() => handleRegen(t.id)} disabled={busy === t.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200 disabled:opacity-50">
                    <RefreshCw className={"h-3 w-3 " + (busy === t.id ? "animate-spin" : "")} /> Regenerate
                  </button>
                </>
              )}
              {t.status === "verified" && (
                <button onClick={() => handlePublish(t.id)} disabled={busy === t.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 px-3 py-1 text-[11px] font-bold text-white hover:brightness-110 disabled:opacity-50">
                  <Send className="h-3 w-3" /> User-দের কাছে Publish
                </button>
              )}
              <button onClick={() => handleDelete(t.id)} disabled={busy === t.id}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-200 disabled:opacity-50">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
    </div>
  );
}

function ManualModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white/95 px-5 py-3 backdrop-blur">
          <h3 className="bn-display text-xl text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-600" /> Distributor Task Manual
          </h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <Section title="১. Task Generate করা">
            <p>প্রথমে "Topic/Keyword" ঘরে একটি বিষয় লিখুন (যেমন "Bangladesh food", "cricket", "news") — খালি রাখলেও চলবে। এরপর প্রতি task-এ কত টাকা reward দিবেন সেটি সিলেক্ট করুন। "দৈনিক task সংখ্যা" দিয়ে ঠিক করুন প্রতিদিন কতগুলো task আপনার user-দের দেবেন (৩ / ৫ / ১০ / ১৫)।</p>
            <p>"Generate করুন" বাটনে ক্লিক করলে AI সেই সংখ্যার Facebook page task তৈরি করে দেবে (খসড়া হিসেবে)।</p>
          </Section>
          <Section title="২. Manual যাচাই (সবচেয়ে গুরুত্বপূর্ণ)">
            <p>প্রতিটি খসড়া task-এর "Page চেক করুন" বাটনে ক্লিক করে Facebook page-টি আসলেই আছে কিনা যাচাই করুন:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>যদি page live থাকে এবং interaction (like/comment/share) করা সম্ভব হয় → <b>"যাচাই সম্পন্ন"</b> বাটনে ক্লিক করুন</li>
              <li>যদি page বন্ধ / delete / restrict থাকে → <b>"Regenerate"</b> বাটনে ক্লিক করুন — AI একটি নতুন task দিয়ে replace করবে</li>
            </ul>
          </Section>
          <Section title="৩. Publish করা">
            <p>যাচাইকৃত (verified) task-এ "User-দের কাছে Publish" বাটন আসবে। ক্লিক করলে সেই task আপনার under-এ থাকা active user-দের daily task pool-এ চলে যাবে। তারা task complete করলে admin verify করে reward দেবে।</p>
          </Section>
          <Section title="৪. আপনার কমিশন">
            <p>আপনার under-এ যে user-রা আছেন, তারা যখন withdraw দেবেন, তখন তাদের ২% service fee (উইথড্র ট্যাক্স) automatic আপনার balance-এ যোগ হবে। এটি "কমিশন ও আয়" section-এ আলাদা করে দেখাবে।</p>
          </Section>
          <Section title="৫. Lead CRM">
            <p>"লিড / CRM" section-এ potential user-দের নাম, ফোন, source track করুন। তাদের follow-up করে account খুলিয়ে দিন। প্রতিটি successful conversion আপনার referral commission বাড়াবে।</p>
          </Section>
          <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 text-xs text-amber-900">
            <b>⚠️ সতর্কতা:</b> AI generate করা page গুলো সবসময় সঠিক হবে না — তাই manual যাচাই বাধ্যতামূলক। ভুল page publish করলে user-দের কাজ reject হবে এবং আপনার rating কমে যাবে।
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="bn-display text-base text-slate-900">{title}</h4>
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}
