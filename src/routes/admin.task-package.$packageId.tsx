import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Loader2, Plus, Trash2, ExternalLink,
  CheckCircle2, Circle, Pencil, Save, X, Calendar as CalendarIcon, RefreshCw,
} from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, StatTile, Shimmer, EmptyState } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateFbLinkTasks, type GeneratedTask } from "@/lib/admin-tasks.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/task-package/$packageId")({
  head: () => ({ meta: [{ title: "প্যাকেজ টাস্ক ম্যানেজ — Admin" }] }),
  component: PackageTasksPage,
});

type Pkg = {
  id: string; name: string; price: number;
  daily_tasks: number | null; daily_income: number | null;
  duration_days: number | null; active: boolean;
};
type Task = {
  id: string; title: string; link_url: string; reward: number;
  action_type: string; category: string | null; daily_limit: number;
  active: boolean; is_draft: boolean; scheduled_date: string | null;
  description: string | null; required_package_id: string | null;
};

const ACTIONS: GeneratedTask["action_type"][] = ["like", "follow", "share", "comment"];

function todayBD(): string {
  // Asia/Dhaka date as YYYY-MM-DD
  const now = new Date();
  const bdMs = now.getTime() + (6 * 60 * 60 * 1000) + now.getTimezoneOffset() * 60 * 1000;
  return new Date(bdMs).toISOString().slice(0, 10);
}

