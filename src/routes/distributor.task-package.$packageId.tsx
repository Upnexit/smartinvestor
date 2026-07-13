import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Loader2, Trash2, ExternalLink, CheckCircle2, Circle,
  Pencil, Save, X, Calendar as CalendarIcon, RefreshCw, Users, Info, Lock,
} from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, StatTile, Shimmer, EmptyState } from "@/components/admin/AdminUI";
import { useServerFn } from "@tanstack/react-start";
import { generateFbLinkTasks, type GeneratedTask } from "@/lib/admin-tasks.functions";
import {
  listPackageTasksForDistributor, distributorBulkInsertPackageTasks,
  distributorActivateOwnDrafts, distributorUpdateOwnLinkTask,
  distributorDeleteOwnLinkTask, distributorDeleteOwnDrafts,
} from "@/lib/distributor-package-tasks.functions";
import { cn } from "@/lib/utils";
import { todayBD } from "@/lib/bd-time";

export const Route = createFileRoute("/distributor/task-package/$packageId")({
  head: () => ({ meta: [{ title: "প্যাকেজ টাস্ক — Distributor" }] }),
  component: DistPackageTasksPage,
});

// Distributor can only create like/follow tasks. share/comment are admin-only.
const DIST_ACTIONS: GeneratedTask["action_type"][] = ["like", "follow"];
const ADMIN_ONLY_ACTIONS: GeneratedTask["action_type"][] = ["share", "comment"];

type Pkg = { id: string; name: string; price: number; daily_tasks: number | null; daily_income: number | null; duration_days: number | null; active: boolean };
type Task = {
  id: string; title: string; link_url: string; reward: number;
  action_type: string; category: string | null; daily_limit: number;
  active: boolean; is_draft: boolean; scheduled_date: string | null;
  description: string | null; required_package_id: string | null;
  created_by_distributor: string | null;
};

