import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, ConfirmDeleteModal, StatTile, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { saveTask, deleteTask, subscribeTable } from "@/lib/admin-client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({ meta: [{ title: "টাস্ক লিংক — Admin" }] }),
  component: TasksPage,
});

type Task = {
  id: string; title: string; url: string; reward: number; category: string | null;
  daily_limit: number; active: boolean; description: string | null;
};
const EMPTY: Task = { id: "", title: "", url: "", reward: 5, category: "facebook", daily_limit: 1, active: true, description: null };

function TasksPage() {
  const [rows, setRows] = useState<Task[] | null>(null);
  const [stats, setStats] = useState<{ done: number; paid: number } | null>(null);
  const [edit, setEdit] = useState<Task | null>(null);
  const [del, setDel] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("link_tasks").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Task[]);
    const today = new Date(); today.setHours(0,0,0,0);
    const { data: subs } = await supabase.from("task_submissions").select("status, link_tasks(reward)")
      .eq("status", "approved").gte("created_at", today.toISOString());
    const done = subs?.length ?? 0;
    const paid = (subs ?? []).reduce((s: number, r: { link_tasks: { reward: number } | null }) => s + Number(r.link_tasks?.reward ?? 0), 0);
    setStats({ done, paid });
  };
  useAdminAutoRefresh(refresh);

  const totals = useMemo(() => ({
    total: rows?.length ?? 0,
    active: rows?.filter((r) => r.active).length ?? 0,
  }), [rows]);

  const handleSave = async () => {
    if (!edit) return;
    if (!edit.title || !edit.url) { toast.error("টাইটেল ও URL দরকার"); return; }
    setBusy(true);
    try {
      await saveTask(edit.id || null, {
        title: edit.title, url: edit.url, reward: edit.reward, category: edit.category,
        daily_limit: edit.daily_limit, active: edit.active, description: edit.description,
      });
      toast.success("সেভ হয়েছে"); setEdit(null); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };
  const handleDel = async () => {
    if (!del) return;
    setBusy(true);
    try { await deleteTask(del.id); toast.success("ডিলিট"); setDel(null); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };
  const toggle = async (t: Task) => {
    try { await saveTask(t.id, { active: !t.active }); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
  };

  return (
    <>
      <AdminPageHeader accent="rose" Icon={Link2} title="টাস্ক লিংক ম্যানেজমেন্ট"
        subtitle="লাইক ও কমেন্ট টাস্ক পরিচালনা"
        action={<GradientButton accent="rose" onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> নতুন টাস্ক</GradientButton>} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="মোট টাস্ক" value={totals.total} accent="rose" Icon={Link2} />
        <StatTile label="অ্যাক্টিভ" value={totals.active} accent="emerald" Icon={Link2} />
        <StatTile label="আজকের কাজ" value={stats?.done ?? "—"} accent="amber" Icon={Link2} />
        <StatTile label="আজ পেমেন্ট ৳" value={stats?.paid ?? "—"} accent="fuchsia" Icon={Link2} />
      </div>

      {!rows ? <Shimmer className="h-32" /> : rows.length === 0 ? (
        <EmptyState Icon={Link2} title="কোনো টাস্ক নেই" accent="rose"
          action={<GradientButton accent="rose" onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> তৈরি করুন</GradientButton>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => (
            <AdminCard key={t.id} accent="rose" interactive className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="bn-display text-base text-slate-900 line-clamp-2">{t.title}</p>
                <button onClick={() => toggle(t)} className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white",
                  t.active ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-400 to-slate-600",
                )}>{t.active ? "ON" : "OFF"}</button>
              </div>
              <a href={t.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-sky-600 hover:underline">{t.url}</a>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="bn-display text-xl bg-gradient-to-br from-rose-600 to-red-600 bg-clip-text text-transparent">৳{t.reward}</span>
                <span className="text-[11px] text-slate-500">• লিমিট {t.daily_limit}/দিন</span>
                {t.category && <span className="text-[10px] uppercase rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{t.category}</span>}
              </div>
              <div className="mt-3 flex gap-1 justify-end">
                <SoftButton onClick={() => setEdit({ ...t })}><Pencil className="h-3.5 w-3.5" /></SoftButton>
                <SoftButton accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={() => setDel(t)}><Trash2 className="h-3.5 w-3.5" /></SoftButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
            <div className="flex items-center justify-between">
              <h3 className="bn-display text-lg">{edit.id ? "এডিট" : "নতুন টাস্ক"}</h3>
              <button onClick={() => setEdit(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-3">
              <F label="টাইটেল" value={edit.title} onChange={(v) => setEdit({ ...edit, title: v })} />
              <F label="URL" value={edit.url} onChange={(v) => setEdit({ ...edit, url: v })} />
              <div className="grid grid-cols-2 gap-2">
                <F label="রিওয়ার্ড ৳" type="number" value={String(edit.reward)} onChange={(v) => setEdit({ ...edit, reward: Number(v) })} />
                <F label="দৈনিক লিমিট" type="number" value={String(edit.daily_limit)} onChange={(v) => setEdit({ ...edit, daily_limit: Number(v) })} />
              </div>
              <F label="ক্যাটাগরি" value={edit.category ?? ""} onChange={(v) => setEdit({ ...edit, category: v })} />
              <F label="বিবরণ" value={edit.description ?? ""} onChange={(v) => setEdit({ ...edit, description: v })} />
            </div>
            <div className="mt-4 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setEdit(null)}>বাতিল</SoftButton>
              <GradientButton accent="rose" className="flex-1" busy={busy} onClick={handleSave}><Save className="h-4 w-4" /> সেভ</GradientButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal open={!!del} onClose={() => setDel(null)} busy={busy} onConfirm={handleDel}
        title="টাস্ক ডিলিট?" body={<>{del?.title} মুছে যাবে</>} />
    </>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400" />
    </label>
  );
}