function PackageTasksPage() {
  const { packageId } = useParams({ from: "/admin/task-package/$packageId" });
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [date, setDate] = useState<string>(todayBD());
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [count, setCount] = useState(10);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [selectedActions, setSelectedActions] = useState<GeneratedTask["action_type"][]>(["like", "follow", "share"]);
  const [edit, setEdit] = useState<Task | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const genFn = useServerFn(generateFbLinkTasks);

  const load = async () => {
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("packages").select("id,name,price,daily_tasks,daily_income,duration_days,active").eq("id", packageId).maybeSingle(),
      supabase.from("link_tasks").select("*").eq("required_package_id", packageId).eq("scheduled_date", date).order("created_at", { ascending: false }),
    ]);
    setPkg(p as Pkg | null);
    setTasks((t ?? []) as Task[]);
    if (p && !totalAmount) setTotalAmount(Number((p as Pkg).daily_income ?? 0));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [packageId, date]);

  const daily = pkg?.daily_tasks ?? 0;
  const perTaskReward = useMemo(() => {
    const n = Math.max(1, Math.min(50, count));
    if (totalAmount > 0) return Math.round((totalAmount / n) * 100) / 100;
    if (!pkg || !daily) return 0;
    return Math.round(((pkg.daily_income ?? 0) / daily) * 100) / 100;
  }, [pkg, daily, totalAmount, count]);

  const draftCount = tasks?.filter((t) => t.is_draft).length ?? 0;
  const activeCount = tasks?.filter((t) => !t.is_draft && t.active).length ?? 0;

  const runGenerate = async () => {
    if (!pkg) return;
    const n = Math.max(1, Math.min(50, count));
    setGenBusy(true);
    const tId = toast.loading(`AI ${n}টি Facebook link তৈরি করছে…`);
    try {
      const res = await genFn({ data: { count: n, actions: selectedActions.length ? selectedActions : ["like"] } });
      const rows = res.tasks.map((g) => ({
        title: g.title,
        link_url: g.url,
        reward: perTaskReward || 5,
        action_type: g.action_type,
        category: "facebook",
        daily_limit: 1,
        active: false, // stays inactive until admin activates the batch
        is_draft: true,
        scheduled_date: date,
        required_package_id: packageId,
        description: null,
      }));
      const { error } = await supabase.from("link_tasks").insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`${rows.length}টি draft task যোগ হয়েছে (${res.source})`, { id: tId });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id: tId });
    } finally { setGenBusy(false); }
  };

  const activateBatch = async () => {
    if (!tasks?.length) return;
    setBatchBusy(true);
    try {
      const ids = tasks.filter((t) => t.is_draft).map((t) => t.id);
      if (!ids.length) { toast.info("কোনো draft নেই"); return; }
      const { error } = await supabase.from("link_tasks")
        .update({ is_draft: false, active: true })
        .in("id", ids);
      if (error) throw new Error(error.message);
      toast.success(`${ids.length}টি task active হলো — ${date} তারিখে চালু`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBatchBusy(false); }
  };

  const deactivateBatch = async () => {
    if (!tasks?.length) return;
    setBatchBusy(true);
    try {
      const ids = tasks.filter((t) => !t.is_draft).map((t) => t.id);
      if (!ids.length) return;
      const { error } = await supabase.from("link_tasks").update({ active: false, is_draft: true }).in("id", ids);
      if (error) throw new Error(error.message);
      toast.success("Batch inactive হলো");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBatchBusy(false); }
  };

  const deleteOne = async (id: string) => {
    if (!confirm("এই task ডিলিট করবেন?")) return;
    const { error } = await supabase.from("link_tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট"); load();
  };
  const toggleOne = async (t: Task) => {
    const patch = t.is_draft ? { is_draft: false, active: true } : { active: !t.active };
    const { error } = await supabase.from("link_tasks").update(patch).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    load();
  };
  const saveEdit = async () => {
    if (!edit) return;
    const { error } = await supabase.from("link_tasks")
      .update({ title: edit.title, link_url: edit.link_url, reward: edit.reward, action_type: edit.action_type })
      .eq("id", edit.id);
    if (error) { toast.error(error.message); return; }
    toast.success("সেভ"); setEdit(null); load();
  };

  const deleteAllDrafts = async () => {
    if (!confirm(`${date} তারিখের সব draft task মুছবেন?`)) return;
    const { error } = await supabase.from("link_tasks").delete()
      .eq("required_package_id", packageId).eq("scheduled_date", date).eq("is_draft", true);
    if (error) { toast.error(error.message); return; }
    toast.success("Draft clear হয়েছে"); load();
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Link to="/admin/tasks" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
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
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-xs outline-none" />
            </div>
            <SoftButton onClick={load}><RefreshCw className="h-3.5 w-3.5" /></SoftButton>
          </div>
        } />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="দৈনিক লিমিট" value={daily} accent="indigo" Icon={Sparkles} />
        <StatTile label="Draft" value={draftCount} accent="amber" Icon={Circle} />
        <StatTile label="Active" value={activeCount} accent="emerald" Icon={CheckCircle2} />
        <StatTile label="প্রতি Task ৳" value={perTaskReward} accent="rose" Icon={Sparkles} />
      </div>

      {/* Generator panel */}
      <AdminCard accent="fuchsia" className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">কতটি task</label>
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="w-20 rounded-lg border border-fuchsia-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-fuchsia-400" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">মোট Amount ৳</label>
            <input type="number" min={0} step="0.01" value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="w-28 rounded-lg border border-fuchsia-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-fuchsia-400" />
          </div>
          <div className="rounded-lg bg-fuchsia-50 px-2.5 py-1.5 ring-1 ring-fuchsia-200">
            <div className="text-[10px] font-bold uppercase text-fuchsia-600">প্রতি task</div>
            <div className="bn-display text-sm text-fuchsia-800">৳{perTaskReward}</div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Action types</label>
            <div className="flex flex-wrap gap-1">
              {ACTIONS.map((a) => {
                const on = selectedActions.includes(a);
                return (
                  <button key={a} type="button"
                    onClick={() => setSelectedActions((s) => on ? s.filter((x) => x !== a) : [...s, a])}
                    className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
                      on ? "bg-fuchsia-600 text-white ring-fuchsia-600" : "bg-white text-slate-600 ring-slate-200")}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <GradientButton accent="fuchsia" busy={genBusy} onClick={runGenerate}>
            {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI দিয়ে Random FB Link তৈরি
          </GradientButton>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          শুধু <b>verified (blue-tick) + 1M+ follower</b> Facebook page থেকে AI random link তৈরি করে <b>Draft</b> হিসাবে যোগ করবে।
          মোট Amount দিলে সেটি সমান ভাগে প্রতি task-এ ভাগ হয়ে যাবে। লিংক click করে verify করুন → সবুজ tick দেখাবে → Activate।
        </p>
      </AdminCard>

      {/* Batch actions */}
      <div className="flex flex-wrap gap-2">
        <GradientButton accent="emerald" busy={batchBusy} onClick={activateBatch}>
          <CheckCircle2 className="h-4 w-4" /> সব draft Activate ({draftCount})
        </GradientButton>
        <SoftButton onClick={deactivateBatch}><Circle className="h-4 w-4" /> সব inactive</SoftButton>
        {draftCount > 0 && (
          <SoftButton className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={deleteAllDrafts}>
            <Trash2 className="h-4 w-4" /> সব draft মুছুন
          </SoftButton>
        )}
      </div>

      {/* Task list */}
      {!tasks ? <Shimmer className="h-32" /> : tasks.length === 0 ? (
        <EmptyState Icon={Sparkles} accent="fuchsia" title={`${date} তারিখে কোনো task নেই`}
          action={<GradientButton accent="fuchsia" onClick={runGenerate} busy={genBusy}><Sparkles className="h-4 w-4" /> এখনই তৈরি</GradientButton>} />
      ) : (
        <div className="grid gap-2">
          {tasks.map((t) => {
            const seen = visited.has(t.id);
            return (
            <AdminCard key={t.id} accent={t.is_draft ? "amber" : "emerald"} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white",
                  t.is_draft ? "bg-amber-500" : t.active ? "bg-emerald-600" : "bg-slate-500")}>
                  {t.is_draft ? "DRAFT" : t.active ? "ACTIVE" : "OFF"}
                </span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] uppercase text-sky-700">{t.action_type}</span>
                {seen && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 animate-admin-pop">
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
                <div className="ml-auto flex gap-1">
                  <SoftButton onClick={() => setEdit({ ...t })}><Pencil className="h-3.5 w-3.5" /></SoftButton>
                  <SoftButton onClick={() => toggleOne(t)}>
                    {t.is_draft ? <><CheckCircle2 className="h-3.5 w-3.5" /> Activate</> : t.active ? "Off" : "On"}
                  </SoftButton>
                  <SoftButton className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={() => deleteOne(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </SoftButton>
                </div>
              </div>
            </AdminCard>
            );
          })}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
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
              <a href={edit.link_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> Preview link
              </a>
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