function DistPackageTasksPage() {
  const { packageId } = useParams({ from: "/distributor/task-package/$packageId" });
  const listFn = useServerFn(listPackageTasksForDistributor);
  const bulkFn = useServerFn(distributorBulkInsertPackageTasks);
  const activateFn = useServerFn(distributorActivateOwnDrafts);
  const updateFn = useServerFn(distributorUpdateOwnLinkTask);
  const deleteFn = useServerFn(distributorDeleteOwnLinkTask);
  const deleteDraftsFn = useServerFn(distributorDeleteOwnDrafts);
  const genFn = useServerFn(generateFbLinkTasks);

  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [me, setMe] = useState<string>("");
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [date, setDate] = useState(todayBD());
  const [count, setCount] = useState(10);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedActions, setSelectedActions] = useState<GeneratedTask["action_type"][]>(["like", "follow"]);
  const [genBusy, setGenBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [edit, setEdit] = useState<Task | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const r = await listFn({ data: { packageId, date } }) as { pkg: Pkg | null; tasks: Task[]; activeUserCount: number; userId: string };
      setPkg(r.pkg);
      setTasks(r.tasks);
      setActiveUserCount(r.activeUserCount);
      setMe(r.userId);
      if (r.pkg && !totalAmount) setTotalAmount(Number(r.pkg.daily_income ?? 0));
    } catch (e) { toast.error((e as Error).message); }
  }, [packageId, date, listFn, totalAmount]);

  useEffect(() => { load(); }, [load]);

  const daily = pkg?.daily_tasks ?? 0;
  const perTaskReward = useMemo(() => {
    const n = Math.max(1, Math.min(200, count));
    if (totalAmount > 0) return Math.round((totalAmount / n) * 100) / 100;
    if (!pkg || !daily) return 0;
    return Math.round(((pkg.daily_income ?? 0) / daily) * 100) / 100;
  }, [pkg, daily, totalAmount, count]);

  const myTasks = (tasks ?? []).filter((t) => t.created_by_distributor === me);
  const draftCount = myTasks.filter((t) => t.is_draft).length;
  const activeCount = myTasks.filter((t) => !t.is_draft && t.active).length;
  const adminCount = (tasks ?? []).filter((t) => !t.created_by_distributor).length;

  const runGenerate = async () => {
    if (!pkg) return;
    const n = Math.max(1, Math.min(200, count));
    setGenBusy(true);
    const tId = toast.loading(`AI ${n}টি Facebook link তৈরি করছে…`);
    try {
      const existingUrls = (tasks ?? []).map((t) => t.link_url).filter(Boolean);
      const res = await genFn({ data: { count: n, actions: selectedActions.length ? selectedActions : ["like"], existingUrls } });
      const rows = res.tasks.map((g) => ({
        title: g.title, link_url: g.url, action_type: g.action_type, description: g.description,
      }));
      await bulkFn({ data: { packageId, date, tasks: rows, perReward: perTaskReward || 2 } });
      toast.success(`${rows.length}টি draft task যোগ হয়েছে (${res.source})`, { id: tId });
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id: tId }); }
    finally { setGenBusy(false); }
  };

  const activateBatch = async () => {
    setBatchBusy(true);
    try {
      const r = await activateFn({ data: { packageId, date } });
      if (r.activated === 0) toast.info("কোনো draft নেই");
      else toast.success(`${r.activated}টি task active হলো`);
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBatchBusy(false); }
  };

  const deleteOne = async (t: Task) => {
    if (!confirm("এই Facebook page-টি load হচ্ছে না / বন্ধ? Delete করলে সঙ্গে সঙ্গে একই মূল্যের নতুন link auto-generate হয়ে যাবে।")) return;
    const tId = toast.loading("পুরনো task delete + নতুন AI link তৈরি হচ্ছে…");
    try {
      await deleteFn({ data: { id: t.id } });
      // auto-generate 1 replacement of same reward + action_type
      try {
        const existingUrls = (tasks ?? []).filter((x) => x.id !== t.id).map((x) => x.link_url).filter(Boolean);
        const action = (DIST_ACTIONS as string[]).includes(t.action_type)
          ? (t.action_type as GeneratedTask["action_type"])
          : "like";
        const res = await genFn({ data: { count: 1, actions: [action], existingUrls } });
        const rows = res.tasks.map((g) => ({
          title: g.title, link_url: g.url, action_type: g.action_type, description: g.description,
        }));
        if (rows.length) {
          await bulkFn({ data: { packageId, date, tasks: rows, perReward: Number(t.reward) || perTaskReward || 2 } });
          toast.success("Delete হয়েছে + নতুন link auto-generate হয়েছে", { id: tId });
        } else {
          toast.success("Delete হয়েছে (নতুন link পাওয়া যায়নি)", { id: tId });
        }
      } catch (ge) {
        toast.warning(`Delete হয়েছে — replacement তৈরি ব্যর্থ: ${(ge as Error).message}`, { id: tId });
      }
      load();
    } catch (e) { toast.error((e as Error).message, { id: tId }); }
  };
  const toggleOne = async (t: Task) => {
    try {
      const patch = t.is_draft ? { is_draft: false, active: true } : { active: !t.active };
      await updateFn({ data: { id: t.id, patch } });
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  const saveEdit = async () => {
    if (!edit) return;
    try {
      await updateFn({ data: { id: edit.id, patch: { title: edit.title, link_url: edit.link_url, reward: edit.reward, action_type: edit.action_type } } });
      toast.success("সেভ"); setEdit(null); load();
    } catch (e) { toast.error((e as Error).message); }
  };
  const deleteAllDrafts = async () => {
    if (!confirm(`${date} তারিখের আমার সব draft মুছবেন?`)) return;
    try { await deleteDraftsFn({ data: { packageId, date } }); toast.success("Draft clear"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Link to="/distributor/tasks" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> সব টাস্ক
        </Link>
      </div>

      <AdminPageHeader accent="fuchsia" Icon={Sparkles}
        title={pkg ? `${pkg.name} — টাস্ক ম্যানেজ` : "প্যাকেজ টাস্ক"}
        subtitle={pkg ? `৳${pkg.price} • দৈনিক ${daily}টি টাস্ক • প্রতি টাস্ক ৳${perTaskReward}` : "লোড হচ্ছে…"}
        action={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-xs outline-none" />
            </div>
            <SoftButton onClick={load}><RefreshCw className="h-3.5 w-3.5" /></SoftButton>
          </div>
        } />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatTile label="Active User" value={activeUserCount} accent="emerald" Icon={Users} />
        <StatTile label="দৈনিক লিমিট" value={daily} accent="indigo" Icon={Sparkles} />
        <StatTile label="আমার Draft" value={draftCount} accent="amber" Icon={Circle} />
        <StatTile label="আমার Active" value={activeCount} accent="emerald" Icon={CheckCircle2} />
        <StatTile label="Admin Task" value={adminCount} accent="sky" Icon={Sparkles} />
      </div>

      <AdminCard accent="indigo" className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow-md">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm text-slate-700 leading-relaxed">
            <p className="bn-display text-base text-slate-900 mb-1">এই প্যাকেজে কীভাবে কাজ করবেন</p>
            <ol className="list-decimal pl-5 space-y-1 text-[13px]">
              <li><b>তারিখ</b> সিলেক্ট করুন (উপরে ডানদিকে) — শুধু ঐ দিনের task দেখাবে ও তৈরি হবে।</li>
              <li><b>কতটি task</b> ও <b>মোট Amount ৳</b> দিন — প্রতি task-এর reward নিজে নিজে ভাগ হয়ে যাবে।</li>
              <li><b>Action type</b> সিলেক্ট করুন — Distributor হিসেবে শুধু <b className="text-fuchsia-700">Like</b> ও <b className="text-fuchsia-700">Follow</b> allowed। <b>Share / Comment</b> শুধু Admin তৈরি করতে পারবেন।</li>
              <li>“AI দিয়ে Random FB Link তৈরি” চাপুন — verified 1M+ follower Facebook page থেকে link এসে <b>Draft</b> হিসেবে যোগ হবে।</li>
              <li>প্রতিটি link ক্লিক করে page live আছে কিনা যাচাই করুন (✅ Verified দেখাবে)। ভুল থাকলে ✏️ Edit বা 🗑 Delete করুন।</li>
              <li>সব ঠিক থাকলে <b>“আমার সব draft Activate”</b> চাপুন — user-দের কাছে task publish হয়ে যাবে।</li>
              <li>নীল <b>Admin</b> ট্যাগ যেসব task-এ আছে সেগুলো Admin তৈরি করেছেন — আপনি শুধু দেখতে পারবেন, edit/delete পারবেন না।</li>
            </ol>
          </div>
        </div>
      </AdminCard>


      <AdminCard accent="fuchsia" className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">কতটি task</label>
            <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="w-20 rounded-lg border border-fuchsia-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-fuchsia-400" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">মোট Amount ৳</label>
            <input type="number" min={0} step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="w-28 rounded-lg border border-fuchsia-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-fuchsia-400" />
          </div>
          <div className="rounded-lg bg-fuchsia-50 px-2.5 py-1.5 ring-1 ring-fuchsia-200">
            <div className="text-[10px] font-bold uppercase text-fuchsia-600">প্রতি task</div>
            <div className="bn-display text-sm text-fuchsia-800">৳{perTaskReward}</div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Action types</label>
            <div className="flex flex-wrap gap-1">
              {DIST_ACTIONS.map((a) => {
                const on = selectedActions.includes(a);
                return (
                  <button key={a} type="button"
                    onClick={() => setSelectedActions((s) => on ? s.filter((x) => x !== a) : [...s, a])}
                    className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 capitalize",
                      on ? "bg-fuchsia-600 text-white ring-fuchsia-600" : "bg-white text-slate-600 ring-slate-200")}>
                    {a}
                  </button>
                );
              })}
              {ADMIN_ONLY_ACTIONS.map((a) => (
                <span key={a} title="শুধু Admin এই action তৈরি করতে পারবেন"
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed capitalize">
                  <Lock className="h-3 w-3" /> {a}
                </span>
              ))}
            </div>
          </div>
          <GradientButton accent="fuchsia" busy={genBusy} onClick={runGenerate}>
            {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI দিয়ে Random FB Link তৈরি
          </GradientButton>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Verified 1M+ follower Facebook page থেকে random link — draft হিসাবে যোগ হবে। মোট Amount দিলে সেটি সমান ভাগে ভাগ হবে। Link check করে Activate করুন।
        </p>
      </AdminCard>

      <div className="flex flex-wrap gap-2">
        <GradientButton accent="emerald" busy={batchBusy} onClick={activateBatch}>
          <CheckCircle2 className="h-4 w-4" /> আমার সব draft Activate ({draftCount})
        </GradientButton>
        {draftCount > 0 && (
          <SoftButton className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={deleteAllDrafts}>
            <Trash2 className="h-4 w-4" /> সব draft মুছুন
          </SoftButton>
        )}
      </div>

      {!tasks ? <Shimmer className="h-32" /> : tasks.length === 0 ? (
        <EmptyState Icon={Sparkles} accent="fuchsia" title={`${date} তারিখে কোনো task নেই`}
          action={<GradientButton accent="fuchsia" onClick={runGenerate} busy={genBusy}><Sparkles className="h-4 w-4" /> এখনই তৈরি</GradientButton>} />
      ) : (
        <div className="grid gap-2">
          {tasks.map((t) => {
            const seen = visited.has(t.id);
            const mine = t.created_by_distributor === me;
            return (
              <AdminCard key={t.id} accent={t.is_draft ? "amber" : mine ? "fuchsia" : "sky"} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white",
                    t.is_draft ? "bg-amber-500" : t.active ? "bg-emerald-600" : "bg-slate-500")}>
                    {t.is_draft ? "DRAFT" : t.active ? "ACTIVE" : "OFF"}
                  </span>
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] uppercase text-sky-700">{t.action_type}</span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase font-bold",
                    mine ? "bg-fuchsia-100 text-fuchsia-700" : "bg-indigo-100 text-indigo-700")}>
                    {mine ? "আমার" : "Admin"}
                  </span>
                  {seen && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </span>
                  )}
                  <span className="bn-display text-sm text-slate-900 flex-1 truncate">{t.title}</span>
                  <span className="bn-display text-sm bg-gradient-to-br from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">৳{t.reward}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <a href={t.link_url} target="_blank" rel="noreferrer"
                    onClick={() => setVisited((s) => { const n = new Set(s); n.add(t.id); return n; })}
                    className={cn("inline-flex items-center gap-1 text-xs truncate hover:underline",
                      seen ? "text-emerald-700 font-semibold" : "text-sky-600")}>
                    {seen ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ExternalLink className="h-3 w-3" />}
                    {t.link_url}
                  </a>
                  {mine && (
                    <div className="ml-auto flex gap-1">
                      <SoftButton onClick={() => setEdit({ ...t })}><Pencil className="h-3.5 w-3.5" /></SoftButton>
                      <SoftButton onClick={() => toggleOne(t)}>
                        {t.is_draft ? <><CheckCircle2 className="h-3.5 w-3.5" /> Activate</> : t.active ? "Off" : "On"}
                      </SoftButton>
                      <SoftButton className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={() => deleteOne(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </SoftButton>
                    </div>
                  )}
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="bn-display text-lg">Task Edit</h3>
              <button onClick={() => setEdit(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-3">
              <F label="টাইটেল" value={edit.title} onChange={(v) => setEdit({ ...edit, title: v })} />
              <F label="URL" value={edit.link_url} onChange={(v) => setEdit({ ...edit, link_url: v })} />
              <div className="grid grid-cols-2 gap-2">
                <F label="রিওয়ার্ড ৳" type="number" value={String(edit.reward)} onChange={(v) => setEdit({ ...edit, reward: Number(v) })} />
                <F label="Action" value={edit.action_type} onChange={(v) => setEdit({ ...edit, action_type: v })} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setEdit(null)}>বাতিল</SoftButton>
              <GradientButton accent="fuchsia" className="flex-1" onClick={saveEdit}><Save className="h-4 w-4" /> সেভ</GradientButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-400" />
    </label>
  );
}
